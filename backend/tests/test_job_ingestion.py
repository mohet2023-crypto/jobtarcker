import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.job_ingestion.normalizer import NormalizationError, normalize_himalayas_job
from app.job_ingestion.providers.base import ProviderFetchResult
from app.job_ingestion.providers.himalayas import HimalayasProvider, HimalayasProviderError
from app.job_ingestion.service import ingest_himalayas_jobs
from app.models.discovered_job import DiscoveredJob, EligibilityStatus

FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "himalayas_browse_sample.json"


@pytest.fixture()
def himalayas_sample_payload() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


@pytest.fixture()
def himalayas_worldwide_job(himalayas_sample_payload: dict) -> dict:
    return himalayas_sample_payload["jobs"][0]


@pytest.fixture()
def himalayas_restricted_job(himalayas_sample_payload: dict) -> dict:
    return himalayas_sample_payload["jobs"][1]


def test_normalize_worldwide_remote_job(himalayas_worldwide_job: dict) -> None:
    job = normalize_himalayas_job(himalayas_worldwide_job)

    assert job.title == "Senior Software Engineer"
    assert job.company == "Acme Remote"
    assert job.source == "himalayas"
    assert job.external_job_id == "himalayas-job-guid-001"
    assert job.remote_status == EligibilityStatus.YES
    assert job.international_eligibility_status == EligibilityStatus.YES
    assert job.visa_sponsorship_status == EligibilityStatus.UNKNOWN
    assert job.relocation_status == EligibilityStatus.UNKNOWN
    assert job.location == "Worldwide"
    assert job.employment_type == "Full Time"
    assert job.salary is not None and "USD" in job.salary
    assert job.experience_level == "Senior"
    assert job.skills == "Engineering, Backend"
    assert job.source_url is not None
    assert "himalayas.app" in job.source_url


def test_normalize_country_restricted_job(himalayas_restricted_job: dict) -> None:
    job = normalize_himalayas_job(himalayas_restricted_job)

    assert job.international_eligibility_status == EligibilityStatus.NO
    assert job.location == "United States"
    assert job.visa_sponsorship_status == EligibilityStatus.UNKNOWN
    assert job.salary is None


def test_normalize_missing_optional_fields() -> None:
    job = normalize_himalayas_job(
        {
            "guid": "minimal-guid",
            "title": "Support Specialist",
            "companyName": "Helpful Inc",
            "locationRestrictions": [],
            "pubDate": 1700000000000,
        }
    )

    assert job.description is None
    assert job.salary is None
    assert job.skills is None
    assert job.experience_level is None
    assert job.source_url is None


def test_normalize_requires_guid() -> None:
    with pytest.raises(NormalizationError):
        normalize_himalayas_job({"title": "X", "companyName": "Y"})


def test_normalize_unknown_eligibility_when_restrictions_unparseable() -> None:
    job = normalize_himalayas_job(
        {
            "guid": "guid-unknown-loc",
            "title": "Analyst",
            "companyName": "Corp",
            "locationRestrictions": [{}],
            "pubDate": 1700000000000,
        }
    )

    assert job.international_eligibility_status == EligibilityStatus.UNKNOWN
    assert job.location is None


def test_ingest_creates_jobs(db_session: Session, himalayas_sample_payload: dict) -> None:
    provider = MagicMock()
    provider.provider_name = "himalayas"
    provider.fetch_jobs.return_value = ProviderFetchResult(
        jobs=himalayas_sample_payload["jobs"],
        total_available=2,
    )

    stats = ingest_himalayas_jobs(db_session, provider=provider, max_pages=1)

    assert stats.fetched == 2
    assert stats.created == 2
    assert stats.updated == 0
    assert stats.failed == 0

    total = db_session.scalar(select(func.count()).select_from(DiscoveredJob)) or 0
    assert total == 2


def test_ingest_upsert_does_not_duplicate(
    db_session: Session,
    himalayas_worldwide_job: dict,
) -> None:
    provider = MagicMock()
    provider.provider_name = "himalayas"
    provider.fetch_jobs.return_value = ProviderFetchResult(
        jobs=[himalayas_worldwide_job],
        total_available=1,
    )

    first = ingest_himalayas_jobs(db_session, provider=provider, max_pages=1)
    second = ingest_himalayas_jobs(db_session, provider=provider, max_pages=1)

    assert first.created == 1
    assert second.created == 0
    assert second.updated == 1

    total = db_session.scalar(select(func.count()).select_from(DiscoveredJob)) or 0
    assert total == 1


def test_ingest_skips_invalid_records(db_session: Session) -> None:
    provider = MagicMock()
    provider.provider_name = "himalayas"
    provider.fetch_jobs.return_value = ProviderFetchResult(
        jobs=[{"title": "Missing guid", "companyName": "X"}],
        total_available=1,
    )

    stats = ingest_himalayas_jobs(db_session, provider=provider, max_pages=1)

    assert stats.skipped == 1
    assert stats.created == 0


def test_himalayas_provider_handles_api_error() -> None:
    client = MagicMock()
    response = MagicMock()
    response.status_code = 503
    client.get.return_value = response

    provider = HimalayasProvider(client=client)

    with pytest.raises(HimalayasProviderError):
        provider.fetch_jobs(max_pages=1)


def test_himalayas_provider_pagination_respects_max_pages(
    himalayas_sample_payload: dict,
) -> None:
    client = MagicMock()

    def fake_get(url: str, params: dict) -> MagicMock:
        response = MagicMock()
        response.status_code = 200
        payload = dict(himalayas_sample_payload)
        payload["offset"] = params["offset"]
        payload["limit"] = params["limit"]
        payload["jobs"] = himalayas_sample_payload["jobs"]
        payload["totalCount"] = 40
        response.json.return_value = payload
        return response

    client.get.side_effect = fake_get

    provider = HimalayasProvider(client=client, request_delay_seconds=0)
    result = provider.fetch_jobs(max_pages=1)

    assert len(result.jobs) == 2
    assert client.get.call_count == 1
