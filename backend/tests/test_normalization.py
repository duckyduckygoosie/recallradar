from app.normalization import normalize_record
from app.taxonomy import classify_failure


def test_event_normalization_allowlists_metadata_only():
    row = normalize_record("events", {
        "mdr_report_key": "123", "date_received": "20240115", "event_type": "Malfunction",
        "patient": [{"sequence_number": "secret"}], "mdr_text": [{"text": "private narrative"}],
        "reporter_state": "CA", "device": [{"brand_name": "Device", "manufacturer_d_name": "Maker",
            "device_report_product_code": "ABC", "openfda": {"device_name": ["Device name"]}}],
    })
    assert row is not None
    assert row.product_code == "ABC"
    assert "patient" not in row.source_data
    assert "mdr_text" not in row.source_data
    assert "reporter_state" not in row.source_data
    assert "secret" not in repr(row.source_data)


def test_event_uses_occurrence_date_and_rejects_invalid_dates():
    row = normalize_record("events", {
        "mdr_report_key": "date-order", "date_of_event": "20240201", "date_received": "20240203",
        "device": [{"device_report_product_code": "ABC"}],
    })
    assert row is not None
    assert row.date == "2024-02-01"

    malformed = normalize_record("events", {
        "mdr_report_key": "bad-date", "date_of_event": "20240230", "date_received": "not-a-date",
        "device": [{"device_report_product_code": "ABC"}],
    })
    assert malformed is not None
    assert malformed.date is None


def test_missing_identity_and_invalid_device_shape_are_rejected():
    assert normalize_record("events", {"device": []}) is None
    assert normalize_record("events", {"mdr_report_key": "bad-shape", "device": "unexpected"}) is None
    assert normalize_record("recalls", {"product_res_number": "R1", "action": "CALL 555-0100"}) is not None


def test_recall_taxonomy_retains_only_allowlisted_exact_input_and_drops_action():
    reason = "  Connector fracture\nfound during inspection  "
    row = normalize_record("recalls", {
        "product_res_number": "R1", "product_description": "Connector", "reason_for_recall": reason,
        "root_cause_description": "Component fracture", "action": "Call Jane at 555-0100",
    })
    assert row is not None
    assert row.source_url.endswith("search=product_res_number%3A%22R1%22&limit=1")
    assert row.failure_text == "Connector\n" + reason + "\nComponent fracture"
    assert "action" not in row.source_data
    assert "555-0100" not in row.failure_text
    assert row.failure_category == "Material / component"


def test_unknown_taxonomy_and_deterministic_term_matches():
    assert classify_failure("text without mapped terms") == ("Unknown", 0.0, [])
    first = classify_failure("Possible software firmware failure")
    assert first == classify_failure("Possible software firmware failure")
    assert first[0] == "Software / firmware"
    assert first[2] == ["software", "firmware"]
