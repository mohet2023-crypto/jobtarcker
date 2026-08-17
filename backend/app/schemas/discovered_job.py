from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.discovered_job import EligibilityStatus


class DiscoveredJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    company: str
    location: str | None
    description: str | None
    employment_type: str | None
    source: str
    source_url: str | None
    remote_status: EligibilityStatus
    visa_sponsorship_status: EligibilityStatus
    relocation_status: EligibilityStatus
    international_eligibility_status: EligibilityStatus
    discovered_at: datetime
    salary: str | None
    experience_level: str | None
    skills: str | None
    created_at: datetime
    updated_at: datetime


class DiscoveredJobListResponse(BaseModel):
    items: list[DiscoveredJobResponse]
    page: int
    page_size: int
    total: int
    pages: int
