"""最大100点の既存IoT JSONを検証し、ドメインデータへ変換する。"""

import json
import math
import re
from datetime import UTC, datetime, timedelta, timezone
from typing import NoReturn

from app.domain.sensor import InvalidSensorBatch, SensorBatch, SensorSample

MAX_PAYLOAD_BYTES = 64 * 1024
MAX_BATCH_SAMPLES = 100
ROOT_FIELDS = {"device_id", "ts", "ts_ms", "boot_ms", "tz_offset_sec", "samples"}
AXES = ("ax", "ay", "az", "gx", "gy", "gz")
EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


def _fail(reason: str) -> NoReturn:
    raise InvalidSensorBatch(reason)


def _object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result = {}
    for key, value in pairs:
        if key in result:
            _fail("duplicate_json_key")
        result[key] = value
    return result


def _integer(value: object, reason: str) -> int:
    if type(value) is not int:
        _fail(reason)
    return value


def decode_batch(
    payload: bytes, *, received_at: datetime, generation: int
) -> SensorBatch:
    """全点検証後に返す。不正バッチの部分採用・数値文字列変換はしない。"""
    if not payload or len(payload) > MAX_PAYLOAD_BYTES:
        _fail("payload_size")
    if received_at.utcoffset() is None:
        _fail("received_at_timezone")
    try:
        body = json.loads(
            payload.decode("utf-8"),
            object_pairs_hook=_object,
            parse_constant=lambda _: _fail("nonfinite_number"),
        )
    except InvalidSensorBatch:
        raise
    except (UnicodeDecodeError, ValueError, RecursionError):
        _fail("invalid_json")
    if type(body) is not dict or set(body) != ROOT_FIELDS:
        _fail("batch_fields")
    code = body["device_id"]
    if type(code) is not str or re.fullmatch(r"[A-Za-z0-9_-]{1,64}", code) is None:
        _fail("device_id")
    base_ms = _integer(body["ts_ms"], "ts_ms")
    boot_ms = _integer(body["boot_ms"], "boot_ms")
    offset = _integer(body["tz_offset_sec"], "tz_offset_sec")
    if base_ms < 0 or boot_ms < 0 or not -86400 < offset < 86400:
        _fail("timestamp_range")
    try:
        base = EPOCH + timedelta(milliseconds=base_ms)
        if type(body["ts"]) is not str:
            _fail("ts")
        display = datetime.fromisoformat(body["ts"])
        if display.tzinfo is None:
            display = display.replace(tzinfo=timezone(timedelta(seconds=offset)))
        if display.utcoffset() != timedelta(seconds=offset):
            _fail("timezone_mismatch")
        if display.astimezone(UTC) != base:
            _fail("timestamp_mismatch")
    except InvalidSensorBatch:
        raise
    except (ValueError, OverflowError):
        _fail("timestamp_invalid")
    points = body["samples"]
    if type(points) is not list or not 1 <= len(points) <= MAX_BATCH_SAMPLES:
        _fail("sample_count")
    samples = []
    previous = -1
    for point in points:
        if type(point) is not dict or set(point) != {"t", *AXES}:
            _fail("sample_fields")
        elapsed = _integer(point["t"], "sample_t")
        if elapsed <= previous or (not samples and elapsed != 0):
            _fail("sample_order")
        previous = elapsed
        values = []
        for axis in AXES:
            value = point[axis]
            if type(value) not in (int, float):
                _fail("axis_type")
            try:
                value = float(value)
            except (ValueError, OverflowError):
                _fail("axis_range")
            if not math.isfinite(value):
                _fail("axis_nonfinite")
            values.append(value)
        try:
            measured_at = base + timedelta(milliseconds=elapsed)
        except OverflowError:
            _fail("sample_timestamp_range")
        samples.append(
            SensorSample(code, measured_at, tuple(values[:3]), tuple(values[3:]))
        )
    return SensorBatch(code, tuple(samples), received_at.astimezone(UTC), generation)
