# RecallRadar

**Medical-device intelligence for exploratory research—not a safety score.** RecallRadar helps biomedical engineers, researchers and medtech teams search openFDA device adverse-event reports, recalls, enforcement reports and generic device classifications. It preserves the distinction between source datasets, displays provenance and retrieval freshness, and keeps analysis assumptions visible.

> **Important:** FDA adverse-event reports are passive reports with incomplete, duplicated and biased submissions. Counts do not establish causality, incidence, defect rates or comparative safety. RecallRadar is not clinical decision support, a public hazard-alert service, or an authoritative FDA record. Use official FDA sources for authoritative updates.

## Stack

- **Frontend:** Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui primitives, Recharts, TanStack Table, Vitest and Playwright.
- **Backend:** FastAPI, Pydantic, SQLAlchemy, SQLite by default; PostgreSQL-compatible `DATABASE_URL`.
- **Data:** openFDA Device Adverse Events (MAUDE/MDR), Device Recalls, Recall Enforcement Reports and Device Classification. No login, payments or API key required.

## Features

- Overview/search with source freshness, errors, filters and live-data scope.
- Device/category exploration and official FDA links.
- Adverse-event reporting analytics from retrieved/cache records, with source date and query methodology.
- Distinct recall and enforcement exploration with deterministic, inspectable failure-text categories.
- Category comparison limited to raw retrieved counts; no ranking and no exposure denominator.
- Research notebook saved only in this browser's local storage; notes, filters and source references export to CSV/JSON.

The app does not seed fake metrics. A fresh database can legitimately show no data until a search or bounded refresh retrieves records. `docs/STATUS.md` records the verified implementation scope and checks.

## Requirements

Node.js 20+ and npm; Python 3.11+ and pip. Internet access is required for live openFDA retrieval. The frontend/API can still launch when FDA is unavailable; cached records and source errors remain visible.

## Quick start

Open two terminals from this repository root.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -e ".[test]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another backend terminal (with the virtual environment active), run a bounded refresh:

```bash
cd backend
python -m app.cli refresh --limit 25
```

The refresh fetches separate openFDA source pages and stores normalized records. It is intentionally bounded; it does not download the full FDA history. You may also search from the UI to trigger on-demand retrieval.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The Next.js rewrite proxies `/api/v1/*` to `http://127.0.0.1:8000`. Set `API_PROXY_TARGET` in `frontend/.env.local` to override the backend address.

## Configuration

Copy `backend/.env.example` to `backend/.env` and, if changing the frontend proxy, copy `frontend/.env.example` to `frontend/.env.local`. Backend defaults to a local SQLite database; set `DATABASE_URL` to a SQLAlchemy PostgreSQL URL for a compatible deployment. No API key is needed. An optional `OPENFDA_API_KEY` may be used with the free openFDA API. Respect the no-key published limit of 240 requests/minute and 1,000 requests/day per IP; the application bounds page size, page count and retry work.

## Development checks

```bash
# Backend
cd backend
python -m pytest

# Frontend
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright runs against the running frontend and API; start both services before `npm run test:e2e`. See each app's package/configuration for browser installation prerequisites.

## Data and methods

- [Implementation plan](docs/PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data dictionary](docs/DATA_DICTIONARY.md)
- [Sources and matching methodology](docs/METHODOLOGY.md)
- [Roadmap](docs/ROADMAP.md)
- [Screenshot guide](docs/SCREENSHOTS.md)
- [Portfolio write-up and resume bullet draft](docs/PORTFOLIO_WRITEUP.md)
- [Verified status and limitations](docs/STATUS.md)

Official references: [openFDA device API](https://open.fda.gov/apis/device/), [adverse events](https://open.fda.gov/apis/device/event/), [device recalls](https://open.fda.gov/apis/device/recall/), [recall enforcement reports](https://open.fda.gov/apis/device/enforcement/), [classification](https://open.fda.gov/apis/device/classification/), [API limits](https://open.fda.gov/apis/authentication/), [terms](https://open.fda.gov/terms/).

## License

Project code is released under the MIT License; see `LICENSE`. openFDA data remains subject to FDA/openFDA terms, license and disclaimers.
