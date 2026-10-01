"""Generate a three-minute MQTT telemetry fixture using only the Python standard library."""

import argparse
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path


DEVICE_ID = "esp32-mpu6050-01"
PACKET_COUNT = 90
SAMPLES_PER_PACKET = 100
SAMPLE_INTERVAL_MS = 20
PACKET_INTERVAL_MS = 2_000
GRAVITY_M_S2 = 9.80665
FALL_PACKET_INDEX = PACKET_COUNT // 2

NORMAL_POINTS = [
    (0, 0.012, -0.045, 9.823, 0.001, -0.003, 0.002),
    (100, 0.023, -0.031, 9.801, 0.002, -0.001, 0.001),
    (200, -0.015, 0.042, 9.815, -0.001, 0.003, -0.002),
    (300, 0.008, -0.022, 9.834, 0.001, -0.002, 0.001),
    (400, -0.031, 0.015, 9.798, -0.002, 0.001, -0.001),
    (500, 0.019, -0.008, 9.812, 0.001, -0.001, 0.003),
    (600, -0.005, 0.033, 9.827, 0.002, -0.003, -0.001),
    (700, 0.028, -0.019, 9.805, -0.001, 0.002, 0.002),
    (800, -0.012, 0.026, 9.818, 0.001, -0.002, 0.001),
    (900, 0.006, -0.037, 9.831, -0.002, 0.001, -0.002),
]


def interpolate_normal_sample(sample_time_ms: int) -> dict[str, float | int]:
    point_time = sample_time_ms % 1_000
    point_index = min(point_time // 100, len(NORMAL_POINTS) - 1)
    left = NORMAL_POINTS[point_index]
    right = NORMAL_POINTS[(point_index + 1) % len(NORMAL_POINTS)]
    fraction = (point_time - left[0]) / 100

    values = [
        left[index] + (right[index] - left[index]) * fraction
        for index in range(1, len(left))
    ]
    ax, ay, az, gx, gy, gz = values
    return {
        "t": sample_time_ms,
        "ax": round(ax / GRAVITY_M_S2, 5),
        "ay": round(ay / GRAVITY_M_S2, 5),
        "az": round(az / GRAVITY_M_S2, 5),
        "gx": round(gx, 5),
        "gy": round(gy, 5),
        "gz": round(gz, 5),
    }


def make_fall_sample(sample_time_ms: int) -> dict[str, float | int]:
    if sample_time_ms < 800:
        return interpolate_normal_sample(sample_time_ms)
    if sample_time_ms < 1_000:
        return {
            "t": sample_time_ms,
            "ax": 0.005,
            "ay": -0.008,
            "az": 0.012,
            "gx": 0.2,
            "gy": -0.1,
            "gz": 0.1,
        }
    if sample_time_ms < 1_040:
        return {
            "t": sample_time_ms,
            "ax": 0.25,
            "ay": -0.18,
            "az": 2.24,
            "gx": 145.0,
            "gy": -82.0,
            "gz": 64.0,
        }
    return {
        "t": sample_time_ms,
        "ax": 0.03,
        "ay": 0.08,
        "az": 0.99,
        "gx": 0.4,
        "gy": -0.3,
        "gz": 0.2,
    }


def make_packet(packet_index: int, start_time: datetime) -> dict:
    packet_time = start_time + timedelta(milliseconds=packet_index * PACKET_INTERVAL_MS)
    samples = []
    for sample_index in range(SAMPLES_PER_PACKET):
        sample_time_ms = sample_index * SAMPLE_INTERVAL_MS
        sample = (
            make_fall_sample(sample_time_ms)
            if packet_index == FALL_PACKET_INDEX
            else interpolate_normal_sample(sample_time_ms)
        )
        samples.append(sample)

    timestamp_ms = int(packet_time.timestamp() * 1_000)
    return {
        "device_id": DEVICE_ID,
        "ts": packet_time.isoformat(timespec="milliseconds"),
        "ts_ms": timestamp_ms,
        "boot_ms": packet_index * PACKET_INTERVAL_MS,
        "tz_offset_sec": 9 * 60 * 60,
        "samples": samples,
    }


def validate_packets(packets: list[dict]) -> None:
    assert len(packets) == PACKET_COUNT
    assert all(len(packet["samples"]) == SAMPLES_PER_PACKET for packet in packets)
    assert all(
        packets[index + 1]["ts_ms"] - packets[index]["ts_ms"] == PACKET_INTERVAL_MS
        for index in range(PACKET_COUNT - 1)
    )
    assert all(
        sample["t"] == sample_index * SAMPLE_INTERVAL_MS
        for packet in packets
        for sample_index, sample in enumerate(packet["samples"])
    )
    fall_packet = packets[FALL_PACKET_INDEX]
    assert min(
        math.sqrt(sample["ax"] ** 2 + sample["ay"] ** 2 + sample["az"] ** 2)
        for sample in fall_packet["samples"][40:50]
    ) < 0.1
    assert max(sample["az"] for sample in fall_packet["samples"]) > 2.0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).with_name("telemetry-3min.jsonl"),
        help="JSONL output path (default: telemetry-3min.jsonl next to this script)",
    )
    args = parser.parse_args()

    start_time = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=9)))
    packets = [make_packet(index, start_time) for index in range(PACKET_COUNT)]
    validate_packets(packets)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as output_file:
        for packet in packets:
            output_file.write(json.dumps(packet, separators=(",", ":")) + "\n")

    print(f"Wrote {len(packets)} packets ({PACKET_COUNT * 2} seconds) to {args.output}")


if __name__ == "__main__":
    main()