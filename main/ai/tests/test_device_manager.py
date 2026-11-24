"""Device API cacheとBuffer reset境界の単体テスト。"""

import unittest

from app.integrations.device import (
    CACHE_CAPACITY,
    CacheEntry,
    DeviceLookup,
    DeviceManager,
)


class _Client:
    def __init__(self, state: str = "ACTIVE") -> None:
        self.state = state

    async def lookup(self, code: str) -> DeviceLookup:
        del code
        return DeviceLookup(self.state)

    async def close(self) -> None:
        pass


class DeviceManagerTest(unittest.TestCase):
    def test_expired_active_cache_refresh_keeps_sensor_buffer(self) -> None:
        resets: list[tuple[str | None, str]] = []
        manager = DeviceManager(
            _Client(), lambda code, reason: resets.append((code, reason))
        )
        manager.cache["ESP32-001"] = CacheEntry("ACTIVE", expires_at=0.0)

        self.assertEqual(manager.resolve("ESP32-001"), "ACTIVE")
        self.assertEqual(resets, [])
        manager.close()

    def test_lru_eviction_keeps_sensor_buffer(self) -> None:
        resets: list[tuple[str | None, str]] = []
        manager = DeviceManager(
            _Client(), lambda code, reason: resets.append((code, reason))
        )
        for index in range(CACHE_CAPACITY):
            manager.cache[f"D{index}"] = CacheEntry("ACTIVE", expires_at=float("inf"))

        self.assertEqual(manager.resolve("ESP32-001"), "ACTIVE")
        self.assertEqual(len(manager.cache), CACHE_CAPACITY)
        self.assertEqual(resets, [])
        manager.close()

    def test_not_active_lookup_resets_device_buffer(self) -> None:
        resets: list[tuple[str | None, str]] = []
        manager = DeviceManager(
            _Client("INACTIVE"), lambda code, reason: resets.append((code, reason))
        )

        self.assertEqual(manager.resolve("ESP32-001"), "INACTIVE")
        self.assertEqual(resets, [("ESP32-001", "device_not_active")])
        manager.close()
