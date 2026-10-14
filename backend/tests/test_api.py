from collections.abc import Generator

from datetime import datetime

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import router
from app.models import Record, SourceStatus
from app.database import Base, get_db
from app.fda_client import FDAClient
from app.ingestion import refresh
from app.persistence import ingest


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.mark.asyncio
async def test_mocked_fda_refresh_persists_deduplicated_allowlisted_records(session_factory):
    payload = {"meta": {"last_updated": "2024-03-01", "results": {"total": 2}}, "results": [
        {"mdr_report_key": "42", "date_received": "20240220", "event_type": "Injury",
         "patient": [{"sequence_number": "private"}], "mdr_text": [{"text": "narrative"}],
         "reporter_state": "NY", "device": [{"device_report_product_code": "ABC", "manufacturer_d_name": "Maker"}]},
        {"mdr_report_key": "42", "date_received": "20240220", "event_type": "Injury",
         "patient": [{"sequence_number": "private"}], "device": [{"device_report_product_code": "ABC", "manufacturer_d_name": "Maker"}]},
    ]}

    async def handler(request):
        return httpx.Response(200, json=payload)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = FDAClient(client=http)
        with session_factory() as db:
            inserted = await refresh(db, "events", client=client, limit=10)
            records = list(db.query(Record).all())
            status = db.get(SourceStatus, "events")
    assert inserted == 1
    assert len(records) == 1
    assert status.status == "ok"
    assert status.last_updated == "2024-03-01"
    assert status.count == 1
    assert "patient" not in records[0].source_data
    assert "mdr_text" not in records[0].source_data
    assert "reporter_state" not in records[0].source_data


def test_cached_search_detail_analytics_boundaries_and_phi_absence(session_factory):
    app = FastAPI()
    app.include_router(router)

    def override_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with session_factory() as db:
        ingest(db, "events", [
            {"mdr_report_key": "one", "date_of_event": "20240115", "date_received": "20240220", "event_type": "Malfunction",
             "patient": [{"name": "secret"}], "mdr_text": [{"text": "private"}],
             "device": [{"device_report_product_code": "AAA", "manufacturer_d_name": "Device Maker", "brand_name": "Model"}]},
            {"mdr_report_key": "two", "date_of_event": "20240202", "date_received": "20240115", "event_type": "Injury",
             "device": [{"device_report_product_code": "AAA", "manufacturer_d_name": "Device Maker"}]},
            {"mdr_report_key": "three", "date_of_event": "20240301", "date_received": "20240202", "event_type": "Injury",
             "device": [{"device_report_product_code": "BBB", "manufacturer_d_name": "Other Maker"}]},
        ])
    with TestClient(app) as client:
        result = client.get("/api/v1/search", params={"record_type": "events", "product_code": "AAA"}).json()
        assert {item["record_type"] for item in result["items"]} == {"event"}
        assert result["total"] == 2
        detail = client.get(f"/api/v1/records/event/{result['items'][0]['id']}").json()
        retrieved = datetime.fromisoformat(detail["retrieved_at"].replace("Z", "+00:00"))
        assert retrieved.utcoffset().total_seconds() == 0
        assert "patient" not in detail and "mdr_text" not in detail
        stats = client.get("/api/v1/events/analytics", params={"start_date": "2024-02-01", "end_date": "2024-02-29"}).json()
        assert stats["series"] == [{"period": "2024-02", "count": 1}]
        assert stats["total"] == 1
        assert stats["manufacturers"] == [{"name": "Device Maker", "count": 1}]
        assert stats["reporter_states"] == []


def test_compare_uses_exact_product_code_categories_without_merging_source_entities(session_factory):
    app = FastAPI()
    app.include_router(router)

    def override_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with session_factory() as db:
        ingest(db, "events", [
            {"mdr_report_key": "event-a", "event_type": "Malfunction", "device": [{"device_report_product_code": "AAA"}]},
            {"mdr_report_key": "event-b", "event_type": "Injury", "device": [{"device_report_product_code": "BBB"}]},
        ])
        ingest(db, "recalls", [
            {"product_res_number": "recall-a", "product_code": "AAA", "product_description": "Device A"},
            {"product_res_number": "recall-b", "product_code": "BBB", "product_description": "Device B"},
        ])
        ingest(db, "classification", [
            {"product_code": "AAA", "device_name": "Category A"},
            {"product_code": "BBB", "device_name": "Category B"},
        ])

    with TestClient(app) as client:
        response = client.get("/api/v1/compare", params={"product_codes": "AAA,BBB"})

    assert response.status_code == 200
    comparison = {item["product_code"]: item for item in response.json()["items"]}
    assert comparison["AAA"]["device_name"] == "Category A"
    assert comparison["AAA"]["event_count"] == 1
    assert comparison["AAA"]["recall_count"] == 1
    assert comparison["BBB"]["device_name"] == "Category B"
    assert comparison["BBB"]["event_count"] == 1
    assert comparison["BBB"]["recall_count"] == 1


def test_search_exposes_unsupported_product_code_source_filter(session_factory):
    app = FastAPI()
    app.include_router(router)

    def override_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        response = client.get("/api/v1/search", params={"record_type": "enforcement", "product_code": "LCO"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []
    assert len(payload["warnings"]) == 1
    assert "product_code" in payload["warnings"][0]
