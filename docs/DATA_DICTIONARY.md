# Data dictionary

All timestamps emitted by RecallRadar use ISO-8601 UTC unless a source field is explicitly date-only. Blank or absent FDA values remain `null`/empty; the application does not manufacture replacements. Every source type is stored as minimized allowlisted fields rather than FDA's full payload.

## Shared record

| Field | Meaning |
|---|---|
| `id` | Stable local identifier namespaced by source type; detail lookup key. |
| `record_type` | `events`, `recalls`, `enforcement`, or `classification`. These are distinct source entities. |
| `title` | Human-readable product/device label derived from source fields; not an identity assertion. |
| `manufacturer` | Source-provided firm/manufacturer name where available. |
| `product_code` | FDA category/product code where supplied. It identifies a generic device category, not a unique marketed unit. |
| `device_name` | Source-provided generic device name. |
| `specialty` | FDA medical specialty/panel description, when supplied. |
| `date` | Source-specific event, recall initiation, or enforcement report date; classifications are generally undated. |
| `summary` | Allowlisted source description/reason text; no patient report narratives. |
| `source_url` | FDA/openFDA record/search reference. |
| `retrieved_at` | Local time that RecallRadar retrieved and persisted the record. |
| `failure_analysis` | Deterministic keyword/category mapping for recall source text; input text, matched terms, confidence and `Unknown` state preserved. Not a verified causal conclusion. |

## Source records

### Adverse event (`device/event`)

- Stable source key: `mdr_report_key`; `report_number` is used only when that key is absent.
- Date fields: `date_of_event` if present; otherwise `date_received`. Both are original source dates and are not interchangeable.
- Summary dimensions: `event_type`, `report_source_code`, and allowlisted device values (`brand_name`, `generic_name`, `manufacturer_d_name`, `device_report_product_code`, `openfda.device_name`, specialty and device class).
- Analytics count unique report keys; one report can list multiple devices, so report counts do not equal device counts. Manufacturer comparison groups may overlap when one report lists multiple manufacturers.
- Patient arrays, reporter details, contact/address fields, and `mdr_text` narratives are excluded from persistence and API responses.

### Device recall (`device/recall`)

- Source key: `product_res_number`; records without it are skipped.
- Date: `event_date_initiated`.
- Fields: `recall_status`, `product_code`, `product_description`, `recalling_firm`, `reason_for_recall`, and `root_cause_description`.
- Failure taxonomy examines only the allowlisted recall description/reason/root-cause fields and displays the exact supporting text. Action/contact narrative is excluded to avoid storing incidental personal contact details.

### Recall enforcement report (`device/enforcement`)

- Source key: `recall_number`; records without it are skipped.
- Date: `recall_initiation_date`, with `report_date` as a fallback.
- Fields: `classification`, `status`, `recalling_firm`, `product_description`, `reason_for_recall`, and date fields.
- Enforcement reports are not silently merged into device recall records.

- The openFDA enforcement schema used here has no normalized device product-code field; enforcement rows are not linked to category records by product description.

### Classification (`device/classification`)

- Source key: `product_code`.
- Fields: `device_name`, `medical_specialty_description`, `device_class`, `regulation_number`, and `definition`.
- Represents a generic FDA device category, not a manufacturer-specific marketed device.

## Analytics vocabulary

- **Reported event count**: distinct cached source report identifiers (`mdr_report_key`, with `report_number` fallback) within the displayed query and selected date bounds. Reports are passive surveillance reports, not confirmed device failures or incidents per unit exposure.
- **Recall count**: distinct cached records in the selected recall source type and scope.
- **Failure category**: deterministic taxonomy label based on explicit source words; `Unknown` when no configured term matches. Confidence describes lexical match strength only, never cause certainty.
- **Scope**: source types, query/filter values, date field/range, bounded cache scope, and data retrieval time used in an API response.
