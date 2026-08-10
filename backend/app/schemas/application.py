from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.application import ApplicationStatus


class JobApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=255)
    position: str = Field(min_length=1, max_length=255)
    job_url: str | None = Field(default=None, max_length=2048)
    status: ApplicationStatus = ApplicationStatus.SAVED
    location: str | None = Field(default=None, max_length=255)
    salary: str | None = Field(default=None, max_length=100)
    applied_at: datetime | None = None
    deadline: datetime | None = None
    notes: str | None = None


class JobApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=255)
    position: str | None = Field(default=None, min_length=1, max_length=255)
    job_url: str | None = Field(default=None, max_length=2048)
    status: ApplicationStatus | None = None
    location: str | None = Field(default=None, max_length=255)
    salary: str | None = Field(default=None, max_length=100)
    applied_at: datetime | None = None
    deadline: datetime | None = None
    notes: str | None = None


class JobApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company: str
    position: str
    job_url: str | None
    status: ApplicationStatus
    location: str | None
    salary: str | None
    applied_at: datetime | None
    deadline: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class JobApplicationListResponse(BaseModel):
    items: list[JobApplicationResponse]
    page: int
    page_size: int
    total: int
    pages: int
