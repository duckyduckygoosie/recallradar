import httpx
import pytest

from app.fda_client import FDAClient, FDAUnavailable, bounded_limit, build_search, unsupported_filters


@pytest.mark.asyncio
async def test_pagination_limits_and_page_safety_cap():
    calls = []

    async def handler(request):
        calls.append(request)
        offset = int(request.url.params.get("skip", "0"))
        return httpx.Response(200, json={"meta": {"results": {"last_updated": "2024-01-01"}},
                                         "results": [{"mdr_report_key": str(offset)}, {"mdr_report_key": str(offset + 1)}]})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http:
        client = FDAClient(client=http, page_cap=2)
        rows, _ = await client.fetch("events", limit=2, pages=8)
    assert len(rows) == 4
    assert [r.url.params["skip"] for r in calls] == ["0", "2"]
    assert all(r.url.params["limit"] == "2" for r in calls)
    assert bounded_limit(0) == 1
    assert bounded_limit(99999) == 1000


@pytest.mark.asyncio
async def test_retries_rate_limit_with_bounded_attempts():
    calls = 0

    async def handler(request):
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(429, json={"error": {"code": "LIMIT_EXCEEDED"}})
        return httpx.Response(200, json={"results": [{"product_res_number": "R1"}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        rows, _ = await FDAClient(client=http, retries=1).fetch("recalls", limit=100)
    assert calls == 2
    assert rows[0]["product_res_number"] == "R1"


@pytest.mark.asyncio
async def test_no_results_and_invalid_response_are_defensive():
    async def not_found(request):
        return httpx.Response(404, json={"error": {"code": "NOT_FOUND"}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(not_found)) as http:
        rows, _ = await FDAClient(client=http).fetch("enforcement")
    assert rows == []

    async def invalid(request):
        return httpx.Response(200, json={"results": {"bad": "shape"}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(invalid)) as http:
        with pytest.raises(FDAUnavailable):
            await FDAClient(client=http, retries=0).fetch("classification")


def test_search_builder_escapes_user_text_and_uses_supported_fields():
    expression = build_search("recalls", query='bad OR *:* " quote', product_code="A-1")
    assert expression is not None
    assert "product_code:" in expression
    assert "reason_for_recall:" in expression
    assert "\\*" in expression
    specialty = build_search("events", specialty="General Hospital")
    assert specialty is not None and "device.openfda.medical_specialty_description:" in specialty
    assert unsupported_filters("enforcement", product_code="LCO") == ("product_code",)
    assert unsupported_filters("events", specialty="Cardiology") == ()
    assert unsupported_filters("classification", manufacturer="maker") == ("manufacturer",)
    assert build_search("bogus", query="term") is None
