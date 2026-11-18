"""Buffer/Windowの標準ライブラリunit test。Brokerやモデルを使わない。"""

import unittest
from datetime import UTC, datetime, timedelta

from app.domain.sensor import SensorSample
from app.processing.buffer import BufferCapacityError, BufferManager


def sample(code: str, index: int) -> SensorSample:
    return SensorSample(
        device_code=code,
        measured_at=datetime(2026, 1, 1, tzinfo=UTC)
        + timedelta(milliseconds=20 * index),
        accelerometer=(float(index), 0.0, 1.0),
        gyroscope=(0.0, 0.0, 0.0),
    )


class BufferManagerTest(unittest.TestCase):
    def test_step_50_emits_100_150_200_and_window_is_immutable(self):
        manager = BufferManager(step=50)
        windows = []
        for index in range(200):
            window = manager.append(
                sample("ESP32-001", index), generation=3, now_monotonic=index
            )
            if window is not None:
                windows.append(window)
        self.assertEqual(
            [window.ended_at for window in windows],
            [sample("ESP32-001", index).measured_at for index in (99, 149, 199)],
        )
        self.assertEqual(windows[0].values.shape, (100, 6))
        self.assertFalse(windows[0].values.flags.writeable)
        self.assertEqual(windows[0].values[0, 0], 0.0)
        self.assertEqual(windows[0].values[-1, 0], 99.0)

    def test_step_100_emits_only_100_and_200(self):
        manager = BufferManager(step=100)
        emitted = []
        for index in range(200):
            window = manager.append(
                sample("ESP32-001", index), generation=1, now_monotonic=index
            )
            if window is not None:
                emitted.append(window)
        self.assertEqual(len(emitted), 2)

    def test_devices_are_isolated_and_duplicate_does_not_advance_count(self):
        manager = BufferManager(step=100)
        for index in range(99):
            self.assertIsNone(
                manager.append(sample("A", index), generation=1, now_monotonic=index)
            )
            self.assertIsNone(
                manager.append(sample("B", index), generation=1, now_monotonic=index)
            )
        self.assertIsNone(
            manager.append(sample("A", 98), generation=1, now_monotonic=100)
        )
        self.assertEqual(
            manager.append(
                sample("A", 99), generation=1, now_monotonic=101
            ).device_code,
            "A",
        )
        self.assertEqual(
            manager.append(
                sample("B", 99), generation=1, now_monotonic=101
            ).device_code,
            "B",
        )

    def test_duplicate_does_not_extend_offline_deadline(self):
        manager = BufferManager(offline_after_seconds=5)
        manager.append(sample("ESP32-001", 0), generation=1, now_monotonic=0)
        self.assertIsNone(
            manager.append(sample("ESP32-001", 0), generation=1, now_monotonic=4)
        )
        self.assertEqual(manager.expire(now_monotonic=5), ("ESP32-001",))

    def test_reverse_time_discards_the_point_and_requires_new_100_samples(self):
        manager = BufferManager(step=100)
        for index in range(50):
            manager.append(
                sample("ESP32-001", index), generation=1, now_monotonic=index
            )
        self.assertIsNone(
            manager.append(sample("ESP32-001", 10), generation=1, now_monotonic=51)
        )
        for index in range(51, 150):
            self.assertIsNone(
                manager.append(
                    sample("ESP32-001", index), generation=1, now_monotonic=index
                )
            )
        self.assertIsNotNone(
            manager.append(sample("ESP32-001", 150), generation=1, now_monotonic=150)
        )

    def test_generation_change_and_expiry_reset_continuity(self):
        manager = BufferManager(step=100, offline_after_seconds=5)
        for index in range(10):
            manager.append(
                sample("ESP32-001", index), generation=1, now_monotonic=index
            )
        manager.append(sample("ESP32-001", 10), generation=2, now_monotonic=10)
        self.assertEqual(manager.expire(now_monotonic=14), ())
        self.assertEqual(manager.expire(now_monotonic=15), ("ESP32-001",))

    def test_capacity_rejects_new_device_without_evicting_existing_data(self):
        manager = BufferManager(max_devices=1)
        manager.append(sample("A", 0), generation=1, now_monotonic=0)
        with self.assertRaises(BufferCapacityError):
            manager.append(sample("B", 0), generation=1, now_monotonic=0)
        self.assertEqual(len(manager), 1)


if __name__ == "__main__":
    unittest.main()
