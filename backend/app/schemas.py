from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

RecordType = Literal["event", "recall", "enforcement", "classification"]

class HealthSource(BaseModel):
    count: int
    last_retrieved_at: datetime | None
    status: str
    error: str | None = None
    last_updated: str | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    mode: Literal["live", "demo"]
    sources: dict[str, HealthSource]
    warnings: list[str]


class SearchItem(BaseModel):
    id: str
    record_type: RecordType
    title: str
    manufacturer: str | None = None
    product_code: str | None = None
    device_name: str | None = None
    specialty: str | None = None
    date: str | None = None
    summary: str
    source_url: str
    retrieved_at: datetime
    failure_category: str | None = None
    confidence: float | None = None


class SearchResponse(BaseModel):
    items: list[SearchItem]
    total: int
    scope: str
    retrieved_at: datetime | None
    mode: Literal["live", "demo"] = "live"
    warnings: list[str] = Field(default_factory=list)


class FailureAnalysis(BaseModel):
    category: str
    confidence: float
    matched_terms: list[str]
    text: str
    confidence_note: str = "Deterministic lexical match support, not a probability or causal finding."


class RecordDetail(SearchItem):
    model_config = ConfigDict(extra="allow")
    failure_analysis: FailureAnalysis | None = None


class SeriesPoint(BaseModel):
    period: str
    count: int


class CategoryCount(BaseModel):
    name: str
    count: int


class StateCount(BaseModel):
    state: str
    count: int


class AnalyticsResponse(BaseModel):
    series: list[SeriesPoint]
    categories: list[CategoryCount]
    manufacturers: list[CategoryCount]
    reporter_states: list[StateCount]
    total: int
    scope: str
    retrieved_at: datetime | None
    methodology: str


class CompareProduct(BaseModel):
    product_code: str
    device_name: str | None
    event_count: int
    recall_count: int
    event_categories: list[CategoryCount]
    recall_categories: list[CategoryCount]


class CompareResponse(BaseModel):
    items: list[CompareProduct]
    scope: str
    retrieved_at: datetime | None
    caveat: str
    warnings: list[str] = Field(default_factory=list)
