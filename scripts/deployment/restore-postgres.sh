#!/usr/bin/env bash
#
# Restore a PostgreSQL custom-format backup into a target database.
#
# Usage:
#   scripts/deployment/restore-postgres.sh <backup-file.dump>
#
# Safety:
#   - Prompts for the exact target database name before doing anything.
#   - Refuses to restore into the primary database.
#   - Refuses to restore into a target that already contains user objects.
#   - Never uses pg_restore --clean and never deletes the Docker volume.
#
# Optional overrides:
#   COMPOSE_FILE=... ENV_FILE=... POSTGRES_SERVICE=... RESTORE_DB=...
#   COMPOSE_CMD='docker compose'   # override the Compose command if needed
#   CONFIRM_RESTORE=yes          # non-interactive confirmation (automation)

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-file.dump>" >&2
  exit 2
fi

BACKUP_FILE="$1"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

log() {
  echo "[restore] $*"
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Environment file not found: $ENV_FILE"
[[ -f "$BACKUP_FILE" ]] || fail "Backup file not found: $BACKUP_FILE"
[[ -s "$BACKUP_FILE" ]] || fail "Backup file is empty: $BACKUP_FILE"

magic="$(head -c 5 "$BACKUP_FILE" || true)"
[[ "$magic" == "PGDMP" ]] || fail "Not a PostgreSQL custom-format dump: $BACKUP_FILE"

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

PRIMARY_DB="$(compose exec -T "$POSTGRES_SERVICE" sh -c 'printf %s "$POSTGRES_DB"' | tr -d '\r')"
TARGET_DB="${RESTORE_DB:-$PRIMARY_DB}"
[[ -n "$TARGET_DB" ]] || fail "Could not determine target database"

if ! compose exec -T "$POSTGRES_SERVICE" \
  sh -c 'psql -U "$POSTGRES_USER" -d "$1" -c "SELECT 1" >/dev/null' sh "$TARGET_DB"; then
  fail "Database '$TARGET_DB' is not reachable. Create it first (createdb) or set RESTORE_DB."
fi

if [[ "$TARGET_DB" == "$PRIMARY_DB" ]]; then
  echo "Refusing to restore into the primary database '$PRIMARY_DB'." >&2
  echo "Create a separate empty database and set RESTORE_DB." >&2
  exit 1
fi

empty_check_sql="select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f', 'i')"
existing_objects="$(compose exec -T "$POSTGRES_SERVICE" sh -c \
  'psql -U "$POSTGRES_USER" -d "$1" -At -v ON_ERROR_STOP=1 -c "$2"' \
  sh "$TARGET_DB" "$empty_check_sql" | tr -d '\r')" \
  || fail "Could not inspect target database '$TARGET_DB'"

[[ "$existing_objects" == "0" ]] \
  || fail "Target database '$TARGET_DB' is not empty ($existing_objects user relation(s))"

cat >&2 <<EOF
Restore target verified empty
  Backup : $BACKUP_FILE
  Target : $TARGET_DB
The target database will receive objects from the backup. The Docker volume is
NOT deleted. A failed restore is rolled back by --single-transaction.
EOF

if [[ "${CONFIRM_RESTORE:-}" != "yes" ]]; then
  # Read from the controlling terminal when available: earlier `compose exec -T`
  # calls must not consume the confirmation input from a pipe.
  if [[ -r /dev/tty ]]; then
    read -r -p "Type the target database name ($TARGET_DB) to confirm: " answer < /dev/tty \
      || { echo "Restore aborted (no confirmation)." >&2; exit 1; }
  else
    read -r -p "Type the target database name ($TARGET_DB) to confirm: " answer \
      || { echo "Restore aborted (no confirmation)." >&2; exit 1; }
  fi
  [[ "$answer" == "$TARGET_DB" ]] || { echo "Restore aborted." >&2; exit 1; }
fi

log "Restoring $BACKUP_FILE into '$TARGET_DB'"
compose exec -T "$POSTGRES_SERVICE" sh -c \
  'exec pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --no-owner --no-privileges --single-transaction' \
  sh "$TARGET_DB" < "$BACKUP_FILE"

compose exec -T "$POSTGRES_SERVICE" \
  sh -c 'psql -U "$POSTGRES_USER" -d "$1" -c "SELECT 1" >/dev/null' sh "$TARGET_DB" \
  || fail "Restore finished but the target database is not reachable"

log "Restore OK: $TARGET_DB"
