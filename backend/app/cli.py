from __future__ import annotations

import argparse
import asyncio

from .database import SessionLocal, init_db
from .ingestion import refresh
from .persistence import RECORD_TYPES


async def _refresh(record_types: list[str], limit: int, pages: int) -> None:
    init_db()
    failed = False
    with SessionLocal() as db:
        for record_type in record_types:
            try:
                inserted = await refresh(db, record_type, limit=limit, pages=pages)
                print(f"{record_type}: ingested {inserted} new records")
            except Exception as exc:
                failed = True
                print(f"{record_type}: refresh failed: {exc}")
    if failed:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)
    refresh_parser = subparsers.add_parser("refresh", help="Fetch bounded pages from openFDA")
    refresh_parser.add_argument("--limit", type=int, default=100, choices=range(1, 1001), metavar="1..1000")
    refresh_parser.add_argument("--pages", type=int, default=1, choices=range(1, 21), metavar="1..20")
    refresh_parser.add_argument("--record-type", choices=(*RECORD_TYPES, "all"), default="all")
    args = parser.parse_args()
    if args.command == "refresh":
        record_types = list(RECORD_TYPES) if args.record_type == "all" else [args.record_type]
        asyncio.run(_refresh(record_types, args.limit, args.pages))


if __name__ == "__main__":
    main()
