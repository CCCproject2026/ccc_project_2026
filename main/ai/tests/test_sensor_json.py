"""Sensor JSONの境界値検証。Broker・モデル・外部通信には接続しない。"""

import json
import unittest
from copy import deepcopy
from datetime import UTC, datetime, timedelta, timezone

from app.application.sensor_input import SensorInputService
from app.domain.sensor import InvalidSensorBatch
from app.integrations.sensor_json import MAX_PAYLOAD_BYTES, decode_batch

RECEIVED_AT = datetime(2026, 1, 2, tzinfo=UTC)
BASE = datetime(2026, 1, 2, tzinfo=timezone(timedelta(hours=9)))


def sensor_payload() -> dict:
    return {
        "device_id": "esp32-mpu6050-01",
        "ts": BASE.isoformat(timespec="milliseconds"),
        "ts_ms": int(BASE.timestamp() * 1_000),
        "boot_ms": 0,
        "tz_offset_sec": 9 * 60 * 60,
        "samples": [{"t": 0, "ax": 0, "ay": 0.0, "az": 0, "gx": 0, "gy": 0, "gz": 0}],
    }


def encode(body: dict) -> bytes:
    return json.dumps(body, separators=(",", ":"), allow_nan=False).encode("utf-8")


def decode(payload: bytes):
    return decode_batch(payload, received_at=RECEIVED_AT, generation=7)


class SensorJsonTests(unittest.TestCase):
    def test_accepts_zero_values_and_normalizes_timestamp_to_utc(self):
        batch = decode(encode(sensor_payload()))

        self.assertEqual(batch.device_code, "esp32-mpu6050-01")
        self.assertEqual(batch.generation, 7)
        self.assertEqual(batch.samples[0].measured_at.utcoffset(), timedelta())
        self.assertEqual(batch.samples[0].accelerometer, (0.0, 0.0, 0.0))
        self.assertEqual(batch.samples[0].gyroscope, (0.0, 0.0, 0.0))

    def test_accepts_exact_payload_limit_and_rejects_one_byte_over(self):
        payload = encode(sensor_payload())
        exact_limit = payload + b" " * (MAX_PAYLOAD_BYTES - len(payload))

        self.assertEqual(len(exact_limit), MAX_PAYLOAD_BYTES)
        self.assertEqual(len(decode(exact_limit).samples), 1)
        with self.assertRaisesRegex(InvalidSensorBatch, "payload_size"):
            decode(exact_limit + b" ")

    def test_rejects_invalid_encoding_and_duplicate_json_key(self):
        for payload in (
            b"\xff",
            b'{"device_id":"a","device_id":"b"}',
        ):
            with self.subTest(payload=payload), self.assertRaises(InvalidSensorBatch):
                decode(payload)

    def test_rejects_invalid_axis_values_and_sample_fields(self):
        cases = {
            "bool": lambda body: body["samples"][0].__setitem__("ax", True),
            "string": lambda body: body["samples"][0].__setitem__("ax", "0"),
            "missing_axis": lambda body: body["samples"][0].pop("az"),
            "extra_axis": lambda body: body["samples"][0].__setitem__("extra", 1),
        }
        for name, change in cases.items():
            body = sensor_payload()
            change(body)
            with self.subTest(name=name), self.assertRaises(InvalidSensorBatch):
                decode(encode(body))

        for literal in (b"NaN", b"Infinity", b"-Infinity"):
            payload = encode(sensor_payload()).replace(b'"ax":0', b'"ax":' + literal)
            with (
                self.subTest(literal=literal),
                self.assertRaisesRegex(InvalidSensorBatch, "nonfinite_number"),
            ):
                decode(payload)

    def test_rejects_missing_or_extra_root_field_and_naive_received_time(self):
        missing = sensor_payload()
        missing.pop("boot_ms")
        extra = sensor_payload()
        extra["unexpected"] = 1

        for body in (missing, extra):
            with (
                self.subTest(body=body),
                self.assertRaisesRegex(InvalidSensorBatch, "batch_fields"),
            ):
                decode(encode(body))
        with self.assertRaisesRegex(InvalidSensorBatch, "received_at_timezone"):
            decode_batch(
                encode(sensor_payload()), received_at=datetime(2026, 1, 2), generation=7
            )

    def test_rejects_topic_mismatch_after_json_validation(self):
        received = []
        service = SensorInputService(consume=received.append)
        batch = decode(encode(sensor_payload()))

        service.accept(batch, topic="fall/esp32-mpu6050-01/data", retained=False)
        self.assertEqual(received, [batch])
        with self.assertRaisesRegex(InvalidSensorBatch, "topic_device_mismatch"):
            service.accept(batch, topic="fall/other-device/data", retained=False)

    def test_keeps_naive_sensor_timestamp_compatible_with_current_batch_contract(self):
        body = deepcopy(sensor_payload())
        body["ts"] = "2026-01-02T00:00:00.000"

        batch = decode(encode(body))
        self.assertEqual(batch.samples[0].measured_at.utcoffset(), timedelta())


if __name__ == "__main__":
    unittest.main()
