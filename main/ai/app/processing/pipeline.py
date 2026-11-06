"""受信・Device確認・Window・推論・結果送信を直列実行する単一Worker。"""

import json
import logging
import re
from datetime import UTC, datetime
from queue import Empty
from threading import Event, Thread
from time import monotonic, sleep

from app.application.sensor_input import SensorInputService
from app.core.config import Settings
from app.domain.sensor import InvalidSensorBatch, SensorBatch
from app.integrations.device import DeviceApiClient, DeviceManager
from app.integrations.mqtt_client import MqttConnection, MqttSensorInput
from app.processing.buffer import BufferManager
from app.processing.inference import InferenceEngine
from app.processing.result import ResultPublisher, make_result

logger = logging.getLogger(__name__)

# Worker/ACK待機が通信スレッド終了の予算を使い切らないようにする。
NETWORK_SHUTDOWN_RESERVE_SECONDS = 0.5


class InputPipeline:
    def __init__(self, settings: Settings, inference: InferenceEngine) -> None:
        self.inference = inference
        self.buffers = BufferManager(settings.window_step)
        self.buffer_generation: int | None = None
        self.inferred_windows = 0
        self.inference_errors = 0
        self.consecutive_errors = 0
        self.suppressed_results = 0
        self.last_result: dict[str, str] | None = None
        self.stop_requested = Event()
        self.accepted_batches = 0
        self.accepted_samples = 0
        self.rejected_batches = 0
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
        if self.device_manager is None:
            logger.warning("DEVICE_API_DISABLED mode=local_inference_unverified")
        self.receiver = MqttSensorInput(
            SensorInputService(consume=self._accept_batch), Settings.QUEUE_CAPACITY
        )
        self.connection = MqttConnection(settings, self.receiver)
        self.publisher = ResultPublisher(self.connection.client)
        self.worker = Thread(target=self._run, name="sensor-input", daemon=True)

    def start(self) -> None:
        # 先にWorkerを起動して、購読直後の受信を処理できるようにする。
        self.worker.start()
        self.connection.start()

    def stop(self) -> None:
        self.stop_requested.set()
        deadline = monotonic() + Settings.SHUTDOWN_TIMEOUT_SECONDS
        with self.connection.state_lock:
            self.connection.stopping = True
        try:
            if self.worker.ident is not None:
                self.worker.join(timeout=max(0.0, deadline - monotonic() - NETWORK_SHUTDOWN_RESERVE_SECONDS))
            if self.worker.is_alive():
                raise RuntimeError("sensor input worker did not stop")
            # ネットワークループは動かしたまま、受付済み結果だけを上限付きで待つ。
            while monotonic() < deadline - NETWORK_SHUTDOWN_RESERVE_SECONDS:
                with self.connection.state_lock:
                    self.publisher.poll(now=monotonic())
                    pending = bool(self.publisher.pending)
                if not pending:
                    break
                sleep(0.02)
        finally:
            try:
                self.connection.stop(timeout=max(0.0, deadline - monotonic()))
            finally:
                with self.connection.state_lock:
                    self._discard_queue(reason="shutdown")
                    if not self.worker.is_alive():
                        self.buffers.reset(None)
                        self.publisher.poll(now=monotonic())
                    logger.info("RESULT_SHUTDOWN pending=%d", len(self.publisher.pending))

    def snapshot(self) -> dict:
        with self.connection.state_lock:
            receive_rejections = self.receiver.rejection_counts()
            queue_discards = self.receiver.queue_discard_counts()
            return {
                "connected": self.connection.connected,
                "subscribed": self.connection.subscribed,
                "worker_alive": self.worker.is_alive(),
                "accepted_batches": self.accepted_batches,
                "accepted_samples": self.accepted_samples,
                "rejected_batches": self.rejected_batches
                + sum(receive_rejections.values()),
                "receive_rejections": receive_rejections,
                "discarded_batches": sum(queue_discards.values()),
                "queue_discards": queue_discards,
                "queue_size": self.receiver.queue.qsize(),
                "device_api": self.device_api_state.copy(),
                "inference": {
                    "mode": "device_checked"
                    if self.device_manager
                    else "local_unverified",
                    "completed_windows": self.inferred_windows,
                    "errors": self.inference_errors,
                    "suppressed_results": self.suppressed_results,
                    "last_result": self.last_result.copy()
                    if self.last_result
                    else None,
                    "publish": self.publisher.snapshot(),
                },
            }

    def _reset_device(self, code: str | None, reason: str) -> None:
        self.buffers.reset(code)
        logger.info(
            "DEVICE_CONTINUITY_RESET reason=%s scope=%s",
            reason,
            "all" if code is None else "device",
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
        BufferManager.check_batch(batch, batch.received_at)
        BufferManager.check_batch(batch, datetime.now(UTC))
        # HTTPはstate_lock外・Worker内で直列実行。待機後に世代を再確認する。
        if self.device_manager is not None:
            state = self.device_manager.resolve(batch.device_code)
            self._update_device_snapshot()
            if state != "ACTIVE":
                self._reset_device(batch.device_code, "device_not_active")
                raise InvalidSensorBatch(f"device_{state.lower()}")
        # decode中に切断や欠落が発生する場合があるため、受理の直前に再確認する。
        with self.connection.state_lock:
            self._ensure_current_batch(batch)
        windows = self.buffers.append(
            batch, now=datetime.now(UTC), now_mono=monotonic()
        )
        with self.connection.state_lock:
            self._ensure_current_batch(batch)
            self.accepted_batches += 1
            self.accepted_samples += len(batch.samples)
        logger.info("SENSOR_BATCH_ACCEPTED samples=%d", len(batch.samples))
        for window in windows:
            with self.connection.state_lock:
                self._ensure_current_batch(batch)
            if not self.buffers.is_current(
                window, now=datetime.now(UTC), now_mono=monotonic()
            ):
                with self.connection.state_lock:
                    self.suppressed_results += 1
                continue
            started = monotonic()
            try:
                prediction = self.inference.predict(window.values)
                result = make_result(window, prediction)
            except Exception as error:
                with self.connection.state_lock:
                    self.inference_errors += 1
                    self.consecutive_errors += 1
                logger.error("INFERENCE_FAILED error_type=%s", type(error).__name__)
                if (
                    isinstance(error, (ValueError, TypeError))
                    or self.consecutive_errors >= 3
                ):
                    raise RuntimeError("inference_worker_failed") from None
                continue
            # 推論中にキャッシュが失効した場合も、そのWindowは送らない。
            if self.device_manager is not None:
                self.device_manager.expire()
                self._update_device_snapshot()
            with self.connection.state_lock:
                self.inferred_windows += 1
                self.consecutive_errors = 0
                try:
                    self._ensure_current_batch(batch)
                except InvalidSensorBatch:
                    self.suppressed_results += 1
                    raise
                if not self.buffers.is_current(
                    window, now=datetime.now(UTC), now_mono=monotonic()
                ):
                    self.suppressed_results += 1
                    continue
                self.last_result = result.copy()
                accepted = self.publisher.publish(result, now=monotonic())
            logger.info(
                "INFERENCE_RESULT result=%s p_fall=%.6f duration_ms=%.3f publish_accepted=%s payload=%s",
                prediction.result,
                prediction.p_fall,
                (monotonic() - started) * 1000,
                accepted,
                json.dumps(result, separators=(",", ":")),
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

    def _run(self) -> None:
        try:
            while not self.stop_requested.is_set():
                if self.device_manager is not None:
                    self.device_manager.expire()
                    self._update_device_snapshot()
                # 同じlockで通知解除とQueue掃除を行い、新しい欠落通知を消さない。
                with self.connection.state_lock:
                    self.publisher.poll(now=monotonic())
                    if self.buffer_generation != self.connection.generation:
                        self.buffers.reset(None)
                        self.buffer_generation = self.connection.generation
                    if self.receiver.discontinuity.is_set():
                        self._discard_queue(reason="continuity_reset")
                        self.buffers.reset(None)
                        self.receiver.discontinuity.clear()
                        logger.info("SENSOR_CONTINUITY_RESET")
                self.buffers.expire(monotonic())
                try:
                    envelope = self.receiver.queue.get(timeout=0.2)
                except Empty:
                    continue
                try:
                    with self.connection.state_lock:
                        generation = self.connection.generation
                        # Queue待機中に初回接続／再接続が完了した場合も、
                        # 新世代の最初のバッチより前にresetする。
                        if self.buffer_generation != generation:
                            self.buffers.reset(None)
                            self.buffer_generation = generation
                    self.receiver.process(envelope, generation=generation)
                except InvalidSensorBatch as error:
                    match = re.fullmatch(
                        r"fall/([A-Za-z0-9_-]{1,64})/data", envelope.topic
                    )
                    if match:
                        self._reset_device(match[1], str(error))
                    with self.connection.state_lock:
                        self.rejected_batches += 1
                    logger.warning("SENSOR_BATCH_REJECTED reason=%s", error)
                finally:
                    self.receiver.queue.task_done()
        except Exception:
            # 想定外エラーを握り潰して生存扱いにしない。live/受信healthが503になる。
            logger.exception("SENSOR_WORKER_FAILED")
        finally:
            if self.device_manager is not None:
                self.device_manager.close()
            self.buffers.reset(None)
