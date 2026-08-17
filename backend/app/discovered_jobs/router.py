from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.dependencies import get_db
from app.discovered_jobs.query import list_discovered_jobs_page
from app.models.discovered_job import DiscoveredJob, EligibilityStatus
from app.models.user import User
from app.schemas.discovered_job import DiscoveredJobListResponse, DiscoveredJobResponse

router = APIRouter(prefix="/api/v1/discovered-jobs", tags=["discovered-jobs"])


def _get_discovered_job(db: Session, *, job_id: int) -> DiscoveredJob:
    job = db.scalar(select(DiscoveredJob).where(DiscoveredJob.id == job_id))
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discovered job not found",
        )
    return job


@router.get("", response_model=DiscoveredJobListResponse)
def list_discovered_jobs(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search: Annotated[str | None, Query(max_length=255)] = None,
    location: Annotated[str | None, Query(max_length=255)] = None,
    remote_status: Annotated[EligibilityStatus | None, Query()] = None,
    visa_sponsorship_status: Annotated[EligibilityStatus | None, Query()] = None,
    employment_type: Annotated[str | None, Query(max_length=50)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Literal["discovered_at", "company", "title"] = "discovered_at",
    sort_order: Literal["asc", "desc"] = "desc",
) -> DiscoveredJobListResponse:
    items, total, pages = list_discovered_jobs_page(
        db,
        search=search,
        location=location,
        remote_status=remote_status,
        visa_sponsorship_status=visa_sponsorship_status,
        employment_type=employment_type,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return DiscoveredJobListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=pages,
    )


@router.get("/{job_id}", response_model=DiscoveredJobResponse)
def get_discovered_job(
    job_id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DiscoveredJob:
    return _get_discovered_job(db, job_id=job_id)
