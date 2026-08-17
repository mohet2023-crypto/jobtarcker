from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.job_ingestion.normalizer import NormalizationError, normalize_himalayas_job
from app.job_ingestion.providers.base import JobProvider
from app.job_ingestion.providers.himalayas import HimalayasProvider
from app.models.discovered_job import DiscoveredJob


@dataclass(frozen=True)
class IngestionStats:
    fetched: int
    created: int
    updated: int
    skipped: int
    failed: int


def ingest_himalayas_jobs(
    db: Session,
    *,
    provider: JobProvider | None = None,
    max_pages: int = 1,
) -> IngestionStats:
    """Fetch Himalayas jobs and upsert into discovered_jobs."""

    owns_provider = provider is None
    active_provider = provider or HimalayasProvider()

    try:
        if active_provider.provider_name != "himalayas":
            raise ValueError("Only the himalayas provider is supported in this step.")

        result = active_provider.fetch_jobs(max_pages=max_pages)
        created = 0
        updated = 0
        skipped = 0
        failed = 0

        for raw_job in result.jobs:
            try:
                normalized = normalize_himalayas_job(raw_job)
            except NormalizationError:
                skipped += 1
                continue
            except (TypeError, ValueError):
                failed += 1
                continue

            outcome = _upsert_discovered_job(db, normalized)
            if outcome == "created":
                created += 1
            elif outcome == "updated":
                updated += 1
            else:
                skipped += 1

        db.commit()
        return IngestionStats(
            fetched=len(result.jobs),
            created=created,
            updated=updated,
            skipped=skipped,
            failed=failed,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        if owns_provider and isinstance(active_provider, HimalayasProvider):
            active_provider.close()


def _upsert_discovered_job(db: Session, job: DiscoveredJob) -> str:
    if not job.external_job_id:
        raise NormalizationError("external_job_id is required for upsert.")

    existing = db.scalar(
        select(DiscoveredJob).where(
            DiscoveredJob.source == job.source,
            DiscoveredJob.external_job_id == job.external_job_id,
        )
    )

    now = datetime.now(timezone.utc)

    if existing is None:
        db.add(job)
        db.flush()
        return "created"

    existing.title = job.title
    existing.company = job.company
    existing.location = job.location
    existing.description = job.description
    existing.employment_type = job.employment_type
    existing.source_url = job.source_url
    existing.remote_status = job.remote_status
    existing.visa_sponsorship_status = job.visa_sponsorship_status
    existing.relocation_status = job.relocation_status
    existing.international_eligibility_status = job.international_eligibility_status
    existing.discovered_at = job.discovered_at
    existing.salary = job.salary
    existing.experience_level = job.experience_level
    existing.skills = job.skills
    existing.updated_at = now
    db.flush()
    return "updated"
