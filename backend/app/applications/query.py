from math import ceil
from typing import Literal

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.application import ApplicationStatus, JobApplication

SortBy = Literal["created_at", "deadline", "company", "position", "status"]
SortOrder = Literal["asc", "desc"]

SORT_COLUMNS = {
    "created_at": JobApplication.created_at,
    "deadline": JobApplication.deadline,
    "company": JobApplication.company,
    "position": JobApplication.position,
    "status": JobApplication.status,
}


def build_owned_applications_query(
    user_id: int,
    *,
    search: str | None = None,
    status: ApplicationStatus | None = None,
    location: str | None = None,
) -> Select[tuple[JobApplication]]:
    """Build a query scoped to one user, with optional search/filters."""
    stmt = select(JobApplication).where(JobApplication.user_id == user_id)

    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                JobApplication.company.ilike(pattern),
                JobApplication.position.ilike(pattern),
            )
        )

    if status is not None:
        stmt = stmt.where(JobApplication.status == status)

    if location:
        stmt = stmt.where(JobApplication.location.ilike(f"%{location.strip()}%"))

    return stmt


def apply_sorting(
    stmt: Select[tuple[JobApplication]],
    *,
    sort_by: SortBy,
    sort_order: SortOrder,
) -> Select[tuple[JobApplication]]:
    column = SORT_COLUMNS[sort_by]
    if sort_order == "asc":
        return stmt.order_by(asc(column).nulls_last(), asc(JobApplication.id))
    return stmt.order_by(desc(column).nulls_last(), desc(JobApplication.id))


def list_applications_page(
    db: Session,
    *,
    user_id: int,
    search: str | None,
    status: ApplicationStatus | None,
    location: str | None,
    sort_by: SortBy,
    sort_order: SortOrder,
    page: int,
    page_size: int,
) -> tuple[list[JobApplication], int, int]:
    """Return (items, total, pages) using SQL-level filter/sort/pagination."""
    filtered = build_owned_applications_query(
        user_id,
        search=search,
        status=status,
        location=location,
    )

    total = db.scalar(select(func.count()).select_from(filtered.subquery())) or 0
    pages = 0 if total == 0 else ceil(total / page_size)

    stmt = apply_sorting(filtered, sort_by=sort_by, sort_order=sort_order)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(stmt).all())
    return items, total, pages
