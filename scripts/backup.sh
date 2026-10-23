#!/usr/bin/env bash
# Branvelo database backup (Phase 7).
#
# Usage:
#   scripts/backup.sh                 full database dump
#   scripts/backup.sh spice_route     one tenant's schema only
#
# Connection comes from the standard PG* environment (PGHOST, PGPORT,
# PGUSER, PGPASSWORD, PGDATABASE). On the server, run it inside the db
# container where those are already set:
#   docker compose exec db /app/scripts/backup.sh
# Locally, point PGHOST at your Postgres and run it directly.
#
# Output: backups/branvelo-<scope>-<timestamp>.dump (pg_dump custom format)
set -euo pipefail

SCOPE="${1:-full}"
DB="${PGDATABASE:-branvelo}"
OUT_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/branvelo-$SCOPE-$STAMP.dump"

if [ "$SCOPE" = "full" ]; then
  pg_dump --format=custom --file="$OUT" "$DB"
else
  pg_dump --format=custom --schema="$SCOPE" --file="$OUT" "$DB"
fi
echo "backup written: $OUT"
