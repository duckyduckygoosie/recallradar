# RecallRadar frontend

Next.js App Router research UI. Start the FastAPI service from `../backend` and refresh its cached FDA sources before exploring; the UI intentionally includes no demo or fixture records. Copy `.env.example` to `.env.local` only when the API is hosted somewhere other than `http://127.0.0.1:8000`.

```sh
npm install
npm run dev
```

The browser calls relative `/api/v1/...` paths, rewritten to `API_PROXY_TARGET` (default `http://127.0.0.1:8000`). The API service must allow browser requests from `http://localhost:3000` if accessed outside the Next.js proxy.

`npm run test:e2e` starts the frontend and expects a running API with a bounded cache containing at least one coded FDA record. The Playwright smoke covers search, sourced detail, category timeline, and local notebook JSON export; it does not seed or mock API records. Install the Playwright browser once with `npx playwright install chromium` if needed.

`npm run test` runs unit tests; `npm run lint`, `npm run typecheck`, and `npm run build` cover static checks and production compilation.
