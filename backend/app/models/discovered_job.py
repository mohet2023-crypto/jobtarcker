import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class EligibilityStatus(str, enum.Enum):
    """Tri-state eligibility for remote, visa, relocation, and international access."""

    UNKNOWN = "UNKNOWN"
    YES = "YES"
    NO = "NO"


eligibility_status_enum = Enum(
    EligibilityStatus,
    name="eligibility_status",
    native_enum=True,
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)


class DiscoveredJob(Base):
    """A job discovered from an external or curated source (not a user application)."""

    __tablename__ = "discovered_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255), index=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    employment_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source: Mapped[str] = mapped_column(String(100))
    source_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    remote_status: Mapped[EligibilityStatus] = mapped_column(
        eligibility_status_enum,
        default=EligibilityStatus.UNKNOWN,
    )
    visa_sponsorship_status: Mapped[EligibilityStatus] = mapped_column(
        eligibility_status_enum,
        default=EligibilityStatus.UNKNOWN,
    )
    relocation_status: Mapped[EligibilityStatus] = mapped_column(
        eligibility_status_enum,
        default=EligibilityStatus.UNKNOWN,
    )
    international_eligibility_status: Mapped[EligibilityStatus] = mapped_column(
        eligibility_status_enum,
        default=EligibilityStatus.UNKNOWN,
    )
    discovered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    salary: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    experience_level: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    skills: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
