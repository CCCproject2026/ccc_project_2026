"""Issue #193: Device API HTTP境界のstub検証。"""

import asyncio
import unittest

import httpx

from app.core.config import Settings
from app.integrations.device import DeviceApiClient


def settings() -> Settings:
    return Settings(
        device_api_url="https://devices.example",
        device_api_token="a" * 32,
    )


class DeviceApiClientTest(unittest.TestCase):
    def lookup(self, handler, code="ESP32-001"):
        async def run():
            client = DeviceApiClient(settings())
            client._client = httpx.AsyncClient(
                transport=httpx.MockTransport(handler),
                headers={"Authorization": "Bearer " + "a" * 32},
            )
            try:
                return await client.lookup(code)
            finally:
                await client.close()

        return asyncio.run(run())

    def test_active_response_uses_encoded_path_and_bearer_token(self):
        def handler(request):
            self.assertEqual(request.url.path, "/api/devices/by-code/ESP32-001")
            self.assertEqual(request.headers["authorization"], "Bearer " + "a" * 32)
            return httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"device_code": "ESP32-001", "status": "ACTIVE"},
            )

        self.assertEqual(self.lookup(handler).state, "ACTIVE")

    def test_inactive_and_not_found_are_normalized_without_elder_data(self):
        inactive = self.lookup(
            lambda _request: httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={
                    "device_code": "ESP32-001",
                    "status": "INACTIVE",
                    "elder": "ignored",
                },
            )
        )
        missing = self.lookup(
            lambda _request: httpx.Response(
                404,
                headers={"content-type": "application/json"},
                json={"code": "NOT_FOUND", "message": "Device not found"},
            )
        )
        self.assertEqual(inactive.state, "INACTIVE")
        self.assertEqual(missing.state, "NOT_FOUND")

    def test_authentication_and_server_failure_are_not_treated_as_not_found(self):
        auth = self.lookup(lambda _request: httpx.Response(401))
        limited = self.lookup(
            lambda _request: httpx.Response(429, headers={"Retry-After": "4"})
        )
        failure = self.lookup(
            lambda _request: httpx.Response(503, headers={"Retry-After": "7"})
        )
        self.assertTrue(auth.authentication_failed)
        self.assertEqual(auth.state, "UNKNOWN")
        self.assertEqual((limited.error, limited.retry_after), ("http_429", 4.0))
        self.assertEqual(failure.error, "http_503")
        self.assertEqual(failure.retry_after, 7.0)

    def test_timeout_is_normalized_to_unknown(self):
        result = self.lookup(
            lambda _request: (_ for _ in ()).throw(httpx.ReadTimeout("timed out"))
        )
        self.assertEqual((result.state, result.error), ("UNKNOWN", "timeout"))

    def test_invalid_code_and_invalid_enum_are_rejected(self):
        called = False

        def handler(_request):
            nonlocal called
            called = True
            return httpx.Response(200)

        invalid_code = self.lookup(handler, "bad/code")
        invalid_enum = self.lookup(
            lambda _request: httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"device_code": "ESP32-001", "status": "ONLINE"},
            )
        )
        self.assertFalse(called)
        self.assertEqual(invalid_code.error, "invalid_device_code")
        self.assertEqual(invalid_enum.error, "response_device_or_status")


if __name__ == "__main__":
    unittest.main()
