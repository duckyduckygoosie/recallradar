# RecallRadar implementation plan

## Product boundary

RecallRadar is an exploratory research workspace for biomedical engineers and medtech teams. It is not clinical decision support, a safety ranking, an alerting system, or authoritative FDA guidance. Every real-data metric must retain a source, retrieval timestamp, query scope, and explicit denominator limitation. FDA adverse-event reports are passive, potentially incomplete/duplicative, and do not establish causality or incidence.

## Sources and modeling constraints

- openFDA Device Adverse Events (`device/event`) reflects MAUDE MDR reports; records are individual reports with inconsistent optional fields. Keep them as `event` records, never as recall records.
- openFDA Device Recalls (`device/recall`) and Recall Enforcement Reports (`device/enforcement`) are distinct resources and remain separate record types.
- openFDA Device Classification (`device/classification`) describes generic device categories and product codes, not a specific marketed product or manufacturer.
- Cross-resource association is permitted only on exact, documented identifiers/product codes supplied by source data. Manufacturer/product-name similarity alone is not a defensible join; absent a strong key, show unlinked records.
- openFDA permits 240 requests/minute and 1,000/day per IP without an API key. Keep page sizes at or below 1000, cap client page/refresh work, cache, retry boundedly, and surface unavailable responses. No API key is required.

## Architecture

- `frontend/`: Next.js App Router, strict TypeScript, Tailwind, reusable accessible UI, Recharts, TanStack Table, Vitest, Playwright, ESLint.
- `backend/`: FastAPI, Pydantic validation/normalization, async FDA client, SQLAlchemy persistence, SQLite default (`DATABASE_URL` allows PostgreSQL), deterministic taxonomy, analytics, pytest.
- UI calls the local FastAPI service. Backend owns source retrieval, cache freshness/errors, normalizations and all aggregate calculations. Browser local storage holds notebook filters/notes only; no account system or patient information.
- Persist schema-specific, allowlisted normalized records by source type with source key, source URL and retrieval time; exclude event patient/person/contact/narrative fields. SQLite initialization is reproducible and refresh is an explicit CLI operation.

## Delivery sequence

1. Scaffold both apps, configuration, env example, data model, and docs. Establish the UI shell and health/freshness API.
2. Build the vertical slice: FDA client with bounded retries/pagination and validation → normalized SQL cache → search API → record detail → real retrieved-record time series. Add clearly labeled fixture mode only if live access is unavailable; never mix fixtures into live claims.
3. Extend ingestion/search to classification, recalls and enforcement reports; implement filterable event/recall tables, engineering keyword taxonomy with underlying text and unknown state, analysis scope/methodology, raw counts, comparisons with explicit lack of exposure denominators, and conservative device links.
4. Complete notebook save/load, source references, CSV/JSON export, responsive accessible layout, data freshness/error visibility, loading/empty/error states, and official FDA links.
5. Add unit/integration/frontend tests and browser smoke coverage. Write data dictionary, source/matching methodology, architecture diagram, screenshot guide, roadmap, and a truthful portfolio write-up/resume bullet draft.
6. Install and run checks, production build, and real API smoke fetch if outbound access permits. Record actual outcomes and any external limitation in `docs/STATUS.md`.

## Acceptance criteria

- A clean checkout can be started locally without credentials or proprietary services.
- Search, detail, charts, filters, recalls/events, comparisons, notebook and exports use the implemented API/cache; no static dashboard values are presented as live data.
- Counts are exact counts of scoped retrieved records, not risk estimates; date range, source scope and retrieval time are visible.
- Device-event/recall relationships state the matching key and confidence; name-only fuzzy matching is prohibited.
- API errors, missing fields, empty datasets, stale caches, and demo mode are distinguishable in the UI.
- Automated tests cover normalizers/taxonomy, mocked FDA integration, frontend filtering/chart transformations, and Playwright search/detail/export flow.
