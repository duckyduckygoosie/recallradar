# Screenshot guide

No screenshots are checked in as static dashboard evidence. Capture the actual running application only after starting both services and retrieving real FDA records.

1. Start backend and frontend using the root README instructions.
2. Run `python -m app.cli refresh --limit 25` from `backend/`, or submit a real device/product-code search in the UI.
3. Confirm the header shows live/cache freshness or a visible source error; do not hide an empty cache.
4. Capture these responsive states in a browser at desktop and narrow mobile widths:
   - Overview with source status, scoped retrieved-record time series, and methodology panel.
   - Search results with filters and a real FDA source link.
   - Record detail with source fields and category-level match disclaimer.
   - Recalls with root-cause/taxonomy trace text and Unknown behavior when no rule matches.
   - Compare with the no-exposure-denominator warning and no rank/order score.
   - Research Notebook with locally saved search, note, source link, and CSV/JSON export.
5. Include only screenshots generated from the running version and current source/cache state. The UI should make the retrieval time and query scope legible. Do not alter counts or crop away warnings.
