"""Device API境界と有限キャッシュ。単一Pipeline Workerだけが所有する。"""

import asyncio
import json
import logging
import re
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from math import isfinite
from time import monotonic
from urllib.parse import quote

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)
POSITIVE_TTL = 30.0
NEGATIVE_TTL = 5.0
COOLDOWN = 5.0
TOTAL_TIMEOUT = 2.0
MAX_RESPONSE_BYTES = 64 * 1024
CACHE_CAPACITY = 128
CODE_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")


@dataclass(frozen=True, slots=True)
class DeviceLookup:
    state: str
    error: str | None = None
    retry_after: float = 0.0
    authentication_failed: bool = False


def retry_after_seconds(value: str | None) -> float:
    if not value:
        return 0.0
    try:
        if re.fullmatch(r"[0-9]+", value):
            delay = float(value)
        else:
            date = parsedate_to_datetime(value)
            if date.tzinfo is None:
                return 0.0
            delay = (date - datetime.now(UTC)).total_seconds()
        # オーバーフローを含む不正な値はcooldown既定値へ戻す。
        return max(0.0, delay) if isfinite(delay) else 0.0
    except (ValueError, TypeError, OverflowError):
        return 0.0


class DeviceApiClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.device_api_url or not settings.device_api_token:
            raise ValueError("Device API configuration is required")
        self.origin = settings.device_api_url.rstrip("/")
        self._token = settings.device_api_token
        self._client: httpx.AsyncClient | None = None

    async def lookup(self, code: str) -> DeviceLookup:
        if CODE_PATTERN.fullmatch(code) is None:
            return DeviceLookup("UNKNOWN", error="invalid_device_code")
        if self._client is None:
            self._client = httpx.AsyncClient(
                transport=httpx.AsyncHTTPTransport(retries=0),
                timeout=TOTAL_TIMEOUT,
                follow_redirects=False,
                trust_env=False,
                headers={"Authorization": f"Bearer {self._token}"},
            )
        url = f"{self.origin}/api/devices/by-code/{quote(code, safe='')}"
        try:
            # 個別read timeoutに加え、DNS・TLS・本文受信を含む全体deadline。
            async with asyncio.timeout(TOTAL_TIMEOUT):
                async with self._client.stream("GET", url) as response:
                    status = response.status_code
                    if status in (401, 403):
                        return DeviceLookup(
                            "UNKNOWN",
                            error="authentication",
                            authentication_failed=True,
                        )
                    if status not in (200, 404):
                        return DeviceLookup(
                            "UNKNOWN",
                            error=f"http_{status}",
                            retry_after=retry_after_seconds(
                                response.headers.get("Retry-After")
                            ),
                        )
                    if (
                        response.headers.get("content-type", "")
                        .split(";")[0]
                        .strip()
                        .lower()
                        != "application/json"
                    ):
                        return DeviceLookup("UNKNOWN", error="response_content_type")
                    body = bytearray()
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        body.extend(chunk)
                        if len(body) > MAX_RESPONSE_BYTES:
                            return DeviceLookup("UNKNOWN", error="response_size")
                    data = json.loads(body)
                    if type(data) is not dict:
                        return DeviceLookup("UNKNOWN", error="response_schema")
                    if status == 404:
                        if data.get("code") == "NOT_FOUND" and isinstance(
                            data.get("message"), str
                        ):
                            return DeviceLookup("NOT_FOUND")
                        return DeviceLookup(
                            "UNKNOWN", error="response_not_found_schema"
                        )
                    state = data.get("status")
                    if data.get("device_code") != code or state not in (
                        "ACTIVE",
                        "INACTIVE",
                        "MAINTENANCE",
                    ):
                        return DeviceLookup(
                            "UNKNOWN", error="response_device_or_status"
                        )
                    return DeviceLookup("INACTIVE" if state == "MAINTENANCE" else state)
        except (TimeoutError, httpx.TimeoutException):
            return DeviceLookup("UNKNOWN", error="timeout")
        except httpx.HTTPError:
            return DeviceLookup("UNKNOWN", error="transport")
        except (ValueError, UnicodeError, RecursionError):
            return DeviceLookup("UNKNOWN", error="response_json")

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None


@dataclass(frozen=True, slots=True)
class CacheEntry:
    state: str
    expires_at: float


class DeviceManager:
    def __init__(
        self,
        client: DeviceApiClient,
        on_reset: Callable[[str | None, str], None],
    ) -> None:
        self.client = client
        self.on_reset = on_reset
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.runner: asyncio.Runner | None = None
        self.degraded = False
        self.authentication_stopped = False
        self.retry_at = 0.0
        self.requests = 0
        self.cache_hits = 0
        self.api_errors = 0

    def expire(self) -> None:
        now = monotonic()
        for code, entry in list(self.cache.items()):
            if now >= entry.expires_at:
                del self.cache[code]
                self.on_reset(code, "cache_expired")

    def resolve(self, code: str) -> str:
        self.expire()
        if self.authentication_stopped or CODE_PATTERN.fullmatch(code) is None:
            return "UNKNOWN"
        entry = self.cache.get(code)
        if entry is not None:
            self.cache.move_to_end(code)
            self.cache_hits += 1
            return entry.state
        if monotonic() < self.retry_at:
            return "UNKNOWN"
        if self.runner is None:
            self.runner = asyncio.Runner()
        self.requests += 1
        result = self.runner.run(self.client.lookup(code))
        now = monotonic()
        if result.error:
            self.api_errors += 1
            self.degraded = True
            if result.authentication_failed:
                self.authentication_stopped = True
                self.cache.clear()
                self.on_reset(None, "authentication_failed")
                logger.error("DEVICE_API_AUTHENTICATION_FAILED")
            else:
                self.retry_at = now + max(COOLDOWN, result.retry_after)
                self.on_reset(code, "api_failure")
                logger.warning("DEVICE_API_FAILED reason=%s", result.error)
            return "UNKNOWN"
        if self.degraded:
            logger.info("DEVICE_API_RECOVERED")
        self.degraded = False
        self.retry_at = 0.0
        self.expire()
        if len(self.cache) >= CACHE_CAPACITY:
            evicted, _ = self.cache.popitem(last=False)
            self.on_reset(evicted, "cache_evicted")
        ttl = NEGATIVE_TTL if result.state == "NOT_FOUND" else POSITIVE_TTL
        self.cache[code] = CacheEntry(result.state, now + ttl)
        # 新規/再登場のACTIVEも過去の連続区間を再使用しない。
        self.on_reset(code, "device_state_refreshed")
        logger.info("DEVICE_STATE_RESOLVED state=%s", result.state)
        return result.state

    def snapshot(self) -> dict:
        """Workerが呼び、healthへ渡す値だけをコピーする。"""
        return {
            "configured": True,
            "degraded": self.degraded,
            "authentication_stopped": self.authentication_stopped,
            "cache_size": len(self.cache),
            "requests": self.requests,
            "cache_hits": self.cache_hits,
            "errors": self.api_errors,
        }

    def close(self) -> None:
        if self.runner is not None:
            try:
                self.runner.run(self.client.close())
            finally:
                self.runner.close()
                self.runner = None
