"""受信Queueを処理する単一Worker。検証から結果publishまでを直列に接続する。"""

import logging
from queue import Empty
from threading import Event, Lock, Thread
from time import monotonic

from app.application.sensor_input import SensorInputService
from app.core.config import Settings
from app.domain.sensor import InvalidSensorBatch, SensorBatch
from app.integrations.device import DeviceApiClient, DeviceManager
from app.integrations.mqtt_client import MqttConnection, MqttSensorInput
from app.processing.buffer import BufferCapacityError, BufferManager
from app.processing.inference import InferenceEngine
from app.processing.result import ResultDeliveryError, ResultPublisher

logger = logging.getLogger(__name__)

# Queue待機（0.2秒）から復帰して終了するための予算を、合計5秒の内側に残す。
WORKER_SHUTDOWN_RESERVE_SECONDS = 0.5


class InputPipeline:
    def __init__(self, settings: Settings, inference: InferenceEngine) -> None:
        self.settings = settings
        self.inference = inference
        self.stop_requested = Event()
        self.accepted_batches = 0
        self.accepted_samples = 0
        self.rejected_batches = 0
        self.inference_success = 0
        self.inference_errors = 0
        self.publish_failures = 0
        self.progress_lock = Lock()
        self.last_progress_at = monotonic()
        self.last_error: str | None = None
        self.worker_error: str | None = None
        self.worker_stop_reason: str | None = None
        self._fatal = False
        self._fatal_reason: str | None = None

        self.buffer_manager = BufferManager(
            step=settings.window_step,
            offline_after_seconds=settings.offline_timeout_seconds,
        )
        self.device_manager = (
            DeviceManager(DeviceApiClient(settings), self._reset_device)
            if settings.device_api_url
            else None
        )
        self.device_api_state = (
            self.device_manager.snapshot()
            if self.device_manager
            else {"configured": False}
        )
        self.device_states: dict[str, str] = {}

        self.receiver = MqttSensorInput(
            SensorInputService(consume=self._accept_batch), Settings.QUEUE_CAPACITY
        )
        self.connection = MqttConnection(
            settings, self.receiver, on_publish_ack=self._on_publish_ack
        )
        self.result_publisher = ResultPublisher(
            self.connection.publish,
            topic_template=settings.result_topic_template,
            qos=settings.result_qos,
            capacity=Settings.PUBLISH_QUEUE_CAPACITY,
            inflight=Settings.PUBLISH_INFLIGHT,
            ack_timeout_seconds=Settings.ACK_TIMEOUT_SECONDS,
        )
        self.worker = Thread(target=self._run, name="sensor-input", daemon=True)
        if self.device_manager is None:
            logger.warning(
                "DEVICE_API_DISABLED",
                extra={
                    "event": "DEVICE_API_DISABLED",
                    "error_code": "DEVICE_API_DISABLED",
                },
            )

    def start(self) -> None:
        # 先にWorkerを起動して、購読直後の受信を処理できるようにする。
        self.worker.start()
        self.connection.start()

    def stop(self) -> None:
        # 受付停止→Worker停止→送達待機→接続closeの順で終える。
        self.stop_requested.set()
        deadline = monotonic() + Settings.SHUTDOWN_TIMEOUT_SECONDS
        try:
            if self.worker.ident is not None:
                self.worker.join(timeout=max(0.0, deadline - monotonic()))
            delivery_snapshot = self.result_publisher.close(
                timeout=max(0.0, deadline - monotonic())
            )
            if delivery_snapshot.get("pending", 0):
                logger.warning(
                    "RESULT_DELIVERY_INCOMPLETE",
                    extra={
                        "event": "RESULT_DELIVERY_INCOMPLETE",
                        "error_code": "DELIVERY_UNKNOWN",
                        "structured": {"pending": delivery_snapshot.get("pending", 0)},
                    },
                )
        finally:
            try:
                self.connection.stop(
                    timeout=max(
                        0.0, deadline - monotonic() - WORKER_SHUTDOWN_RESERVE_SECONDS
                    )
                )
            finally:
                with self.connection.state_lock:
                    self._discard_queue(reason="shutdown")
        if self.worker.is_alive():
            raise RuntimeError("sensor input worker did not stop")

    def snapshot(self) -> dict:
        with self.connection.state_lock:
            receive_rejections = self.receiver.rejection_counts()
            queue_discards = self.receiver.queue_discard_counts()
            with self.progress_lock:
                last_progress_at = self.last_progress_at
                last_error = self.last_error
                worker_error = self.worker_error
                worker_stop_reason = self.worker_stop_reason
            return {
                "connected": self.connection.connected,
                "subscribed": self.connection.subscribed,
                "worker_alive": self.worker.is_alive() and not self._fatal,
                "accepted_batches": self.accepted_batches,
                "accepted_samples": self.accepted_samples,
                "rejected_batches": self.rejected_batches
                + sum(receive_rejections.values()),
                "receive_rejections": receive_rejections,
                "discarded_batches": sum(queue_discards.values()),
                "queue_discards": queue_discards,
                "queue_size": self.receiver.queue.qsize(),
                "inference_success": self.inference_success,
                "inference_errors": self.inference_errors,
                "publish_failures": self.publish_failures,
                "last_progress_age_seconds": max(0.0, monotonic() - last_progress_at),
                "last_error": last_error,
                "worker_error": worker_error,
                "worker_stop_reason": worker_stop_reason,
                "fatal": self._fatal,
                "fatal_reason": self._fatal_reason,
                "device_api": self.device_api_state.copy(),
                "result_delivery": self.result_publisher.snapshot(),
            }

    def _on_publish_ack(self, mid: int) -> None:
        self.result_publisher.on_publish_ack(mid)

    def _mark_progress(self) -> None:
        with self.progress_lock:
            self.last_progress_at = monotonic()

    def _record_error(self, reason: str) -> None:
        with self.progress_lock:
            self.last_error = reason

    def _reset_device(self, code: str | None, reason: str) -> None:
        if code is None:
            reset_count = self.buffer_manager.reset_all(reason=reason)
            self.device_states.clear()
        else:
            reset_count = int(self.buffer_manager.reset(code, reason=reason))
            self.device_states.pop(code, None)
        logger.info(
            "DEVICE_CONTINUITY_RESET",
            extra={
                "event": "DEVICE_CONTINUITY_RESET",
                "reason": reason,
                "structured": {
                    "scope": "all" if code is None else "device",
                    "buffers": reset_count,
                },
            },
        )

    def _update_device_snapshot(self) -> None:
        if self.device_manager is not None:
            with self.connection.state_lock:
                self.device_api_state = self.device_manager.snapshot()

    def _discard_queue(self, *, reason: str) -> int:
        return self.receiver.discard_pending(reason=reason)

    def _accept_batch(self, batch: SensorBatch) -> None:
        with self.connection.state_lock:
            self._ensure_current_batch(batch)

        if self.device_manager is not None:
            state = self.device_manager.resolve(batch.device_code)
            self._update_device_snapshot()
            self._record_device_state(batch.device_code, state)
            if state != "ACTIVE":
                raise InvalidSensorBatch(f"device_{state.lower()}")

        with self.connection.state_lock:
            self._ensure_current_batch(batch)
        windows = []
        try:
            for sample in batch.samples:
                window = self.buffer_manager.append(
                    sample,
                    generation=batch.generation,
                    now_monotonic=monotonic(),
                )
                if window is not None:
                    windows.append(window)
        except BufferCapacityError as error:
            raise InvalidSensorBatch(str(error)) from None

        with self.connection.state_lock:
            self._ensure_current_batch(batch)
            self.accepted_batches += 1
            self.accepted_samples += len(batch.samples)
        self._mark_progress()
        logger.info(
            "SENSOR_BATCH_ACCEPTED",
            extra={
                "event": "SENSOR_BATCH_ACCEPTED",
                "structured": {"samples": len(batch.samples)},
            },
        )

        for window in windows:
            self._handle_window(window)

    def _record_device_state(self, code: str, state: str) -> None:
        previous = self.device_states.get(code)
        self.device_states[code] = state
        if previous == state:
            return
        level = logging.INFO if state == "ACTIVE" else logging.WARNING
        logger.log(
            level,
            "DEVICE_STATE_CHANGED",
            extra={
                "event": "DEVICE_STATE_CHANGED",
                "device_code": code,
                "error_code": f"DEVICE_{state}",
            },
        )

    def _handle_window(self, window) -> None:
        try:
            self._ensure_window_sendable(window)
            prediction = self.inference.predict(window.values)
            self.inference_success += 1
            self._mark_progress()
            logger.info(
                "INFERENCE_SUCCESS",
                extra={
                    "event": "INFERENCE_SUCCESS",
                    "device_code": window.device_code,
                    "model_version": prediction.model_version,
                    "window_end": window.ended_at.astimezone().isoformat(),
                },
            )
        except InvalidSensorBatch as error:
            self._record_error(str(error))
            logger.info(
                "WINDOW_DROPPED",
                extra={
                    "event": "WINDOW_DROPPED",
                    "device_code": window.device_code,
                    "error_code": str(error),
                },
            )
            return
        except Exception as error:
            self.inference_errors += 1
            self._record_error(type(error).__name__)
            logger.exception(
                "INFERENCE_ERROR",
                extra={
                    "event": "INFERENCE_ERROR",
                    "device_code": window.device_code,
                    "error_code": type(error).__name__,
                },
            )
            self._check_inference_failure_limit()
            return

        try:
            self._ensure_window_sendable(window)
            message = self.result_publisher.build_message(window, prediction)
            state = self.result_publisher.publish(message)
            self._mark_progress()
            logger.info(
                "RESULT_PUBLISHED",
                extra={
                    "event": "RESULT_PUBLISHED",
                    "device_code": message.device_code,
                    "event_id": message.event_id,
                    "model_version": message.model_version,
                    "state": state,
                },
            )
        except (ResultDeliveryError, InvalidSensorBatch) as error:
            self.publish_failures += 1
            self._record_error(type(error).__name__)
            logger.warning(
                "PUBLISH_ERROR",
                extra={
                    "event": "PUBLISH_ERROR",
                    "device_code": window.device_code,
                    "error_code": type(error).__name__,
                },
            )
        except Exception:
            self.publish_failures += 1
            self._record_error("publish_exception")
            logger.exception(
                "PUBLISH_ERROR",
                extra={
                    "event": "PUBLISH_ERROR",
                    "device_code": window.device_code,
                    "error_code": "PUBLISH_EXCEPTION",
                },
            )

    def _ensure_current_batch(self, batch: SensorBatch) -> None:
        """呼出元がstate_lockを持つ。HTTP待機前後の受付条件を共通化する。"""
        if (
            self.stop_requested.is_set()
            or not self.connection.subscribed
            or batch.generation != self.connection.generation
            or self.receiver.discontinuity.is_set()
        ):
            raise InvalidSensorBatch("interrupted_batch")

    def _ensure_window_sendable(self, window) -> None:
        with self.connection.state_lock:
            self._ensure_current_window(window)
        if self.device_manager is not None:
            state = self.device_manager.resolve(window.device_code)
            self._update_device_snapshot()
            self._record_device_state(window.device_code, state)
            if state != "ACTIVE":
                self.buffer_manager.reset(
                    window.device_code, reason="device_not_active"
                )
                raise InvalidSensorBatch(f"device_{state.lower()}")
        offline_after = self.settings.offline_timeout_seconds
        if offline_after is not None:
            buffer_state = self.buffer_manager._buffers.get(window.device_code)
            last_seen = buffer_state.last_seen_monotonic if buffer_state else None
            if last_seen is not None and monotonic() - last_seen >= offline_after:
                self.buffer_manager.reset(window.device_code, reason="offline_timeout")
                raise InvalidSensorBatch("device_offline")
        with self.connection.state_lock:
            self._ensure_current_window(window)

    def _ensure_current_window(self, window) -> None:
        if (
            self.stop_requested.is_set()
            or not self.connection.subscribed
            or window.generation != self.connection.generation
            or self.receiver.discontinuity.is_set()
        ):
            raise InvalidSensorBatch("stale_window")

    def _check_inference_failure_limit(self) -> None:
        if self.inference_errors < Settings.INFERENCE_FAILURE_LIMIT:
            return
        self._fatal = True
        self._fatal_reason = "inference_failure_limit"
        self.stop_requested.set()
        logger.error(
            "WORKER_FATAL",
            extra={"event": "WORKER_FATAL", "error_code": "INFERENCE_FAILURE_LIMIT"},
        )

    def monitor(self) -> dict:
        snapshot = self.snapshot()
        snapshot["progress_stalled"] = (
            snapshot["last_progress_age_seconds"] > Settings.PROGRESS_TIMEOUT_SECONDS
        )
        snapshot["ready"] = self.is_ready()
        return snapshot

    def is_ready(self) -> bool:
        snap = self.snapshot()
        if self._fatal or self.stop_requested.is_set() or not snap["worker_alive"]:
            return False
        if not snap["connected"] or not snap["subscribed"]:
            return False
        if snap["last_progress_age_seconds"] > Settings.PROGRESS_TIMEOUT_SECONDS:
            return False
        device_api = snap["device_api"]
        if device_api.get("configured") and device_api.get("authentication_stopped"):
            return False
        return True

    def degraded_reasons(self) -> list[str]:
        snap = self.snapshot()
        reasons = []
        device_api = snap["device_api"]
        if device_api.get("configured") and device_api.get("degraded"):
            reasons.append("device_api_degraded")
        if device_api.get("configured") and device_api.get("authentication_stopped"):
            reasons.append("device_api_authentication_stopped")
        if not snap["connected"] or not snap["subscribed"]:
            reasons.append("mqtt_not_ready")
        if snap["last_progress_age_seconds"] > Settings.PROGRESS_TIMEOUT_SECONDS:
            reasons.append("worker_progress_stalled")
        if snap["fatal"]:
            reasons.append(snap["fatal_reason"] or "worker_fatal")
        return reasons

    def _run(self) -> None:
        try:
            self._mark_progress()
            while not self.stop_requested.is_set():
                if self.device_manager is not None:
                    self.device_manager.expire()
                    self._update_device_snapshot()
                expired = self.buffer_manager.expire(now_monotonic=monotonic())
                if expired:
                    logger.info(
                        "DEVICE_OFFLINE",
                        extra={
                            "event": "DEVICE_OFFLINE",
                            "error_code": "DEVICE_OFFLINE",
                            "structured": {"count": len(expired)},
                        },
                    )
                self.result_publisher.tick()
                with self.connection.state_lock:
                    if self.receiver.discontinuity.is_set():
                        self._discard_queue(reason="continuity_reset")
                        self.receiver.discontinuity.clear()
                        self._reset_device(None, "continuity_reset")
                        logger.info(
                            "SENSOR_CONTINUITY_RESET",
                            extra={"event": "SENSOR_CONTINUITY_RESET"},
                        )
                self._mark_progress()
                try:
                    envelope = self.receiver.queue.get(timeout=0.2)
                except Empty:
                    continue
                try:
                    with self.connection.state_lock:
                        generation = self.connection.generation
                    self.receiver.process(envelope, generation=generation)
                except InvalidSensorBatch as error:
                    with self.connection.state_lock:
                        self.rejected_batches += 1
                    self._record_error(str(error))
                    logger.warning(
                        "SENSOR_BATCH_REJECTED",
                        extra={
                            "event": "SENSOR_BATCH_REJECTED",
                            "error_code": str(error),
                            "aggregate_key": f"reject:{error}",
                        },
                    )
                except Exception as error:
                    self._record_error(type(error).__name__)
                    logger.exception(
                        "PIPELINE_ERROR",
                        extra={
                            "event": "PIPELINE_ERROR",
                            "error_code": type(error).__name__,
                        },
                    )
                finally:
                    self.receiver.queue.task_done()
                    self._mark_progress()
        except Exception:
            self._fatal = True
            self._fatal_reason = "worker_exception"
            with self.progress_lock:
                self.worker_error = "worker_exception"
                self.worker_stop_reason = "worker_exception"
            logger.exception(
                "SENSOR_WORKER_FAILED",
                extra={
                    "event": "SENSOR_WORKER_FAILED",
                    "error_code": "WORKER_EXCEPTION",
                },
            )
        finally:
            self.stop_requested.set()
            if self.device_manager is not None:
                self.device_manager.close()
