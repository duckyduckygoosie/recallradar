from __future__ import annotations

import asyncio
import os
import re
from typing import Any

import httpx

BASE_URL = "https://api.fda.gov/device"
PAGE_SIZE_MAX = 1000
DEFAULT_PAGE_CAP = 3
TRANSIENT = {408, 425, 429, 500, 502, 503, 504}
SEARCH_FIELDS = {
    "events": {"query": ("device.brand_name", "device.generic_name", "device.openfda.device_name"), "product_code": "device.device_report_product_code", "manufacturer": "device.manufacturer_d_name", "specialty": "device.openfda.medical_specialty_description"},
    "recalls": {"query": ("product_description", "reason_for_recall", "recalling_firm"), "product_code": "product_code", "manufacturer": "recalling_firm"},
    "enforcement": {"query": ("product_description", "reason_for_recall", "recalling_firm"), "manufacturer": "recalling_firm"},
    "classification": {"query": ("device_name", "definition"), "product_code": "product_code", "specialty": "medical_specialty_description"},
}


class FDAUnavailable(RuntimeError):
    pass


def bounded_limit(limit: int, default: int = 100) -> int:
    try:
        value = int(limit)
    except (TypeError, ValueError):
        value = default
    return max(1, min(PAGE_SIZE_MAX, value))


def _escape(value: str) -> str:
    # Quote a literal and escape Lucene punctuation before URL encoding by httpx.
    value = value.strip()[:200]
    return '"' + re.sub(r'([+\-&|!(){}\[\]^"~*?:\\/])', r'\\\1', value) + '"'


def build_search(record_type: str, query: str | None = None, product_code: str | None = None,
                 manufacturer: str | None = None, specialty: str | None = None) -> str | None:
    fields = SEARCH_FIELDS.get(record_type)
    if fields is None:
        return None
    clauses = []
    for key, value in (("product_code", product_code), ("manufacturer", manufacturer), ("specialty", specialty)):
        if value and key in fields:
            clauses.append(f"{fields[key]}:{_escape(value)}")
    if query:
        query_fields = fields["query"]
        clauses.append("(" + " OR ".join(f"{field}:{_escape(query)}" for field in query_fields) + ")")
    return " AND ".join(clauses) if clauses else None


def unsupported_filters(
    record_type: str,
    query: str | None = None,
    product_code: str | None = None,
    manufacturer: str | None = None,
    specialty: str | None = None,
) -> tuple[str, ...]:
    fields = SEARCH_FIELDS.get(record_type)
    if fields is None:
        return ("record_type",)
    requested = (
        ("query", query),
        ("product_code", product_code),
        ("manufacturer", manufacturer),
        ("specialty", specialty),
    )
    return tuple(name for name, value in requested if value and value.strip() and name not in fields)


class FDAClient:
    def __init__(self, base_url: str = BASE_URL, timeout: float = 15.0, retries: int = 3,
                 page_cap: int = DEFAULT_PAGE_CAP, api_key: str | None = None,
                 client: httpx.AsyncClient | None = None):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = max(0, min(retries, 5))
        self.page_cap = max(1, min(page_cap, 20))
        self.api_key = api_key or os.getenv("OPENFDA_API_KEY")
        self._client = client

    async def _request(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        params = dict(params)
        if self.api_key:
            params["api_key"] = self.api_key
        own = self._client is None
        client = self._client or httpx.AsyncClient(timeout=self.timeout)
        try:
            for attempt in range(self.retries + 1):
                try:
                    response = await client.get(f"{self.base_url}/{path}.json", params=params)
                except (httpx.TimeoutException, httpx.NetworkError) as exc:
                    if attempt >= self.retries:
                        raise FDAUnavailable(f"openFDA request failed: {type(exc).__name__}") from exc
                    await asyncio.sleep(min(0.25 * 2 ** attempt, 2.0))
                    continue
                if response.status_code in TRANSIENT and attempt < self.retries:
                    await asyncio.sleep(min(0.25 * 2 ** attempt, 2.0))
                    continue
                if response.status_code == 404:
                    try:
                        body = response.json()
                    except ValueError:
                        body = {}
                    error = body.get("error", {})
                    if isinstance(error, dict) and error.get("code") == "NOT_FOUND":
                        return {"results": [], "meta": {"results": {"total": 0}}}
                if response.status_code >= 400:
                    raise FDAUnavailable(f"openFDA returned HTTP {response.status_code}")
                try:
                    body = response.json()
                except ValueError as exc:
                    raise FDAUnavailable("openFDA returned invalid JSON") from exc
                if not isinstance(body, dict) or not isinstance(body.get("results", []), list):
                    raise FDAUnavailable("openFDA returned an unexpected response schema")
                return body
            raise FDAUnavailable("openFDA retry limit reached")
        finally:
            if own:
                await client.aclose()

    async def fetch(self, record_type: str, search: str | None = None, limit: int = 100,
                    offset: int = 0, pages: int | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        path = {"events": "event", "recalls": "recall", "enforcement": "enforcement", "classification": "classification"}.get(record_type)
        if path is None:
            raise ValueError(f"Unsupported record type: {record_type}")
        size = bounded_limit(limit)
        try:
            start = max(0, int(offset))
        except (TypeError, ValueError):
            start = 0
        page_count = max(1, min(int(pages or self.page_cap), self.page_cap))
        results: list[dict[str, Any]] = []
        latest_meta: dict[str, Any] = {}
        for page in range(page_count):
            page_offset = start + page * size
            if page_offset >= 25_000:
                break
            body = await self._request(path, {"search": search, "limit": size, "skip": page_offset} if search else {"limit": size, "skip": page_offset})
            page_rows = body.get("results", [])
            if not page_rows:
                break
            results.extend(row for row in page_rows if isinstance(row, dict))
            latest_meta = body.get("meta", {}) if isinstance(body.get("meta", {}), dict) else {}
            if len(page_rows) < size:
                break
        return results, latest_meta
