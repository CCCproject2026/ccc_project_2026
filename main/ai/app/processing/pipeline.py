"""受信Queueを処理する単一Worker。入力検証とDevice利用可否を担当する。"""

import logging
from queue import Empty
from threading import Event, Thread
from time import monotonic

from app.application.sensor_input import SensorInputService
from app.core.config import Settings
from app.domain.sensor import InvalidSensorBatch, SensorBatch
from app.integrations.device import DeviceApiClient, DeviceManager
from app.integrations.mqtt_client import MqttConnection, MqttSensorInput

logger = logging.getLogger(__name__)

# Queue待機（0.2秒）から復帰して終了するための予算を、合計5秒の内側に残す。
WORKER_SHUTDOWN_RESERVE_SECONDS = 0.5


class InputPipeline:
    def __init__(self, settings: Settings) -> None:
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
            logger.warning("DEVICE_API_DISABLED mode=input_validation_only")
        self.receiver = MqttSensorInput(
            SensorInputService(consume=self._accept_batch), Settings.QUEUE_CAPACITY
        )
        self.connection = MqttConnection(settings, self.receiver)
        self.worker = Thread(target=self._run, name="sensor-input", daemon=True)

    def start(self) -> None:
        # 先にWorkerを起動して、購読直後の受信を処理できるようにする。
        self.worker.start()
        self.connection.start()

    def stop(self) -> None:
        # callbackの受付を止めた後でWorkerを終了する。残りQueueは復元しない。
        self.stop_requested.set()
        deadline = monotonic() + Settings.SHUTDOWN_TIMEOUT_SECONDS
        try:
            self.connection.stop(
                timeout=max(
                    0.0, deadline - monotonic() - WORKER_SHUTDOWN_RESERVE_SECONDS
                )
            )
        finally:
            # MQTT停止が失敗してもWorker終了とQueue解放を省略しない。
            if self.worker.ident is not None:
                self.worker.join(timeout=max(0.0, deadline - monotonic()))
            if self.worker.is_alive():
                raise RuntimeError("sensor input worker did not stop")
            with self.connection.state_lock:
                self._discard_queue(reason="shutdown")

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
            }

    def _reset_device(self, code: str | None, reason: str) -> None:
        # Bufferは未実装。接続時はここでcodeのBuffer（Noneなら全体）を削除する。
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
        # HTTPはstate_lock外・Worker内で直列実行。待機後に世代を再確認する。
        if self.device_manager is not None:
            state = self.device_manager.resolve(batch.device_code)
            self._update_device_snapshot()
            if state != "ACTIVE":
                raise InvalidSensorBatch(f"device_{state.lower()}")
        # decode中に切断や欠落が発生する場合があるため、受理の直前に再確認する。
        with self.connection.state_lock:
            self._ensure_current_batch(batch)
            self.accepted_batches += 1
            self.accepted_samples += len(batch.samples)
        # 今回の終点。生payloadは保存・出力しない。推論成功とは区別する。
        # Buffer実装時はここからACTIVEの検証済みbatchを引き渡す。
        logger.info("SENSOR_BATCH_ACCEPTED samples=%d", len(batch.samples))

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
                    if self.receiver.discontinuity.is_set():
                        self._discard_queue(reason="continuity_reset")
                        self.receiver.discontinuity.clear()
                        logger.info("SENSOR_CONTINUITY_RESET")
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
                    logger.warning("SENSOR_BATCH_REJECTED reason=%s", error)
                finally:
                    self.receiver.queue.task_done()
        except Exception:
            # 想定外エラーを握り潰して生存扱いにしない。live/受信healthが503になる。
            logger.exception("SENSOR_WORKER_FAILED")
        finally:
            if self.device_manager is not None:
                self.device_manager.close()
