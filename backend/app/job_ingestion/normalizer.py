from __future__ import annotations

import re
from datetime import datetime, timezone
from html import unescape
from typing import Any

from app.models.discovered_job import DiscoveredJob, EligibilityStatus

HIMALAYAS_SOURCE = "himalayas"
_HTML_TAG_RE = re.compile(r"<[^>]+>")


class NormalizationError(ValueError):
    """Raised when a provider record cannot be normalized."""


def html_to_plain_text(value: str | None) -> str | None:
    if not value:
        return None
    text = _HTML_TAG_RE.sub(" ", value)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _truncate(value: str | None, max_length: int) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if len(trimmed) <= max_length:
        return trimmed
    return trimmed[: max_length - 1] + "…"


def _format_salary(job: dict[str, Any]) -> str | None:
    min_salary = job.get("minSalary")
    max_salary = job.get("maxSalary")
    if min_salary is None and max_salary is None:
        return None

    currency = (job.get("currency") or "").strip() or None
    period = (job.get("salaryPeriod") or "annual").strip().lower()

    def fmt_amount(amount: int | float) -> str:
        if isinstance(amount, float) and amount.is_integer():
            amount = int(amount)
        return f"{amount:,}"

    period_label = {
        "hourly": "/hr",
        "weekly": "/wk",
        "fortnightly": "/fortnight",
        "monthly": "/mo",
        "annual": "/yr",
    }.get(period, f"/{period}")

    prefix = f"{currency} " if currency else ""

    if min_salary is not None and max_salary is not None:
        return _truncate(
            f"{prefix}{fmt_amount(min_salary)}–{fmt_amount(max_salary)}{period_label}",
            100,
        )
    if min_salary is not None:
        return _truncate(f"{prefix}{fmt_amount(min_salary)}+{period_label}", 100)
    if max_salary is not None:
        return _truncate(f"Up to {prefix}{fmt_amount(max_salary)}{period_label}", 100)
    return None


def _format_location_restrictions(job: dict[str, Any]) -> tuple[str | None, EligibilityStatus]:
    restrictions = job.get("locationRestrictions")
    if not isinstance(restrictions, list) or len(restrictions) == 0:
        return "Worldwide", EligibilityStatus.YES

    names: list[str] = []
    for entry in restrictions:
        if isinstance(entry, dict):
            name = entry.get("name") or entry.get("alpha2")
            if name:
                names.append(str(name).strip())

    if not names:
        return None, EligibilityStatus.UNKNOWN

    location = _truncate(", ".join(names), 255)
    return location, EligibilityStatus.NO


def _format_seniority(job: dict[str, Any]) -> str | None:
    seniority = job.get("seniority")
    if isinstance(seniority, list):
        values = [str(item).strip() for item in seniority if str(item).strip()]
        return _truncate(", ".join(values), 100)
    if isinstance(seniority, str) and seniority.strip():
        return _truncate(seniority.strip(), 100)
    return None


def _format_skills(job: dict[str, Any]) -> str | None:
    categories = job.get("categories")
    if not isinstance(categories, list):
        return None
    values = [str(item).strip() for item in categories if str(item).strip()]
    if not values:
        return None
    return _truncate(", ".join(values), 2000)


def _parse_discovered_at(job: dict[str, Any]) -> datetime:
    pub_date = job.get("pubDate")
    if isinstance(pub_date, (int, float)):
        seconds = pub_date / 1000 if pub_date > 10_000_000_000 else pub_date
        return datetime.fromtimestamp(seconds, tz=timezone.utc)
    if isinstance(pub_date, str) and pub_date.strip():
        parsed = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    return datetime.now(timezone.utc)


def normalize_himalayas_job(job: dict[str, Any]) -> DiscoveredJob:
    guid = job.get("guid")
    if not guid or not str(guid).strip():
        raise NormalizationError("Himalayas job is missing guid.")

    title = job.get("title")
    company = job.get("companyName")
    if not title or not str(title).strip():
        raise NormalizationError("Himalayas job is missing title.")
    if not company or not str(company).strip():
        raise NormalizationError("Himalayas job is missing companyName.")

    location, international_status = _format_location_restrictions(job)

    employment_type = job.get("employmentType")
    employment_type_str = (
        _truncate(str(employment_type), 50) if employment_type else None
    )

    description = html_to_plain_text(job.get("description") or job.get("excerpt"))

    application_link = job.get("applicationLink")
    source_url = (
        str(application_link).strip()
        if application_link and str(application_link).strip()
        else None
    )

    return DiscoveredJob(
        title=_truncate(str(title).strip(), 255) or str(title).strip(),
        company=_truncate(str(company).strip(), 255) or str(company).strip(),
        location=location,
        description=description,
        employment_type=employment_type_str,
        source=HIMALAYAS_SOURCE,
        external_job_id=_truncate(str(guid).strip(), 255),
        source_url=_truncate(source_url, 2048) if source_url else None,
        remote_status=EligibilityStatus.YES,
        visa_sponsorship_status=EligibilityStatus.UNKNOWN,
        relocation_status=EligibilityStatus.UNKNOWN,
        international_eligibility_status=international_status,
        discovered_at=_parse_discovered_at(job),
        salary=_format_salary(job),
        experience_level=_format_seniority(job),
        skills=_format_skills(job),
    )
