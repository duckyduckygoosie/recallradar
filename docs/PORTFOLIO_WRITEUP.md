# RecallRadar — portfolio project brief

## Problem

Biomedical engineers often have to inspect fragmented FDA post-market information while preserving the distinctions between adverse-event reports, device recalls, enforcement reports and generic device classifications. A useful research tool must make provenance and data limitations visible, not convert passive-report counts into a misleading safety score.

## Product

RecallRadar is an openFDA-backed exploratory research workspace for search, scoped event analytics, recall review, transparent failure-text categorization, category-level comparison, and private local research notes/exports. The system keeps source entities separate, retains source/retrieval metadata, avoids fuzzy joins, and makes the lack of exposure denominators explicit.

## Technical contribution

- Full-stack Next.js App Router / strict TypeScript UI with responsive navigation, data-backed chart/table surfaces, and browser-local notebook exports.
- FastAPI ingestion and analytics modules around openFDA's device event, recall, enforcement and classification endpoints.
- SQLAlchemy persistence with SQLite default and a configurable relational database URL.
- Defensive schema normalization, bounded retries/pagination, retrieval freshness/error status, deterministic inspectable taxonomy, and source-specific aggregation.
- Tests cover transformation and user-facing workflows; results are recorded in `docs/STATUS.md` only after execution.

## Evidence and limits

Only actual retrieved records are eligible for live metrics. FDA MDR reports are incomplete, potentially duplicated and biased; they cannot establish causality or incidence. Product-code joins are category-level associations, not specific marketed-device identity. There is no patient data, safety ranking or clinical guidance. Current verified scope and test outcomes are in `docs/STATUS.md`.

## Resume bullet draft

- Built RecallRadar, a full-stack biomedical device research platform that ingests and normalizes openFDA adverse-event, recall, enforcement and classification data into a local SQLAlchemy cache, with scoped analytics, transparent deterministic failure-text categorization, responsive visualizations, and reproducible tests; explicitly prevents raw-report counts from being presented as device risk.

Remove or narrow each clause to reflect only the feature and checks verified in `docs/STATUS.md`; do not add impact metrics without measured evidence.
