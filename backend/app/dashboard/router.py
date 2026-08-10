from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.dashboard.service import get_dashboard_stats, get_upcoming_deadlines
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse, UpcomingDeadlinesResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def read_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    return get_dashboard_stats(db, user_id=current_user.id)


@router.get("/upcoming", response_model=UpcomingDeadlinesResponse)
def read_upcoming_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> UpcomingDeadlinesResponse:
    return get_upcoming_deadlines(
        db,
        user_id=current_user.id,
        limit=limit,
    )
