#!/bin/sh
# Restore the database from a backup written by the API at start-up
# (./backups/golden-gai-<date>-<time>[-before-<migration>].sql.gz).
#
#   ./scripts/restore-db.sh                 list the backups
#   ./scripts/restore-db.sh backups/<file>  restore that one
#
# What it does: stops the API, takes one more backup of the database as it is
# now (so a restore can itself be undone), empties the database, loads the
# file, and starts the API again. Uploaded photos are not part of these
# backups and are not touched.
#
# If you are going back because an update went wrong, check out the previous
# version of the code first (git checkout <commit>) and rebuild
# (docker compose up -d --build), otherwise the API will simply re-apply the
# newer migrations on top of the restored data when it starts.
#
# Without Docker (development): set DATABASE_URL and it uses local psql/pg_dump.
set -eu

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-backups}"

if [ $# -lt 1 ]; then
  echo "Backups in $BACKUP_DIR (newest first):"
  ls -1t "$BACKUP_DIR"/golden-gai-*.sql.gz 2>/dev/null || echo "  (none)"
  echo
  echo "Usage: $0 $BACKUP_DIR/<file>"
  exit 0
fi

FILE="$1"
[ -f "$FILE" ] || { echo "No such file: $FILE" >&2; exit 1; }
gzip -t "$FILE" || { echo "Not a valid gzip file: $FILE" >&2; exit 1; }

if [ -n "${DATABASE_URL:-}" ]; then
  run_psql() { psql --quiet --output /dev/null --set ON_ERROR_STOP=1 "$DATABASE_URL" "$@"; }
  run_dump() { pg_dump --no-owner --no-privileges --clean --if-exists "$DATABASE_URL"; }
  stop_api() { :; }
  start_api() { echo "Restart the API yourself (npm run dev:server)."; }
else
  run_psql() { docker compose exec -T db psql --quiet --output /dev/null --set ON_ERROR_STOP=1 -U golden_gai -d golden_gai "$@"; }
  run_dump() { docker compose exec -T db pg_dump --no-owner --no-privileges --clean --if-exists -U golden_gai -d golden_gai; }
  stop_api() { docker compose stop api; }
  start_api() { docker compose start api; }
fi

echo "This replaces EVERYTHING in the database with the contents of:"
echo "  $FILE"
if [ "${RESTORE_YES:-}" != "1" ]; then
  printf "Type 'restore' to continue: "
  read -r answer
  [ "$answer" = "restore" ] || { echo "Cancelled. Nothing was changed."; exit 1; }
fi

stop_api

SAFETY="$BACKUP_DIR/golden-gai-$(date -u +%Y%m%d-%H%M%S)-before-restore.sql.gz"
echo "Saving the current database to $SAFETY"
mkdir -p "$BACKUP_DIR"
run_dump | gzip > "$SAFETY.part"
mv "$SAFETY.part" "$SAFETY"

echo "Restoring..."
# One transaction: if loading fails, the database is left exactly as it was.
{
  echo "SET client_min_messages = warning;"
  echo "BEGIN;"
  echo "DROP SCHEMA public CASCADE;"
  echo "CREATE SCHEMA public;"
  # A dump written by a newer pg_dump than the server has settings and psql
  # commands the server does not know; they are not needed to restore.
  gunzip -c "$FILE" | grep -v -E '^(SET transaction_timeout|\\restrict|\\unrestrict)'
  echo "COMMIT;"
} | run_psql

echo "Restored from $FILE"
start_api
