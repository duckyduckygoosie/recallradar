from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Record, SourceStatus
from .normalization import normalize_record

RECORD_TYPES = ("events", "recalls", "enforcement", "classification")


def get_status(db: Session, record_type: str) -> SourceStatus:
    status = db.get(SourceStatus, record_type)
    if status is None:
        status = SourceStatus(record_type=record_type, count=0, status="never")
        db.add(status)
        db.flush()
    return status


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def latest_retrieved_at(db: Session, record_types: tuple[str, ...]) -> datetime | None:
    timestamps = [
        as_utc(status.last_retrieved_at)
        for record_type in record_types
        if (status := db.get(SourceStatus, record_type)) is not None and status.last_retrieved_at is not None
    ]
    return max(timestamps, default=None)



def cached_records(
    db: Session,
    record_type: str,
    query: str | None = None,
    product_code: str | None = None,
    manufacturer: str | None = None,
    specialty: str | None = None,
) -> list[Record]:
    statement = select(Record).where(Record.record_type == record_type)
    rows = db.scalars(statement.order_by(Record.date.desc().nullslast(), Record.id)).all()

    def matches(record: Record) -> bool:
        data = record.source_data or {}
        devices = data.get("device", [])
        device_values = [device for device in devices if isinstance(device, dict)] if isinstance(devices, list) else []
        if product_code:
            codes = {record.product_code.casefold()} if record.product_code else set()
            codes.update((device.get("device_report_product_code") or "").casefold() for device in device_values)
            if product_code.strip().casefold() not in codes:
                return False
        if manufacturer:
            manufacturers = [record.manufacturer or "", str(data.get("recalling_firm") or "")]
            manufacturers.extend(device.get("manufacturer_d_name") or "" for device in device_values)
            if not any(manufacturer.casefold() in value.casefold() for value in manufacturers):
                return False
        if specialty:
            specialties = [record.specialty or ""]
            specialties.extend(device.get("medical_specialty_description") or "" for device in device_values)
            if not any(specialty.casefold() in value.casefold() for value in specialties):
                return False
        if query:
            searchable = " ".join((record.title or "", record.summary or "", *[str(value) for value in data.values()]))
            if query.casefold() not in searchable.casefold():
                return False
        return True

    return [record for record in rows if matches(record)]


def ingest(
    db: Session,
    record_type: str,
    raw_records: list[dict],
    retrieved_at: datetime | None = None,
    last_updated: str | None = None,
) -> int:
    retrieved = retrieved_at or datetime.now(timezone.utc)
    inserted = 0
    pending_records: dict[str, Record] = {}
    for raw in raw_records:
        normalized = normalize_record(record_type, raw, retrieved)
        if normalized is None:
            continue
        current = pending_records.get(normalized.id) or db.get(Record, normalized.id)
        if current is None:
            pending_records[normalized.id] = normalized
            db.add(normalized)
            inserted += 1
            continue
        for field in (
            "source_url", "retrieved_at", "date", "product_code", "manufacturer", "device_name",
            "specialty", "title", "summary", "failure_category", "confidence", "matched_terms",
            "failure_text", "source_data",
        ):
            setattr(current, field, getattr(normalized, field))
    db.flush()

    status = get_status(db, record_type)
    status.last_retrieved_at = retrieved
    status.status = "ok"
    status.error = None
    if last_updated:
        status.last_updated = last_updated
    status.count = db.scalar(select(func.count()).select_from(Record).where(Record.record_type == record_type)) or 0
    db.commit()
    return inserted
