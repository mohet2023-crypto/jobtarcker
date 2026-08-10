from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus
from app.models.event import ApplicationEventType


class ApplicationEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: ApplicationEventType
    from_status: ApplicationStatus | None
    to_status: ApplicationStatus | None
    occurred_at: datetime
    notes: str | None


class ApplicationEventListResponse(BaseModel):
    items: list[ApplicationEventResponse]
