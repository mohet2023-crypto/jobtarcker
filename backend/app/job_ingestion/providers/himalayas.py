from __future__ import annotations

import time
from typing import Any

import httpx

from app.job_ingestion.providers.base import JobProvider, ProviderFetchResult

DEFAULT_HIMALAYAS_API_URL = "https://himalayas.app/jobs/api"
HIMALAYAS_PAGE_SIZE = 20
HIMALAYAS_REQUEST_DELAY_SECONDS = 0.6


class HimalayasProviderError(RuntimeError):
    """Raised when the Himalayas API cannot be used."""


class HimalayasProvider(JobProvider):
    """Official Himalayas browse API (remote jobs feed)."""

    def __init__(
        self,
        *,
        client: httpx.Client | None = None,
        api_url: str = DEFAULT_HIMALAYAS_API_URL,
        request_delay_seconds: float = HIMALAYAS_REQUEST_DELAY_SECONDS,
    ) -> None:
        self._api_url = api_url.rstrip("/")
        self._request_delay_seconds = request_delay_seconds
        self._owns_client = client is None
        self._client = client or httpx.Client(timeout=30.0)

    @property
    def provider_name(self) -> str:
        return "himalayas"

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> HimalayasProvider:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def fetch_jobs(self, *, max_pages: int) -> ProviderFetchResult:
        if max_pages < 1:
            return ProviderFetchResult(jobs=[], total_available=0)

        collected: list[dict[str, Any]] = []
        offset = 0
        total_available: int | None = None

        for page_index in range(max_pages):
            if page_index > 0:
                time.sleep(self._request_delay_seconds)

            payload = self._fetch_page(offset=offset, limit=HIMALAYAS_PAGE_SIZE)
            if total_available is None:
                total_available = int(payload.get("totalCount") or 0)

            batch = payload.get("jobs") or []
            if not isinstance(batch, list):
                raise HimalayasProviderError("Himalayas API returned an invalid jobs array.")

            collected.extend(job for job in batch if isinstance(job, dict))

            if len(batch) < HIMALAYAS_PAGE_SIZE:
                break
            offset += HIMALAYAS_PAGE_SIZE
            if total_available is not None and offset >= total_available:
                break

        return ProviderFetchResult(jobs=collected, total_available=total_available)

    def _fetch_page(self, *, offset: int, limit: int) -> dict[str, Any]:
        response = self._client.get(
            self._api_url,
            params={"offset": offset, "limit": limit},
        )

        if response.status_code == 429:
            raise HimalayasProviderError(
                "Himalayas API rate limit exceeded (429). Retry later."
            )
        if response.status_code >= 400:
            raise HimalayasProviderError(
                f"Himalayas API request failed with status {response.status_code}."
            )

        data = response.json()
        if not isinstance(data, dict):
            raise HimalayasProviderError("Himalayas API returned invalid JSON.")

        return data
