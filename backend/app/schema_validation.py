from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class OpenFDARecord(BaseModel):
    model_config = ConfigDict(extra="ignore")


class EventDevice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    brand_name: str | None = None
    generic_name: str | None = None
    manufacturer_d_name: str | None = None
    device_report_product_code: str | None = None
    medical_specialty_description: str | None = None
    device_class: str | None = None
    openfda: dict[str, Any] | None = None


class EventRecord(OpenFDARecord):
    mdr_report_key: str | int | None = None
    report_number: str | None = None
    date_received: str | None = None
    date_of_event: str | None = None
    event_type: str | None = None
    report_source_code: str | None = None
    device: list[EventDevice] | None = Field(default_factory=list)


class RecallRecord(OpenFDARecord):
    product_res_number: str | None = None
    event_date_initiated: str | None = None
    recall_status: str | None = None
    product_code: str | None = None
    product_description: str | None = None
    recalling_firm: str | None = None
    reason_for_recall: str | None = None
    root_cause_description: str | None = None


class EnforcementRecord(OpenFDARecord):
    recall_number: str | None = None
    recalling_firm: str | None = None
    product_description: str | None = None
    reason_for_recall: str | None = None
    classification: str | None = None
    status: str | None = None
    recall_initiation_date: str | None = None
    report_date: str | None = None


class ClassificationRecord(OpenFDARecord):
    product_code: str | None = None
    device_name: str | None = None
    medical_specialty_description: str | None = None
    device_class: str | None = None
    regulation_number: str | None = None
    definition: str | None = None


RECORD_MODELS: dict[str, type[BaseModel]] = {
    "events": EventRecord,
    "recalls": RecallRecord,
    "enforcement": EnforcementRecord,
    "classification": ClassificationRecord,
}
TYPE_ENDPOINT = {
    "events": "event",
    "recalls": "recall",
    "enforcement": "enforcement",
    "classification": "classification",
}


def validate_record(record_type: str, raw: dict[str, Any]) -> BaseModel | None:
    model = RECORD_MODELS.get(record_type)
    if model is None:
        return None
    try:
        return model.model_validate(raw)
    except ValidationError:
        return None
