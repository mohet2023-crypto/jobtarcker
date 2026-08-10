from datetime import datetime, timedelta, timezone

from sqlalchemy import asc, func, select
from sqlalchemy.orm import Session

from app.models.application import ApplicationStatus, JobApplication
from app.schemas.dashboard import (
    DashboardResponse,
    StatusCounts,
    UpcomingApplicationItem,
    UpcomingDeadlinesResponse,
    empty_status_counts,
)


def get_utc_now() -> datetime:
    """Return the current time in UTC (patchable in tests)."""
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    """Normalize datetimes to UTC; treat naive values as already-UTC (SQLite)."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def calendar_days_remaining(deadline: datetime, now: datetime) -> int:
    """UTC calendar-day difference between now and deadline (not hour flooring)."""
    deadline_utc = _as_utc(deadline)
    now_utc = _as_utc(now)
    return (deadline_utc.date() - now_utc.date()).days


def utc_week_start(now: datetime) -> datetime:
    """Monday 00:00:00 UTC of the ISO calendar week containing `now`."""
    now = now.astimezone(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def utc_month_start(now: datetime) -> datetime:
    """First day of the calendar month containing `now`, at 00:00:00 UTC."""
    now = now.astimezone(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_dashboard_stats(
    db: Session,
    *,
    user_id: int,
    now: datetime | None = None,
) -> DashboardResponse:
    """Aggregate dashboard stats in SQL, scoped to one user.

    Week/month boundaries use UTC:
    - week: Monday 00:00 UTC through now
    - month: 1st of month 00:00 UTC through now
    """
    current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    week_start = utc_week_start(current)
    month_start = utc_month_start(current)

    owned = JobApplication.user_id == user_id

    total = db.scalar(
        select(func.count()).select_from(JobApplication).where(owned)
    ) or 0

    status_rows = db.execute(
        select(JobApplication.status, func.count())
        .where(owned)
        .group_by(JobApplication.status)
    ).all()

    by_status = empty_status_counts()
    for status, count in status_rows:
        key = status.value if isinstance(status, ApplicationStatus) else str(status)
        by_status[key] = count

    applications_this_week = db.scalar(
        select(func.count())
        .select_from(JobApplication)
        .where(owned, JobApplication.created_at >= week_start)
    ) or 0

    applications_this_month = db.scalar(
        select(func.count())
        .select_from(JobApplication)
        .where(owned, JobApplication.created_at >= month_start)
    ) or 0

    return DashboardResponse(
        total_applications=total,
        by_status=StatusCounts(**by_status),
        applications_this_week=applications_this_week,
        applications_this_month=applications_this_month,
    )


def get_upcoming_deadlines(
    db: Session,
    *,
    user_id: int,
    limit: int = 10,
    now: datetime | None = None,
) -> UpcomingDeadlinesResponse:
    """Return the nearest upcoming deadlines for one user.

    SQL filters ownership, non-null deadlines, and deadline >= now,
    then orders by deadline ASC and applies LIMIT. `days_remaining`
    is computed in Python for the limited rows only.
    """
    current = (now or get_utc_now()).astimezone(timezone.utc)

    stmt = (
        select(JobApplication)
        .where(
            JobApplication.user_id == user_id,
            JobApplication.deadline.is_not(None),
            JobApplication.deadline >= current,
        )
        .order_by(asc(JobApplication.deadline), asc(JobApplication.id))
        .limit(limit)
    )
    rows = list(db.scalars(stmt).all())

    items = [
        UpcomingApplicationItem(
            id=row.id,
            company=row.company,
            position=row.position,
            deadline=row.deadline,
            days_remaining=calendar_days_remaining(row.deadline, current),
        )
        for row in rows
    ]
    return UpcomingDeadlinesResponse(items=items)
