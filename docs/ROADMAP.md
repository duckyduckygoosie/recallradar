# Roadmap

## Current MVP boundary

Local, no-login research UI; on-demand and bounded openFDA retrieval; normalized cache; scoped search and report analytics; separate event, recall, enforcement and classification records; deterministic recall-text taxonomy; local notes/filters and export. It is not a safety ranking or alert service.

## Next, evidence-driven improvements

- Add reproducible incremental sync checkpoints and explicit source-version/dataset update reporting without implying complete historical coverage.
- Add background task scheduling and admin-visible refresh runs if interactive refresh limits become inadequate.
- Extend exact-identifier matching only after documenting and testing source field semantics; preserve an unlinked state for ambiguous matches.
- Add more supported FDA sources (510(k), PMA, UDI) with source-specific schemas and explicit provenance rather than merging unlike entities.
- Evaluate additional taxonomy terms against a reviewed, versioned test corpus; preserve deterministic behavior and visible rationale. Optional local NLP should remain disabled unless validated and never replace the source text.
- Add PostgreSQL deployment guidance, schema migration tooling, backup/retention policy and operational telemetry with privacy minimization.
- Conduct usability/accessibility review with biomedical engineers and test keyboard/screen-reader workflows across mobile/desktop.

## Out of scope

Clinical recommendations, risk/quality rankings from raw report counts, public hazard alerts, patient-level record processing, unsupported causal inference, paid APIs, and accounts/payments.
