#!/usr/bin/env bash
#
# Create a PostgreSQL custom-format backup from the running production stack.
#
# Usage:
#   scripts/deployment/backup-postgres.sh
#
# Optional overrides:
#   COMPOSE_FILE=... ENV_FILE=... BACKUP_DIR=... POSTGRES_SERVICE=...
#   COMPOSE_CMD='docker compose'   # override the Compose command if needed
#
# The script never prints the database password. Backup files are created with
# mode 600 under BACKUP_DIR (default: backups/).

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

log() {
  echo "[backup] $*"
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Environment file not found: $ENV_FILE (copy .env.production.example)"

if [[ -n "${COMPOSE_CMD:-}" ]]; then
  read -r -a COMPOSE <<< "$COMPOSE_CMD"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  fail "Docker Compose V2 (docker compose) or legacy docker-compose is required"
fi

compose() {
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

compose exec -T "$POSTGRES_SERVICE" true >/dev/null 2>&1 \
  || fail "PostgreSQL service '$POSTGRES_SERVICE' is not running (start the production stack first)"

compose exec -T "$POSTGRES_SERVICE" \
  sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null \
  || fail "PostgreSQL is not accepting connections"

DB_NAME="$(compose exec -T "$POSTGRES_SERVICE" sh -c 'printf %s "$POSTGRES_DB"' | tr -d '\r')"
[[ -n "$DB_NAME" ]] || fail "Could not read POSTGRES_DB from the PostgreSQL container"

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/${DB_NAME}_${timestamp}.dump"
tmp="${target}.tmp"

cleanup() {
  rm -f "$tmp"
}
trap cleanup EXIT

log "Dumping database '$DB_NAME' to $target"
compose exec -T "$POSTGRES_SERVICE" sh -c \
  'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  > "$tmp"

[[ -s "$tmp" ]] || fail "pg_dump produced an empty file"

magic="$(head -c 5 "$tmp" || true)"
[[ "$magic" == "PGDMP" ]] || fail "Backup does not look like a PostgreSQL custom-format dump"

mv "$tmp" "$target"
trap - EXIT
chmod 600 "$target"

size="$(wc -c < "$target" | tr -d ' ')"
log "Backup OK: $target ($size bytes)"
