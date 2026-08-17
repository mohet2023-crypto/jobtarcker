from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ProviderFetchResult:
    jobs: list[dict[str, Any]]
    total_available: int | None = None


class JobProvider(ABC):
    """Fetches raw job records from an external provider."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Short source identifier stored on DiscoveredJob.source."""

    @abstractmethod
    def fetch_jobs(self, *, max_pages: int) -> ProviderFetchResult:
        """Fetch up to max_pages of provider records."""
