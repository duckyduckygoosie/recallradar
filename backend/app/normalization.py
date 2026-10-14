from __future__ import annotations

import hashlib
import re
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import quote

from .models import Record
from .schema_validation import (
    ClassificationRecord,
    EnforcementRecord,
    EventDevice,
    EventRecord,
    RecallRecord,
    TYPE_ENDPOINT,
    validate_record,
)
from .taxonomy import classify_failure


def safe_text(value: Any, max_length: int = 2000) -> str | None:
    if not isinstance(value, (str, int, float)):
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text[:max_length] if text else None


def exact_text(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def normalize_date(value: Any) -> str | None:
    text = safe_text(value)
    if not text:
        return None
    try:
        parsed = date(
            int(text[:4]), int(text[4:6]), int(text[6:])
        ) if re.fullmatch(r"\d{8}", text) else date.fromisoformat(text)
    except ValueError:
        return None
    return parsed.isoformat()


def stable_id(record_type: str, source_key: str) -> str:
    digest = hashlib.sha256(f"{record_type}:{source_key}".encode()).hexdigest()[:32]
    return f"{record_type}_{digest}"


def _first_openfda(device: EventDevice, key: str) -> str | None:
    data = device.openfda or {}
    value = data.get(key)
    return safe_text(value[0] if isinstance(value, list) and value else value)


def normalize_record(record_type: str, raw: dict[str, Any], retrieved_at: datetime | None = None) -> Record | None:
    item = validate_record(record_type, raw)
    if item is None:
        return None
    at = retrieved_at or datetime.now(timezone.utc)
    key = key_field = None
    date = product_code = manufacturer = device_name = specialty = title = summary = None
    taxonomy_text = None
    fields: dict[str, Any] = {}

    if record_type == "events":
        event = item
        assert isinstance(event, EventRecord)
        key = safe_text(event.mdr_report_key, 160)
        key_field = "mdr_report_key"
        if key is None:
            key = safe_text(event.report_number, 160)
            key_field = "report_number"
        device = event.device[0] if event.device else EventDevice()
        product_code = safe_text(device.device_report_product_code, 32)
        manufacturer = safe_text(device.manufacturer_d_name, 300)
        device_name = safe_text(_first_openfda(device, "device_name") or device.brand_name or device.generic_name, 300)
        specialty = safe_text(device.medical_specialty_description or _first_openfda(device, "medical_specialty_description"), 160)
        date = normalize_date(event.date_of_event) or normalize_date(event.date_received)
        title = device_name or f"FDA adverse-event report {key}"
        summary = ""
        taxonomy_text = ""
        fields = {"mdr_report_key": key, "report_number": safe_text(event.report_number), "date_received": safe_text(event.date_received), "date_of_event": safe_text(event.date_of_event), "event_type": safe_text(event.event_type), "report_source_code": safe_text(event.report_source_code), "device": [{k: v for k, v in {"brand_name": safe_text(d.brand_name), "generic_name": safe_text(d.generic_name), "manufacturer_d_name": safe_text(d.manufacturer_d_name), "device_report_product_code": safe_text(d.device_report_product_code), "medical_specialty_description": safe_text(d.medical_specialty_description), "device_class": safe_text(d.device_class), "device_name": _first_openfda(d, "device_name")}.items() if v is not None} for d in (event.device or [])]}
    elif record_type == "recalls":
        key = safe_text(item.product_res_number, 160)
        key_field = "product_res_number"
        product_code = safe_text(item.product_code, 32)
        manufacturer = safe_text(item.recalling_firm, 300)
        device_name = safe_text(item.product_description, 300)
        date = normalize_date(item.event_date_initiated)
        title = device_name or f"FDA device recall {key}"
        taxonomy_text = "\n".join(value for value in (exact_text(item.product_description), exact_text(item.reason_for_recall), exact_text(item.root_cause_description)) if value is not None)
        summary = safe_text(item.reason_for_recall) or ""
        fields = {}
        for name in ("product_res_number", "event_date_initiated", "recall_status", "product_code", "product_description", "recalling_firm", "reason_for_recall", "root_cause_description"):
            value = exact_text(getattr(item, name)) if name in ("product_description", "reason_for_recall", "root_cause_description") else safe_text(getattr(item, name))
            if value is not None:
                fields[name] = value
    elif record_type == "enforcement":
        key = safe_text(item.recall_number, 160)
        key_field = "recall_number"
        manufacturer = safe_text(item.recalling_firm, 300)
        device_name = safe_text(item.product_description, 300)
        date = normalize_date(item.recall_initiation_date) or normalize_date(item.report_date)
        title = device_name or f"FDA enforcement report {key}"
        summary = safe_text(item.reason_for_recall) or ""
        taxonomy_text = " ".join(filter(None, [safe_text(item.reason_for_recall)]))
        fields = {k: safe_text(getattr(item, k)) for k in ("recall_number", "recalling_firm", "product_description", "reason_for_recall", "classification", "status", "recall_initiation_date", "report_date") if safe_text(getattr(item, k)) is not None}
    else:
        key = safe_text(item.product_code, 32)
        key_field = "product_code"
        product_code = key
        device_name = safe_text(item.device_name, 300)
        specialty = safe_text(item.medical_specialty_description, 160)
        title = device_name or f"FDA device classification {key}"
        summary = safe_text(item.definition) or ""
        fields = {k: safe_text(getattr(item, k)) for k in ("product_code", "device_name", "medical_specialty_description", "device_class", "regulation_number", "definition") if safe_text(getattr(item, k)) is not None}
    if not key or not title:
        return None
    category, confidence, terms = classify_failure(taxonomy_text or "") if record_type in ("recalls", "enforcement") else ("Unknown", 0.0, [])
    escaped_key = key.replace("\\", "\\\\").replace('"', '\\"')
    source_query = f'{key_field}:"{escaped_key}"'
    source_url = f"https://api.fda.gov/device/{TYPE_ENDPOINT[record_type]}.json?search={quote(source_query, safe='')}&limit=1"
    return Record(id=stable_id(record_type, key), record_type=record_type, source_key=key, source_url=source_url,
        retrieved_at=at, date=date, product_code=product_code, manufacturer=manufacturer, device_name=device_name,
        specialty=specialty, title=title, summary=summary, failure_category=category, confidence=confidence,
        matched_terms=terms, failure_text=taxonomy_text if record_type in ("recalls", "enforcement") else None, source_data=fields)
