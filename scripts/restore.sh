#!/usr/bin/env bash
# Branvelo database restore (Phase 7). Companion to backup.sh.
#
# Usage:
#   scripts/restore.sh backups/branvelo-full-20261023-120000.dump [target-db]
#
# A per-schema dump restores that schema into the target database (the
# schema name travels inside the dump). A full dump restores everything.
# The target database must already exist; pg_restore runs with
# --clean --if-exists so restoring over a previous copy is safe.
#
# WARNING: restoring replaces the target's contents for the dumped
# scope. Restore into a scratch database first when in doubt.
set -euo pipefail

DUMP="${1:?usage: restore.sh <dump-file> [target-db]}"
TARGET="${2:-${PGDATABASE:-branvelo}}"

pg_restore --clean --if-exists --no-owner --dbname="$TARGET" "$DUMP"
echo "restored $DUMP into database '$TARGET'"
