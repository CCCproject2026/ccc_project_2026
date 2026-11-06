"""JSONLのMockバッチを2秒間隔でMQTT送信する（Python 3.11+ / paho-mqtt 2.1.0）。"""

import argparse
import json
import os
import re
import ssl
import sys
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path
from threading import Event
from time import monotonic
from uuid import uuid4

import paho.mqtt.client as mqtt

MAX_PAYLOAD_BYTES = 64 * 1024
INTERVAL_SECONDS = 2.0


def read_packets(path: Path, limit: int | None) -> list[dict]:
    packets = []
    with path.open(encoding="utf-8") as source:
        for number, line in enumerate(source, 1):
            if not line.strip():
                continue
            if len(line.encode("utf-8")) > MAX_PAYLOAD_BYTES + 1:
                raise ValueError(f"line {number}: payload exceeds 64 KiB")
            packet = json.loads(line)
            if not isinstance(packet, dict):
                raise TypeError(f"line {number}: expected JSON object")
            code = packet.get("device_id")
            if (
                not isinstance(code, str)
                or re.fullmatch(r"[A-Za-z0-9_-]{1,64}", code) is None
            ):
                raise ValueError(f"line {number}: invalid device_id")
            samples = packet.get("samples")
            if (
                not isinstance(samples, list)
                or len(samples) != 100
                or any(
                    not isinstance(sample, dict)
                    or type(sample.get("t")) is not int
                    or sample["t"] != index * 20
                    for index, sample in enumerate(samples)
                )
            ):
                raise ValueError(
                    f"line {number}: expected 100 samples at 20 ms intervals"
                )
            # NaN/InfinityやJSONに変換できないデータを送信前に拒否する。
            json.dumps(packet, allow_nan=False)
            packets.append(packet)
            if limit is not None and len(packets) >= limit:
                break
    if not packets:
        raise ValueError("input file contains no packets")
    return packets


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, default=Path(__file__).with_name("telemetry-3min.jsonl")
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, help="default: 1883, or 8883 with --tls")
    parser.add_argument("--qos", type=int, choices=(0, 1), default=0)
    parser.add_argument(
        "--device-id", help="override device_id and matching MQTT topic"
    )
    parser.add_argument("--limit", type=int, help="send only the first N packets")
    parser.add_argument(
        "--keep-timestamps",
        action="store_true",
        help="send original timestamps instead of rebasing to now",
    )
    parser.add_argument("--tls", action="store_true")
    parser.add_argument("--ca-file", type=Path)
    parser.add_argument("--username", default=os.getenv("MQTT_USERNAME"))
    args = parser.parse_args()
    port = args.port if args.port is not None else (8883 if args.tls else 1883)
    if not 1 <= port <= 65535:
        parser.error("--port must be between 1 and 65535")
    if args.limit is not None and args.limit <= 0:
        parser.error("--limit must be positive")
    if (
        args.device_id is not None
        and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", args.device_id) is None
    ):
        parser.error("invalid --device-id")
    if args.ca_file and not args.tls:
        parser.error("--ca-file requires --tls")
    password = os.getenv("MQTT_PASSWORD")
    if password and not args.username:
        parser.error("MQTT_PASSWORD requires --username or MQTT_USERNAME")

    packets = read_packets(args.input, args.limit)
    connected = Event()
    connection_result = Event()
    disconnected = Event()
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"mock-publisher-{uuid4().hex[:12]}",
        clean_session=True,
        protocol=mqtt.MQTTv311,
        reconnect_on_failure=False,
    )
    client.connect_timeout = 5.0
    if args.username:
        client.username_pw_set(args.username, password)
    if args.tls:
        client.tls_set_context(
            ssl.create_default_context(
                cafile=str(args.ca_file) if args.ca_file else None
            )
        )

    def on_connect(client, userdata, flags, reason_code, properties):
        if not reason_code.is_failure:
            connected.set()
        connection_result.set()

    def on_connect_fail(client, userdata):
        connection_result.set()

    def on_disconnect(client, userdata, flags, reason_code, properties):
        disconnected.set()

    client.on_connect = on_connect
    client.on_connect_fail = on_connect_fail
    client.on_disconnect = on_disconnect
    client.connect_async(args.host, port, keepalive=60)
    if client.loop_start() != mqtt.MQTT_ERR_SUCCESS:
        raise RuntimeError("could not start MQTT network loop")
    sent = 0
    try:
        if not connection_result.wait(10) or not connected.is_set():
            raise RuntimeError("MQTT connection failed or timed out")
        next_send = monotonic()
        for packet in packets:
            if disconnected.wait(max(0.0, next_send - monotonic())):
                raise RuntimeError(f"MQTT disconnected after {sent} packets")
            if args.device_id:
                packet["device_id"] = args.device_id
            if not args.keep_timestamps:
                # バッチ末尾を現在に置き、未来のサンプルを送らない。
                now_ms = int(datetime.now(UTC).timestamp() * 1000)
                packet["ts_ms"] = now_ms - packet["samples"][-1]["t"]
                offset = packet.get("tz_offset_sec")
                if type(offset) is not int or not -86400 < offset < 86400:
                    raise ValueError("invalid tz_offset_sec")
                zone = timezone(timedelta(seconds=offset))
                packet["ts"] = datetime.fromtimestamp(
                    packet["ts_ms"] / 1000, zone
                ).isoformat(timespec="milliseconds")
            payload = json.dumps(packet, separators=(",", ":"), allow_nan=False).encode(
                "utf-8"
            )
            if len(payload) > MAX_PAYLOAD_BYTES:
                raise ValueError("encoded payload exceeds 64 KiB")
            topic = f"fall/{packet['device_id']}/data"
            started = monotonic()
            info = client.publish(topic, payload, qos=args.qos, retain=False)
            if info.rc != mqtt.MQTT_ERR_SUCCESS:
                raise RuntimeError(f"MQTT publish failed after {sent} packets")
            info.wait_for_publish(timeout=5.0)
            if not info.is_published():
                raise RuntimeError(f"MQTT publish timed out after {sent} packets")
            sent += 1
            print(
                f"Sent {sent}/{len(packets)} topic={topic} samples=100 qos={args.qos}",
                flush=True,
            )
            # 遅延しても追いつくための連続送信は行わない。
            next_send = max(started + INTERVAL_SECONDS, monotonic())
        print(f"Completed: {sent} packets. AI acceptance must be checked in AI logs.")
        return 0
    finally:
        client.disconnect()
        client.loop_stop()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("Stopped.", file=sys.stderr)
        sys.exit(130)
    except (OSError, ValueError, TypeError, RuntimeError) as error:
        print(f"Publish failed: {error}", file=sys.stderr)
        sys.exit(1)
