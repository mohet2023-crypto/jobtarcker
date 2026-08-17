from math import ceil
from typing import Literal

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.discovered_job import DiscoveredJob, EligibilityStatus

SortBy = Literal["discovered_at", "company", "title"]
SortOrder = Literal["asc", "desc"]

SORT_COLUMNS = {
    "discovered_at": DiscoveredJob.discovered_at,
    "company": DiscoveredJob.company,
    "title": DiscoveredJob.title,
}


def build_discovered_jobs_query(
    *,
    search: str | None = None,
    location: str | None = None,
    remote_status: EligibilityStatus | None = None,
    visa_sponsorship_status: EligibilityStatus | None = None,
    employment_type: str | None = None,
) -> Select[tuple[DiscoveredJob]]:
    stmt = select(DiscoveredJob)

    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                DiscoveredJob.company.ilike(pattern),
                DiscoveredJob.title.ilike(pattern),
            )
        )

    if location:
        stmt = stmt.where(DiscoveredJob.location.ilike(f"%{location.strip()}%"))

    if remote_status is not None:
        stmt = stmt.where(DiscoveredJob.remote_status == remote_status)

    if visa_sponsorship_status is not None:
        stmt = stmt.where(
            DiscoveredJob.visa_sponsorship_status == visa_sponsorship_status
        )

    if employment_type:
        stmt = stmt.where(
            DiscoveredJob.employment_type.ilike(f"%{employment_type.strip()}%")
        )

    return stmt


def apply_sorting(
    stmt: Select[tuple[DiscoveredJob]],
    *,
    sort_by: SortBy,
    sort_order: SortOrder,
) -> Select[tuple[DiscoveredJob]]:
    column = SORT_COLUMNS[sort_by]
    if sort_order == "asc":
        return stmt.order_by(asc(column).nulls_last(), asc(DiscoveredJob.id))
    return stmt.order_by(desc(column).nulls_last(), desc(DiscoveredJob.id))


def list_discovered_jobs_page(
    db: Session,
    *,
    search: str | None,
    location: str | None,
    remote_status: EligibilityStatus | None,
    visa_sponsorship_status: EligibilityStatus | None,
    employment_type: str | None,
    sort_by: SortBy,
    sort_order: SortOrder,
    page: int,
    page_size: int,
) -> tuple[list[DiscoveredJob], int, int]:
    filtered = build_discovered_jobs_query(
        search=search,
        location=location,
        remote_status=remote_status,
        visa_sponsorship_status=visa_sponsorship_status,
        employment_type=employment_type,
    )

    total = db.scalar(select(func.count()).select_from(filtered.subquery())) or 0
    pages = 0 if total == 0 else ceil(total / page_size)

    stmt = apply_sorting(filtered, sort_by=sort_by, sort_order=sort_order)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(stmt).all())
    return items, total, pages
