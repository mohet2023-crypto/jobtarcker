from datetime import datetime

from pydantic import BaseModel, Field

from app.models.application import ApplicationStatus


class StatusCounts(BaseModel):
    SAVED: int = 0
    APPLIED: int = 0
    SCREENING: int = 0
    INTERVIEW: int = 0
    OFFER: int = 0
    REJECTED: int = 0
    WITHDRAWN: int = 0


class DashboardResponse(BaseModel):
    """Dashboard statistics. Week/month windows are calculated in UTC."""

    total_applications: int = Field(ge=0)
    by_status: StatusCounts
    applications_this_week: int = Field(ge=0)
    applications_this_month: int = Field(ge=0)


class UpcomingApplicationItem(BaseModel):
    """Compact upcoming-deadline row for the dashboard.

    `days_remaining` is the difference in UTC calendar dates
    (deadline date minus today), not floored elapsed hours.
    """

    id: int
    company: str
    position: str
    deadline: datetime
    days_remaining: int = Field(ge=0)


class UpcomingDeadlinesResponse(BaseModel):
    items: list[UpcomingApplicationItem]


def empty_status_counts() -> dict[str, int]:
    return {status.value: 0 for status in ApplicationStatus}
