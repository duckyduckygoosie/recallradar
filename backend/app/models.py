from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Record(Base):
    __tablename__ = "records"
    __table_args__ = (UniqueConstraint("record_type", "source_key", name="uq_record_source"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    record_type: Mapped[str] = mapped_column(String(24), index=True)
    source_key: Mapped[str] = mapped_column(String(160))
    source_url: Mapped[str] = mapped_column(Text)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    date: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    product_code: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(300), nullable=True, index=True)
    device_name: Mapped[str | None] = mapped_column(String(300), nullable=True, index=True)
    specialty: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(600))
    summary: Mapped[str] = mapped_column(Text, default="")
    failure_category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    matched_terms: Mapped[list] = mapped_column(JSON, default=list)
    failure_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_data: Mapped[dict] = mapped_column(JSON, default=dict)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

class SourceStatus(Base):
    __tablename__ = "source_status"

    record_type: Mapped[str] = mapped_column(String(24), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    last_retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="never")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_updated: Mapped[str | None] = mapped_column(String(64), nullable=True)
