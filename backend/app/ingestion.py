from __future__ import annotations

from sqlalchemy.orm import Session

from .fda_client import FDAClient, bounded_limit, build_search, unsupported_filters
from .models import Record
from .persistence import RECORD_TYPES, cached_records, get_status, ingest


async def refresh(
    db: Session,
    record_type: str,
    limit: int = 100,
    pages: int = 1,
    client: FDAClient | None = None,
    search: str | None = None,
) -> int:
    fda = client or FDAClient(page_cap=max(1, min(pages, 20)))
    status = get_status(db, record_type)
    try:
        rows, meta = await fda.fetch(record_type, search=search, limit=bounded_limit(limit), pages=pages)
        result_meta = meta.get("results", {}) if isinstance(meta.get("results", {}), dict) else {}
        last_updated = meta.get("last_updated") or result_meta.get("last_updated")
        return ingest(db, record_type, rows, last_updated=last_updated)
    except Exception as exc:
        status.status = "error"
        status.error = str(exc)[:500]
        db.commit()
        raise


async def search_records(
    db: Session,
    record_type: str,
    query: str | None,
    product_code: str | None,
    manufacturer: str | None,
    specialty: str | None,
    limit: int,
    client: FDAClient | None = None,
    offset: int = 0,
) -> tuple[list[Record], int, str | None]:
    unsupported = unsupported_filters(record_type, query, product_code, manufacturer, specialty)
    if unsupported:
        return [], 0, f"{record_type} source does not support filters: {', '.join(unsupported)}."
    local = cached_records(db, record_type, query, product_code, manufacturer, specialty)
    remote_error = None
    if not local:
        search = build_search(record_type, query, product_code, manufacturer, specialty)
        page_size = bounded_limit(limit)
        page_count = min(20, max(1, (max(0, offset) + page_size - 1) // page_size + 1))
        try:
            await refresh(db, record_type, limit=page_size, pages=page_count, client=client, search=search)
        except Exception as exc:
            remote_error = str(exc)
        if remote_error is None and offset + page_size > 20 * page_size:
            remote_error = "Requested offset exceeds the 20-page remote retrieval cap."
        local = cached_records(db, record_type, query, product_code, manufacturer, specialty)
    return local, len(local), remote_error
