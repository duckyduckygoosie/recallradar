# RecallRadar status

Verification snapshot: 2026-10-14, against the local production build and the live openFDA-backed API. Counts and source update dates below are the values returned by `GET /api/v1/health` during verification; they will change after refreshes.

## Working now

- Next.js App Router UI and FastAPI backend run locally without credentials or API keys.
- The backend fetched and cached real openFDA device adverse-event, recall, recall-enforcement, and classification records. A bounded CLI refresh (`--limit 25 --pages 1`) returned 25 records per source. Search, record detail, source links, freshness/status, event analytics, category comparisons, and recall text taxonomy use retrieved/cache data; empty or unavailable values are not fabricated.
- Current verified cache: events 156, recalls 25, enforcement reports 25, classifications 27. Latest FDA dataset update dates in that response: events 2026-10-07, recalls 2026-10-12, enforcement 2026-10-07, classifications 2026-10-05. Counts are bounded cache contents, not totals in FDA datasets.
- Notebook filters, notes, source references, and CSV/JSON exports persist in the browser only; no account or backend user data is created.
- Product-code linking is limited to category-level associations. Enforcement records are not joined to devices by unsupported identifiers. Compare output contains raw reports and an explicit no-denominator warning, never a safety rank.

## Verification performed

| Check | Result |
|---|---|
| Backend pytest | 13 passed; one Starlette `TestClient` deprecation warning from the installed test stack |
| Frontend Vitest | 6 passed; Vite emitted a Node API CJS deprecation warning |
| ESLint | `npm run lint` passed |
| Strict TypeScript | `npm run typecheck` passed |
| Production build | `npm run build` passed; Next.js generated all app routes |
| Playwright | 1 production smoke flow passed: search, sourced record/detail timeline, local note, JSON export |
| axe-core browser audits | 0 violations on Overview, Search, Events, Recalls, Compare, Notebook, and Device detail at 390px width; two checks remained incomplete on each route, so manual review is still needed |
| Mobile layout | At a 390px viewport, the Overview document width was 390px with 42 cached-record rows; no horizontal page overflow |
| Live API | `GET /api/v1/health` returned `status=ok`, `database=ok`, `mode=live`; all four sources reported `status=ok` and no warnings |

## Limits and known gaps

- Refresh is deliberately bounded. The local cache is not a complete or continuously synchronized copy of FDA history; displayed counts are scoped to the records actually retrieved and cached.
- MAUDE reports are incomplete, potentially duplicated, delayed, and affected by reporting bias. They do not establish causality, incidence, defect rates, or relative safety; RecallRadar is not clinical decision support or an alert service.
- Product-code matches associate records with a generic device category only, not a specific marketed model, lot, or recalled unit. Manufacturer/name fuzzy matching is intentionally absent.
- Enforcement reports have no normalized product-code relationship in this implementation and are not linked to a device detail timeline. Geography is omitted because a robust, sufficiently supported geographic field is not part of the current normalized analytics.
- Classification records describe generic FDA device categories, not a marketed product identity. A 510(k) connector is not implemented.
- Failure labels are deterministic keyword matches over available source text. The matched text/rule and confidence are shown; unmatched text remains `Unknown`. These are text groupings, not verified engineering causes.
- Notebook storage is browser-local and can be cleared with browser data. There are no cloud accounts or cross-device synchronization.
- SQLite initializes tables on application startup; a versioned migration history is not yet supplied. PostgreSQL is supported through `DATABASE_URL` but was not integration-tested in this verification.
- Axe marked two rules incomplete for manual review; automated zero-violation results are not a claim of full WCAG conformance.

See [methodology](METHODOLOGY.md), [data dictionary](DATA_DICTIONARY.md), [architecture](ARCHITECTURE.md), [roadmap](ROADMAP.md), and the [screenshot guide](SCREENSHOTS.md) for assumptions and next steps.
