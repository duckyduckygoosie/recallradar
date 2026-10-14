from __future__ import annotations

import re
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .analytics import compare_products, event_analytics
from .database import get_db
from .ingestion import search_records
from .models import Record, SourceStatus
from .persistence import RECORD_TYPES, as_utc, latest_retrieved_at
from .schemas import AnalyticsResponse, CompareResponse, HealthResponse, RecordDetail, SearchResponse

router = APIRouter(prefix="/api/v1")
API_RECORD_TYPES = {"events": "event", "recalls": "recall", "enforcement": "enforcement", "classification": "classification"}


def item_dict(record: Record) -> dict:
    return {
        "id": record.id,
        "record_type": API_RECORD_TYPES[record.record_type],
        "title": record.title,
        "manufacturer": record.manufacturer,
        "product_code": record.product_code,
        "device_name": record.device_name,
        "specialty": record.specialty,
        "date": record.date,
        "summary": record.summary,
        "source_url": record.source_url,
        "retrieved_at": as_utc(record.retrieved_at),
        "failure_category": record.failure_category,
        "confidence": record.confidence,
    }


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(select(1))
    except Exception:
        return {
            "status": "degraded",
            "database": "error",
            "mode": "live",
            "sources": {
                name: {"count": 0, "last_retrieved_at": None, "status": "unavailable", "error": None, "last_updated": None}
                for name in RECORD_TYPES
            },
            "warnings": ["Database unavailable; source freshness cannot be read."],
        }

    sources = {}
    warnings = []
    for name in RECORD_TYPES:
        status = db.get(SourceStatus, name)
        source = {
            "count": status.count if status else 0,
            "last_retrieved_at": as_utc(status.last_retrieved_at) if status else None,
            "status": status.status if status else "never",
            "error": status.error if status else None,
            "last_updated": status.last_updated if status else None,
        }
        sources[name] = source
        if status and status.error:
            warnings.append(f"{name}: {status.error}")
    return {"status": "ok", "database": "ok", "mode": "live", "sources": sources, "warnings": warnings}


@router.get("/search", response_model=SearchResponse)
async def search(
    query: Annotated[str | None, Query(max_length=200)] = None,
    record_type: Annotated[str, Query(pattern="^(all|events|recalls|enforcement|classification)$")] = "all",
    product_code: Annotated[str | None, Query(max_length=32)] = None,
    manufacturer: Annotated[str | None, Query(max_length=200)] = None,
    specialty: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 50,
    offset: Annotated[int, Query(ge=0, le=25_000)] = 0,
    db: Session = Depends(get_db),
):
    names = RECORD_TYPES if record_type == "all" else (record_type,)
    combined = []
    warnings = []
    for name in names:
        rows, _, error = await search_records(
            db, name, query, product_code, manufacturer, specialty, limit, offset=offset
        )
        combined.extend(rows)
        if error:
            warnings.append(f"{name}: {error}")

    combined.sort(key=lambda row: (row.date or "", row.id), reverse=True)
    selected = combined[offset : offset + limit]
    filter_scope = ", ".join(
        f"{name}={value}"
        for name, value in (
            ("query", query),
            ("product_code", product_code),
            ("manufacturer", manufacturer),
            ("specialty", specialty),
        )
        if value
    ) or "no search filters"
    return {
        "items": [item_dict(record) for record in selected],
        "total": len(combined),
        "scope": f"Cached normalized FDA records ({', '.join(names)}); {filter_scope}. This bounded local cache is not the total FDA dataset.",
        "retrieved_at": max(
            (as_utc(record.retrieved_at) for record in selected),
            default=latest_retrieved_at(db, tuple(names)),
        ),
        "mode": "live",
        "warnings": warnings,
    }


@router.get("/records/{record_type}/{record_id}", response_model=RecordDetail)
def detail(record_type: str, record_id: str, db: Session = Depends(get_db)):
    plural_type = {value: key for key, value in API_RECORD_TYPES.items()}.get(record_type)
    if plural_type is None:
        raise HTTPException(status_code=404, detail="Record not found")
    record = db.get(Record, record_id)
    if record is None or record.record_type != plural_type:
        raise HTTPException(status_code=404, detail="Record not found")

    payload = item_dict(record)
    # source_data is an allowlist and excludes patient, narrative, reporter, and contact attributes.
    payload.update(record.source_data or {})
    if record.record_type in ("recalls", "enforcement"):
        payload["failure_analysis"] = {
            "category": record.failure_category or "Unknown",
            "confidence": record.confidence or 0.0,
            "matched_terms": record.matched_terms or [],
            "text": record.failure_text or "",
            "confidence_note": "Deterministic lexical match support, not a probability or causal finding.",
        }
    else:
        payload["failure_analysis"] = None
    return payload


@router.get("/events/analytics", response_model=AnalyticsResponse)
def analytics(
    query: Annotated[str | None, Query(max_length=200)] = None,
    product_code: Annotated[str | None, Query(max_length=32)] = None,
    manufacturer: Annotated[str | None, Query(max_length=200)] = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be on or before end_date")
    result = event_analytics(db, query, product_code, manufacturer, start_date, end_date)
    result["retrieved_at"] = as_utc(result["retrieved_at"])
    return result


@router.get("/compare", response_model=CompareResponse)
async def compare(
    product_codes: Annotated[str, Query(min_length=1, max_length=100)],
    db: Session = Depends(get_db),
):
    codes = list(dict.fromkeys(code.strip().upper() for code in re.split(r"[,;\s]+", product_codes) if code.strip()))
    if not codes or len(codes) > 3 or any(not re.fullmatch(r"[A-Z0-9-]{1,32}", code) for code in codes):
        raise HTTPException(status_code=422, detail="Provide one to three unique FDA product codes")

    warnings = []
    for code in codes:
        for record_type in ("events", "recalls", "classification"):
            _, _, error = await search_records(
                db, record_type, None, code, None, None, limit=100
            )
            if error:
                warnings.append(f"{record_type} ({code}): {error}")

    response = compare_products(db, codes)
    response["retrieved_at"] = as_utc(response["retrieved_at"])
    response["warnings"] = warnings
    return response
