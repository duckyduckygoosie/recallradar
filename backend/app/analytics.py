from __future__ import annotations

from collections import Counter
from datetime import date

from sqlalchemy.orm import Session

from .models import Record
from .persistence import cached_records, latest_retrieved_at


def _date_match(value: str | None, start: date | None, end: date | None) -> bool:
    if value is None:
        return start is None and end is None
    day = date.fromisoformat(value[:10])
    return not (start and day < start or end and day > end)


def _matches(record: Record, query: str | None, product_code: str | None, manufacturer: str | None) -> bool:
    devices = (record.source_data or {}).get("device", [])
    device_text = " ".join(
        str(value)
        for device in devices
        if isinstance(device, dict)
        for value in device.values()
    )
    searchable = " ".join(
        (record.title or "", record.summary or "", record.manufacturer or "", record.product_code or "", device_text)
    )
    if query and query.casefold() not in searchable.casefold():
        return False
    device_codes = {
        (device.get("device_report_product_code") or "").casefold()
        for device in devices
        if isinstance(device, dict)
    }
    if product_code and product_code.casefold() not in device_codes and product_code.casefold() != (record.product_code or "").casefold():
        return False
    if manufacturer:
        reported_manufacturers = {
            (device.get("manufacturer_d_name") or "").casefold()
            for device in devices
            if isinstance(device, dict)
        }
        if manufacturer.casefold() not in (record.manufacturer or "").casefold() and not any(
            manufacturer.casefold() in value for value in reported_manufacturers
        ):
            return False
    return True


def event_analytics(
    db: Session,
    query: str | None = None,
    product_code: str | None = None,
    manufacturer: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    records = [
        record
        for record in cached_records(db, "events")
        if _matches(record, query, product_code, manufacturer)
        and _date_match(record.date, start_date, end_date)
    ]
    unique_records = {record.source_key: record for record in records}
    monthly: Counter[str] = Counter()
    categories: Counter[str] = Counter()
    manufacturers: Counter[str] = Counter()

    for record in unique_records.values():
        if record.date and len(record.date) >= 7:
            monthly[record.date[:7]] += 1
        event_type = (record.source_data or {}).get("event_type") or "Unknown"
        categories[event_type] += 1
        device_manufacturers = {
            device.get("manufacturer_d_name")
            for device in (record.source_data or {}).get("device", [])
            if isinstance(device, dict) and device.get("manufacturer_d_name")
        }
        for name in device_manufacturers:
            manufacturers[name] += 1

    dated_records = sorted(record.date for record in unique_records.values() if record.date)
    coverage = f"{dated_records[0]} through {dated_records[-1]}" if dated_records else "no valid dated reports"
    filters = ", ".join(
        f"{name}={value}"
        for name, value in (("query", query), ("product_code", product_code), ("manufacturer", manufacturer))
        if value
    ) or "no text, product-code, or manufacturer filter"
    date_filter = f"{start_date.isoformat() if start_date else 'none'} through {end_date.isoformat() if end_date else 'none'}"

    return {
        "series": [{"period": month, "count": monthly[month]} for month in sorted(monthly)],
        "categories": [{"name": name, "count": count} for name, count in sorted(categories.items())],
        "manufacturers": [{"name": name, "count": count} for name, count in sorted(manufacturers.items())],
        "reporter_states": [],
        "total": len(unique_records),
        "scope": f"Cached normalized adverse-event reports; {filters}; date filter {date_filter}; dated cache coverage {coverage}. Undated reports remain in unbounded totals but not monthly bins.",
        "retrieved_at": max(
            (record.retrieved_at for record in unique_records.values()),
            default=latest_retrieved_at(db, ("events",)),
        ),
        "methodology": (
            "Counts distinct FDA mdr_report_key values. Date filters and monthly bins use date_of_event when present, "
            "otherwise date_received. Manufacturer counts group unique reports per source-reported manufacturer; "
            "one report may contribute to multiple manufacturers. Reporter-state data is not retained, so geography is omitted. "
            "These are report counts, not device failure rates, incidence, causation, or comparative risk."
        ),
    }


def compare_products(db: Session, codes: list[str]) -> dict:
    events = cached_records(db, "events")
    recalls = cached_records(db, "recalls")
    classifications = cached_records(db, "classification")
    comparison_dates = []
    items = []
    for code in codes:
        event_records = {record.source_key: record for record in events if _matches(record, None, code, None)}
        recall_records = {
            record.source_key: record
            for record in recalls
            if (record.product_code or "").casefold() == code.casefold()
        }
        comparison_dates.extend(record.date for record in (*event_records.values(), *recall_records.values()) if record.date)
        classification = next(
            (record for record in classifications if (record.product_code or "").casefold() == code.casefold()),
            None,
        )
        device_name = classification.device_name if classification else next(
            (record.device_name for record in (*event_records.values(), *recall_records.values()) if record.device_name),
            None,
        )
        event_categories = Counter(
            (record.source_data or {}).get("event_type") or "Unknown" for record in event_records.values()
        )
        recall_categories = Counter(record.failure_category or "Unknown" for record in recall_records.values())
        items.append(
            {
                "product_code": code,
                "device_name": device_name,
                "event_count": len(event_records),
                "recall_count": len(recall_records),
                "event_categories": [{"name": name, "count": count} for name, count in sorted(event_categories.items())],
                "recall_categories": [{"name": name, "count": count} for name, count in sorted(recall_categories.items())],
            }
        )
    date_values = sorted(comparison_dates)
    date_coverage = f"{date_values[0]} through {date_values[-1]}" if date_values else "no valid dated matches"
    return {
        "items": items,
        "scope": f"Cached adverse-event reports and device recall records for exact product codes {', '.join(codes)}; matching date coverage {date_coverage}. Product codes are generic category associations, not an exact marketed-device match.",
        "retrieved_at": latest_retrieved_at(db, ("events", "recalls", "classification")),
        "caveat": "Counts are not safety rankings and have no exposure or sales denominators; no comparative risk inference is supported.",
    }
