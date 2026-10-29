"""受信Queueを処理する単一Worker。今回は入力検証までを担当する。"""

import logging
from queue import Empty
from threading import Event, Thread
from time import monotonic

from app.application.sensor_input import SensorInputService
from app.core.config import Settings
from app.domain.sensor import InvalidSensorBatch, SensorBatch
from app.integrations.mqtt_client import MqttConnection, MqttSensorInput

logger = logging.getLogger(__name__)


class InputPipeline:
    def __init__(self, settings: Settings) -> None:
        self.stop_requested = Event()
        self.accepted_batches = 0
        self.accepted_samples = 0
        self.rejected_batches = 0
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
            self.connection.stop(timeout=max(0.0, deadline - monotonic()))
        finally:
            # MQTT停止が失敗してもWorker終了とQueue解放を省略しない。
            if self.worker.ident is not None:
                self.worker.join(timeout=max(0.0, deadline - monotonic()))
            if self.worker.is_alive():
                raise RuntimeError("sensor input worker did not stop")
            with self.connection.state_lock:
                self._discard_queue()

    def snapshot(self) -> dict:
        with self.connection.state_lock:
            return {
                "connected": self.connection.connected,
                "subscribed": self.connection.subscribed,
                "worker_alive": self.worker.is_alive(),
                "accepted_batches": self.accepted_batches,
                "accepted_samples": self.accepted_samples,
                "rejected_batches": self.rejected_batches,
                "queue_size": self.receiver.queue.qsize(),
            }

    def _discard_queue(self) -> None:
        self.receiver.discard_pending()

    def _accept_batch(self, batch: SensorBatch) -> None:
        # decode中に切断や欠落が発生する場合があるため、受理の直前に再確認する。
        with self.connection.state_lock:
            if (
                self.stop_requested.is_set()
                or not self.connection.subscribed
                or batch.generation != self.connection.generation
                or self.receiver.discontinuity.is_set()
            ):
                raise InvalidSensorBatch("interrupted_batch")
            self.accepted_batches += 1
            self.accepted_samples += len(batch.samples)
        # 今回の終点。生payloadは保存・出力しない。推論成功とは区別する。
        # Device API / Buffer実装時はここから検証済みbatchを引き渡す。
        logger.info("SENSOR_BATCH_ACCEPTED samples=%d", len(batch.samples))

    def _run(self) -> None:
        try:
            while not self.stop_requested.is_set():
                # 同じlockで通知解除とQueue掃除を行い、新しい欠落通知を消さない。
                with self.connection.state_lock:
                    if self.receiver.discontinuity.is_set():
                        self._discard_queue()
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
            logger.error("SENSOR_WORKER_FAILED")
