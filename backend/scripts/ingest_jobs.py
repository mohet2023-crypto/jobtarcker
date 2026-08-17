"""Ingest discovered jobs from configured external providers."""

from __future__ import annotations

import argparse
import sys

from app.config import get_himalayas_api_url, get_himalayas_max_pages
from app.db.database import SessionLocal
from app.job_ingestion.providers.himalayas import HimalayasProvider
from app.job_ingestion.service import ingest_himalayas_jobs


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Ingest remote jobs from the Himalayas public API.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Browse API pages to fetch (20 jobs max per page). "
        "Defaults to HIMALAYAS_MAX_PAGES from the environment.",
    )
    parser.add_argument(
        "--provider",
        choices=["himalayas"],
        default="himalayas",
        help="Job provider to ingest (only himalayas is supported).",
    )
    args = parser.parse_args(argv)

    max_pages = args.max_pages if args.max_pages is not None else get_himalayas_max_pages()

    db = SessionLocal()
    try:
        with HimalayasProvider(api_url=get_himalayas_api_url()) as provider:
            stats = ingest_himalayas_jobs(db, provider=provider, max_pages=max_pages)
    except Exception as exc:
        print(f"Ingestion failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(
        "Ingestion complete: "
        f"fetched={stats.fetched} "
        f"created={stats.created} "
        f"updated={stats.updated} "
        f"skipped={stats.skipped} "
        f"failed={stats.failed}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
