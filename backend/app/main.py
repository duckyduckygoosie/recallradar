from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .database import init_db

app = FastAPI(title="RecallRadar API", version="0.1.0", description="Cached openFDA research data; not a medical device safety ranking.")
origins = [value.strip() for value in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET"], allow_headers=["*"])
app.include_router(router)


@app.on_event("startup")
def startup() -> None:
    init_db()
