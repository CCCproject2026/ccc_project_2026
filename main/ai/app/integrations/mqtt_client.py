"""MQTT接続・購読と、既存バッチ入力処理へのアダプター。"""

import logging
import ssl
from dataclasses import dataclass
from datetime import UTC, datetime
from queue import Empty, Full, Queue
from threading import Event, Lock, Thread
from time import monotonic

import paho.mqtt.client as mqtt

from app.application.sensor_input import SensorInputService
from app.core.config import Settings
from app.domain.sensor import InvalidSensorBatch
from app.integrations.sensor_json import MAX_PAYLOAD_BYTES, decode_batch

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class Envelope:
    payload: bytes
    topic: str
    retained: bool
    received_at: datetime
    generation: int
    # 壁時計の補正に影響されない待機時間の計測用。鮮度閾値は別途合意する。
    received_monotonic: float


class MqttSensorInput:
    def __init__(self, service: SensorInputService, capacity: int = 16) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.queue: Queue[Envelope] = Queue(maxsize=capacity)
        self.service = service
        self.discontinuity = Event()

    def receive(
        self, payload: bytes, topic: str, retained: bool, generation: int
    ) -> bool:
        """callback用。検証・HTTP・推論をせず、非ブロッキングで投入する。"""
        if retained or not payload or len(payload) > MAX_PAYLOAD_BYTES:
            # この入力だけを拒否する。他Deviceの正常なQueueは破棄しない。
            return False
        envelope = Envelope(
            bytes(payload), topic, retained, datetime.now(UTC), generation, monotonic()
        )
        try:
            self.queue.put_nowait(envelope)
        except Full:
            self.discontinuity.set()
            return False
        return True

    def process(self, envelope: Envelope, *, generation: int) -> None:
        """Worker用。全点検証後に後続へ渡す。欠落通知の処理はWorkerが担う。"""
        if envelope.generation != generation:
            raise InvalidSensorBatch("stale_generation")
        batch = decode_batch(
            envelope.payload,
            received_at=envelope.received_at,
            generation=envelope.generation,
        )
        # 不正JSON/Schemaは当該バッチのみ拒否。全体欠落通知は立てない。
        # Buffer追加時には、信頼できるTopicから対象Deviceだけをresetする。
        self.service.accept(batch, topic=envelope.topic, retained=envelope.retained)

    def discard_pending(self) -> None:
        """呼出元で受信と同期する。Queueのtaskカウントも必ず消し込む。"""
        while True:
            try:
                self.queue.get_nowait()
            except Empty:
                return
            self.queue.task_done()


class _VerifiedMqttClient(mqtt.Client):
    """Pahoの再接続境界で証明書エラーを通信障害から区別する。"""

    certificate_failed = False

    def reconnect(self):
        try:
            return super().reconnect()
        except ssl.SSLCertVerificationError:
            self.certificate_failed = True
            # DISCONNECTEDへ遷移させることでloop_foreverの再試行を止める。
            # 証明書検証を緩めて接続し直すことはしない。
            self.disconnect()
            logger.error("MQTT_CERTIFICATE_INVALID configuration_required=true")
            raise


class MqttConnection:
    """Pahoの通信スレッドを所有する。JSON検証はWorkerに任せる。

    state_lockは世代・購読状態・受理確定を同期する短い区間だけで使う。
    HTTPやモデル推論をこのロックの内側へ追加してはいけない。
    """

    def __init__(self, settings: Settings, receiver: MqttSensorInput) -> None:
        self.receiver = receiver
        self.settings = settings
        self.state_lock = Lock()
        self.generation = 0
        self.subscribed = False
        self.connected = False
        self.stopping = False
        self.subscription_mid = None
        self.client = _VerifiedMqttClient(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=settings.mqtt_client_id,
            clean_session=True,
            protocol=mqtt.MQTTv311,
        )
        self.client.connect_timeout = 3.0
        self.client.reconnect_delay_set(min_delay=1, max_delay=30)
        if settings.mqtt_username:
            self.client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        if settings.mqtt_tls:
            # デフォルトCAまたは指定CAを使用し、証明書・hostname検証を維持する。
            context = ssl.create_default_context(cafile=settings.mqtt_ca_file or None)
            self.client.tls_set_context(context)
        self.client.on_connect = self._on_connect
        self.client.on_connect_fail = self._on_connect_fail
        self.client.on_subscribe = self._on_subscribe
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def start(self) -> None:
        # connect_async + loop_startで初回接続失敗も再試行する。
        self.client.connect_async(
            self.settings.mqtt_host,
            self.settings.mqtt_port,
            keepalive=self.settings.mqtt_keepalive,
        )
        if self.client.loop_start() != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError("MQTT network loop could not start")

    def stop(self, timeout: float) -> None:
        with self.state_lock:
            self.stopping = True
            self._invalidate()
        errors = []

        def close_network():
            try:
                self.client.disconnect()
                # Pahoのloop_stopにはtimeout引数がない。呼出しを分離して上限を守る。
                self.client.loop_stop()
            except Exception as error:
                errors.append(type(error).__name__)

        closer = Thread(target=close_network, name="mqtt-stop", daemon=True)
        closer.start()
        closer.join(timeout=max(0.0, timeout))
        if closer.is_alive():
            raise RuntimeError("MQTT shutdown timed out")
        if errors:
            raise RuntimeError("MQTT shutdown failed")

    def _invalidate(self) -> None:
        """呼出元がstate_lockを持つ。切断前のQueueを論理的に失効する。"""
        self.connected = False
        self.subscribed = False
        self.subscription_mid = None
        self.generation += 1
        self.receiver.discontinuity.set()

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        with self.state_lock:
            self._invalidate()
            if self.stopping or reason_code.is_failure:
                logger.error("MQTT_CONNECT_REJECTED")
                # 認証・プロトコル拒否を無限再試行せず、設定修正後に再起動する。
                client.disconnect()
                return
            # 再購読前に旧Queueを掃除する。SUBACK直後の新着バッチを
            # Workerの遅れたresetで捨てないよう、ここで通知も消し込む。
            # Buffer追加時は世代変更をWorker側でも検知してresetすること。
            self.receiver.discard_pending()
            self.receiver.discontinuity.clear()
            self.connected = True
            result, mid = client.subscribe("fall/+/data", qos=self.settings.mqtt_qos)
            if result != 0:
                logger.error("MQTT_SUBSCRIBE_FAILED")
                client.disconnect()
                return
            self.subscription_mid = mid
        logger.info("MQTT_CONNECTED")

    def _on_connect_fail(self, client, userdata):
        if client.certificate_failed:
            return
        logger.warning("MQTT_CONNECT_FAILED retry=backoff")

    def _on_subscribe(self, client, userdata, mid, reason_codes, properties):
        with self.state_lock:
            if self.stopping or mid != self.subscription_mid:
                return
            if not reason_codes or any(code.is_failure for code in reason_codes):
                self._invalidate()
                logger.error("MQTT_SUBSCRIBE_REJECTED")
                client.disconnect()
                return
            # CONNACK成功だけでは受信準備完了にしない。SUBACKまで待つ。
            self.subscribed = True
        logger.info("MQTT_SUBSCRIBED topic=fall/+/data")

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        with self.state_lock:
            self._invalidate()
        logger.info("MQTT_DISCONNECTED")

    def _on_message(self, client, userdata, message):
        with self.state_lock:
            if self.stopping or not self.subscribed:
                return
            # callback内では有限Queueへの非ブロッキング投入だけを行う。
            self.receiver.receive(
                message.payload, message.topic, message.retain, self.generation
            )
