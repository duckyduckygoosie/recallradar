# Sources and methodology

## Official sources

- [openFDA Device API overview](https://open.fda.gov/apis/device/) lists device adverse events, device recalls, recall enforcement reports, classification, 510(k), and other datasets.
- [Device adverse events overview](https://open.fda.gov/apis/device/event/) describes MAUDE/MDR records, their heterogeneous follow-up reporting, and limitations: reports may be incomplete, inaccurate, untimely, unverified or biased; they do not establish causality or incidence.
- [Device recall overview](https://open.fda.gov/apis/device/recall/) defines recalls as actions to address a problem with a device that violates FDA law; recall records are not an authoritative lifecycle tracker and published status may remain unchanged.
- [Device classification overview](https://open.fda.gov/apis/device/classification/) describes generic device names/product codes, specialty panels, and regulatory classes.
- [openFDA authentication and rate limits](https://open.fda.gov/apis/authentication/) states 240 requests/minute and 1,000/day per IP without a key; a key is optional and not needed for this MVP.
- [openFDA terms](https://open.fda.gov/terms/) and [license](https://open.fda.gov/license/) govern use and attribution.

Live schema examples were reviewed from the official endpoints: [event](https://api.fda.gov/device/event.json?limit=1), [recall](https://api.fda.gov/device/recall.json?limit=1), [enforcement](https://api.fda.gov/device/enforcement.json?limit=1), and [classification](https://api.fda.gov/device/classification.json?limit=1). FDA schemas are not treated as strict guarantees: absent or malformed optional fields must be tolerated.

## Record and query assumptions

1. The adverse-event API contains MAUDE safety reports. A report is not a verified incident, causal finding, unique device failure or denominator. Counts reflect retrieved report records and the selected report date field only.
2. Device recalls and enforcement reports are independently ingested and displayed. Their datasets and identifiers are not interchangeable; enforcement rows have no normalized device product code and are not joined to recall rows by similar-looking identifiers.
3. Classification entries represent generic device types. A product code match is a device-category association, not a specific model/batch match.
4. No manufacturer/name fuzzy join is performed. Event-to-recall links are withheld unless an exact supported identifier is available and disclosed. Any product-code-only relationship is labeled category-level.
5. Search is scoped to a bounded local normalized cache and fetches from openFDA when no matching cached records exist. Source status reports the last retrieval time and fetch errors.
6. Analytics count distinct source report/record IDs, not individual devices, patients, usage or exposure. A report listing multiple devices may contribute once to multiple manufacturer groups. Reporter-state data is not retained, so geographic trends are omitted. No risk ranking, incident rate, causal inference, public alert, or clinical recommendation is produced.
7. Event records are stored using allowlists; patient/person/contact fields and adverse-event narrative text are excluded. The engineering taxonomy uses allowlisted recall description/reason/root-cause text only; recall action/contact narrative is not collected.
8. Keyword categories are deterministic descriptive groupings, not ground-truth causes. Show matched terms and exact input text, retain an `Unknown` category, and do not claim a causal determination.
9. Missing dates are not imputed. Events with no report/event date are excluded from date-binned time series and surfaced in counts/scope where relevant.
10. Demo fixture data, if ever added, must be separately marked `DEMO`, excluded from live analytics, and never presented as FDA retrieval.

## Interpretive warning

MAUDE reports are voluntary and mandatory submissions with reporting biases, duplicates/follow-ups, missing data and no use/exposure denominator. Higher raw report counts do not imply higher device risk. Consult FDA sources for authoritative records and updates.
