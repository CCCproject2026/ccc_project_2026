"""Issue #193: Device API HTTP境界のstub検証。"""

import asyncio
import re
import unittest
from unittest.mock import patch

import httpx

from app.core.config import Settings
from app.integrations import device
from app.integrations.device import DeviceApiClient


def settings() -> Settings:
    return Settings(
        device_api_url="https://devices.example",
        device_api_token="a" * 32,
    )


class DeviceApiClientTest(unittest.TestCase):
    def lookup(self, handler, code="ESP32-001", *, capture_transport=False):
        async def run():
            client = DeviceApiClient(settings())
            with patch.object(
                device.httpx,
                "AsyncHTTPTransport",
                return_value=httpx.MockTransport(handler),
            ) as transport:
                try:
                    result = await client.lookup(code)
                    if capture_transport:
                        return result, transport.call_args
                    return result
                finally:
                    await client.close()

        return asyncio.run(run())

    def test_active_response_uses_encoded_path_and_bearer_token(self):
        def handler(request):
            self.assertEqual(request.url.raw_path, b"/api/devices/by-code/a%20b")
            self.assertEqual(request.headers["authorization"], "Bearer " + "a" * 32)
            return httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"device_code": "a b", "status": "ACTIVE"},
            )

        # 本番のcode契約は英数字・_・-のみ。URL組み立て自体を検証するため、
        # このcaseだけ入力検証を広げて、quote()が変換する文字を通す。
        with (
            patch.object(device, "CODE_PATTERN", re.compile(r".+")),
            patch.object(device, "quote", wraps=device.quote) as encode,
        ):
            self.assertEqual(self.lookup(handler, "a b").state, "ACTIVE")
            encode.assert_called_once_with("a b", safe="")

    def test_client_disables_transport_retries(self):
        result, transport_call = self.lookup(
            lambda _request: httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"device_code": "ESP32-001", "status": "ACTIVE"},
            ),
            capture_transport=True,
        )

        self.assertEqual(result.state, "ACTIVE")
        self.assertEqual(transport_call.kwargs, {"retries": 0})

    def test_inactive_and_not_found_are_normalized(self):
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
        forbidden = self.lookup(lambda _request: httpx.Response(403))
        limited = self.lookup(
            lambda _request: httpx.Response(429, headers={"Retry-After": "4"})
        )
        failure = self.lookup(
            lambda _request: httpx.Response(503, headers={"Retry-After": "7"})
        )
        self.assertTrue(auth.authentication_failed)
        self.assertEqual(auth.state, "UNKNOWN")
        self.assertTrue(forbidden.authentication_failed)
        self.assertEqual(forbidden.state, "UNKNOWN")
        self.assertEqual((limited.error, limited.retry_after), ("http_429", 4.0))
        self.assertEqual(failure.error, "http_503")
        self.assertEqual(failure.retry_after, 7.0)

    def test_total_timeout_covers_an_async_response_handler(self):
        async def delayed_handler(_request):
            await asyncio.sleep(0.02)
            return httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"device_code": "ESP32-001", "status": "ACTIVE"},
            )

        # MockTransportはHTTPXのtimeoutを強制しないため、asyncio.timeoutを
        # 外すとACTIVEになり、この検証が失敗する。
        with patch.object(device, "TOTAL_TIMEOUT", 0.01):
            result = self.lookup(delayed_handler)

        self.assertEqual((result.state, result.error), ("UNKNOWN", "timeout"))

    def test_maintenance_is_normalized_to_inactive(self):
        result = self.lookup(
            lambda _request: httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"device_code": "ESP32-001", "status": "MAINTENANCE"},
            )
        )

        self.assertEqual(result.state, "INACTIVE")

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
