from datetime import datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, select
from sqlalchemy.orm import Session

from app.applications.events import record_created_event, record_status_changed_event
from app.applications.query import list_applications_page
from app.auth.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.application import ApplicationStatus, JobApplication
from app.models.event import ApplicationEvent
from app.models.user import User
from app.schemas.application import (
    JobApplicationCreate,
    JobApplicationListResponse,
    JobApplicationResponse,
    JobApplicationUpdate,
)
from app.schemas.event import ApplicationEventListResponse


router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


def _get_owned_application(
    db: Session,
    *,
    application_id: int,
    user_id: int,
) -> JobApplication:
    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == user_id,
        )
    )
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return application


@router.post(
    "",
    response_model=JobApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: JobApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    application = JobApplication(
        user_id=current_user.id,
        company=payload.company,
        position=payload.position,
        job_url=payload.job_url,
        status=payload.status,
        location=payload.location,
        salary=payload.salary,
        applied_at=payload.applied_at,
        deadline=payload.deadline,
        notes=payload.notes,
    )
    db.add(application)
    db.flush()
    record_created_event(db, application)
    db.commit()
    db.refresh(application)
    return application


@router.get("", response_model=JobApplicationListResponse)
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search: Annotated[str | None, Query(max_length=255)] = None,
    status_filter: Annotated[
        ApplicationStatus | None,
        Query(alias="status"),
    ] = None,
    location: Annotated[str | None, Query(max_length=255)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Literal[
        "created_at",
        "deadline",
        "company",
        "position",
        "status",
    ] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
) -> JobApplicationListResponse:
    items, total, pages = list_applications_page(
        db,
        user_id=current_user.id,
        search=search,
        status=status_filter,
        location=location,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return JobApplicationListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=pages,
    )


@router.get(
    "/{application_id}/events",
    response_model=ApplicationEventListResponse,
)
def list_application_events(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationEventListResponse:
    application = _get_owned_application(
        db,
        application_id=application_id,
        user_id=current_user.id,
    )

    events = list(
        db.scalars(
            select(ApplicationEvent)
            .where(ApplicationEvent.application_id == application.id)
            .order_by(
                asc(ApplicationEvent.occurred_at),
                asc(ApplicationEvent.id),
            )
        ).all()
    )
    return ApplicationEventListResponse(items=events)


@router.get("/{application_id}", response_model=JobApplicationResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    return _get_owned_application(
        db,
        application_id=application_id,
        user_id=current_user.id,
    )


@router.patch("/{application_id}", response_model=JobApplicationResponse)
def update_application(
    application_id: int,
    payload: JobApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    application = _get_owned_application(
        db,
        application_id=application_id,
        user_id=current_user.id,
    )

    previous_status = application.status
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(application, field, value)

    application.updated_at = datetime.now(timezone.utc)

    if "status" in updates and updates["status"] != previous_status:
        record_status_changed_event(
            db,
            application,
            from_status=previous_status,
            to_status=updates["status"],
        )

    db.commit()
    db.refresh(application)
    return application


@router.delete(
    "/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    application = _get_owned_application(
        db,
        application_id=application_id,
        user_id=current_user.id,
    )
    db.delete(application)
    db.commit()
