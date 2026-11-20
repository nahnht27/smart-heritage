#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_MAJOR="${EXPECTED_POSTGRES_MAJOR:-16}"

log() {
  printf '[restore] %s\n' "$*" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<'EOF'
Usage: scripts/database/restore.sh <backup-file.dump> <target-database> [--yes]

Required libpq environment:
  PGHOST PGPORT PGUSER
  PGPASSWORD or PGPASSFILE (non-interactive connections)

The target database must already exist and contain no user objects. The script
never creates or drops databases and never uses pg_restore --clean.

Optional:
  EXPECTED_POSTGRES_MAJOR Required server major version (default: 16)
  PROTECTED_DATABASES     Comma-separated blocked names
                          (default: smart_heritage,smart_heritage_prod,
                          smart_heritage_production)
EOF
}

[[ $# -ge 2 && $# -le 3 ]] || { usage; exit 2; }
BACKUP_FILE="$1"
TARGET_DB="$2"
CONFIRM="${3:-}"

[[ "$CONFIRM" == "" || "$CONFIRM" == "--yes" ]] || { usage; exit 2; }
[[ -n "$BACKUP_FILE" && -n "$TARGET_DB" ]] || { usage; exit 2; }

for variable in PGHOST PGPORT PGUSER; do
  [[ -n "${!variable:-}" ]] || fail "$variable is required"
done

for command in pg_restore psql sha256sum head git sed wc cut basename; do
  command -v "$command" >/dev/null 2>&1 || fail "$command is required"
done

[[ -f "$BACKUP_FILE" ]] || fail "backup file not found: $BACKUP_FILE"
[[ -s "$BACKUP_FILE" ]] || fail "backup file is empty: $BACKUP_FILE"
BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd -P)/$(basename "$BACKUP_FILE")"

METADATA_FILE="${BACKUP_FILE}.metadata"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
[[ -f "$METADATA_FILE" ]] || fail "metadata file not found: $METADATA_FILE"
[[ -f "$CHECKSUM_FILE" ]] || fail "checksum file not found: $CHECKSUM_FILE"

metadata_value() {
  local key="$1"
  local line
  while IFS= read -r line; do
    if [[ "$line" == "$key="* ]]; then
      printf '%s' "${line#"$key="}"
      return 0
    fi
  done < "$METADATA_FILE"
  return 1
}

SOURCE_DB="$(metadata_value database)" || fail "metadata is missing database"
SOURCE_SERVER_VERSION="$(metadata_value server_version)" || fail "metadata is missing server_version"
SOURCE_SERVER_VERSION_NUM="$(metadata_value server_version_num)" || fail "metadata is missing server_version_num"
BACKUP_FORMAT="$(metadata_value format)" || fail "metadata is missing format"
METADATA_SIZE="$(metadata_value size_bytes)" || fail "metadata is missing size_bytes"
METADATA_SHA256="$(metadata_value sha256)" || fail "metadata is missing sha256"

[[ "$BACKUP_FORMAT" == "custom" ]] || fail "unsupported backup format: $BACKUP_FORMAT"
[[ "$SOURCE_SERVER_VERSION_NUM" =~ ^[0-9]+$ ]] || fail "invalid metadata server_version_num"
[[ "$METADATA_SIZE" =~ ^[0-9]+$ ]] || fail "invalid metadata size_bytes"
[[ "$METADATA_SHA256" =~ ^[0-9a-f]{64}$ ]] || fail "invalid metadata sha256"

[[ "$TARGET_DB" != "$SOURCE_DB" ]] \
  || fail "target database is the backup source database: $TARGET_DB"
case "$TARGET_DB" in
  postgres|template0|template1)
    fail "refusing to restore into maintenance database: $TARGET_DB"
    ;;
esac

PROTECTED_DATABASES="${PROTECTED_DATABASES:-smart_heritage,smart_heritage_prod,smart_heritage_production}"
IFS=',' read -r -a protected_databases <<< "$PROTECTED_DATABASES"
if [[ -n "$PROTECTED_DATABASES" ]]; then
  for protected_database in "${protected_databases[@]}"; do
    protected_database="${protected_database#"${protected_database%%[![:space:]]*}"}"
    protected_database="${protected_database%"${protected_database##*[![:space:]]}"}"
    [[ "$TARGET_DB" != "$protected_database" ]] \
      || fail "refusing to restore into protected database: $TARGET_DB"
  done
fi

[[ "$(head -c 5 "$BACKUP_FILE")" == "PGDMP" ]] \
  || fail "backup does not have the PGDMP custom-format header"

actual_size="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
[[ "$actual_size" == "$METADATA_SIZE" ]] \
  || fail "backup size mismatch: metadata=$METADATA_SIZE actual=$actual_size"

actual_sha256="$(sha256sum "$BACKUP_FILE" | cut -d ' ' -f1)"
[[ "$actual_sha256" == "$METADATA_SHA256" ]] \
  || fail "backup SHA-256 does not match metadata"

read -r sidecar_sha256 sidecar_name < "$CHECKSUM_FILE"
[[ "$sidecar_sha256" =~ ^[0-9a-f]{64}$ ]] || fail "invalid checksum sidecar"
[[ "$sidecar_name" == "$(basename "$BACKUP_FILE")" ]] \
  || fail "checksum sidecar refers to a different file: $sidecar_name"
[[ "$sidecar_sha256" == "$actual_sha256" ]] \
  || fail "backup SHA-256 does not match checksum sidecar"

pg_restore --list "$BACKUP_FILE" >/dev/null \
  || fail "backup archive is corrupt or unreadable"

pg_restore_version="$(pg_restore --version | sed -E 's/.* ([0-9]+(\.[0-9]+)*).*/\1/')"
pg_restore_major="${pg_restore_version%%.*}"
[[ "$pg_restore_major" =~ ^[0-9]+$ ]] || fail "cannot determine pg_restore version"
source_major=$((SOURCE_SERVER_VERSION_NUM / 10000))
(( pg_restore_major >= source_major )) \
  || fail "pg_restore $pg_restore_version is older than the source server $SOURCE_SERVER_VERSION"

export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"

target_info="$(
  psql -X -qAt -F '|' -w -v ON_ERROR_STOP=1 -d "$TARGET_DB" -c \
    "select current_database(), current_setting('server_version'), current_setting('server_version_num')"
)" || fail "target database is not reachable: $TARGET_DB"

IFS='|' read -r current_target target_server_version target_server_version_num <<< "$target_info"
[[ "$current_target" == "$TARGET_DB" ]] \
  || fail "connected to '$current_target', expected target '$TARGET_DB'"
[[ "$target_server_version_num" =~ ^[0-9]+$ ]] || fail "invalid target server_version_num"

target_major=$((target_server_version_num / 10000))
(( source_major == EXPECTED_MAJOR && target_major == EXPECTED_MAJOR )) \
  || fail "unsupported PostgreSQL version pair: source=$SOURCE_SERVER_VERSION target=$target_server_version (expected major $EXPECTED_MAJOR)"

user_objects="$(
  psql -X -qAt -w -v ON_ERROR_STOP=1 -d "$TARGET_DB" -c \
    "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f', 'i')"
)" || fail "cannot inspect target database: $TARGET_DB"

[[ "$user_objects" == "0" ]] \
  || fail "target database is not empty: $TARGET_DB contains $user_objects user relation(s)"

log "Verified backup for source '$SOURCE_DB' ($SOURCE_SERVER_VERSION)"
log "Target '$TARGET_DB' is empty and PostgreSQL $target_server_version is compatible"

if [[ "$CONFIRM" != "--yes" ]]; then
  if [[ -r /dev/tty ]]; then
    read -r -p "Type the target database name ($TARGET_DB) to restore: " answer < /dev/tty \
      || { printf 'Restore aborted.\n' >&2; exit 1; }
  else
    read -r -p "Type the target database name ($TARGET_DB) to restore: " answer \
      || { printf 'Restore aborted.\n' >&2; exit 1; }
  fi
  [[ "$answer" == "$TARGET_DB" ]] || { printf 'Restore aborted.\n' >&2; exit 1; }
fi

log "Restoring into '$TARGET_DB' with one transaction and no --clean"
pg_restore \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges \
  --no-password \
  --dbname="$TARGET_DB" \
  "$BACKUP_FILE"

verification="$(
  psql -X -qAt -F '|' -w -v ON_ERROR_STOP=1 -d "$TARGET_DB" -c "
    select
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and c.relname in ('heritage_site', 'artifact', 'multimedia', 'role', 'user',
                            'visitor_interaction', 'beacon', 'flyway_schema_history')),
      (select count(*) from flyway_schema_history where success),
      (select count(*) from flyway_schema_history where not success),
      (select coalesce(max(version::int), 0) from flyway_schema_history where success),
      (select count(*) from pg_index where not indisvalid),
      (select count(*) from pg_constraint where contype = 'f'),
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'S')
  "
)" || fail "post-restore verification query failed"

IFS='|' read -r restored_tables success_migrations failed_migrations max_version invalid_indexes foreign_keys sequences <<< "$verification"

[[ "$restored_tables" == "8" ]] || fail "expected 8 application/Flyway tables, found $restored_tables"
[[ "$success_migrations" =~ ^[0-9]+$ ]] || fail "invalid Flyway history count"
(( success_migrations >= 4 )) || fail "Flyway history has fewer than four successful migrations"
[[ "$failed_migrations" == "0" ]] || fail "Flyway history contains failed migrations"
[[ "$max_version" =~ ^[0-9]+$ ]] || fail "invalid Flyway version"
(( max_version >= 4 )) || fail "Flyway history does not include V4"
[[ "$invalid_indexes" == "0" ]] || fail "restored database contains invalid indexes"
(( foreign_keys >= 6 )) || fail "restored database is missing foreign keys (found $foreign_keys)"
(( sequences >= 7 )) || fail "restored database is missing sequences (found $sequences)"

log "Restore OK: $TARGET_DB (Flyway V$max_version, $foreign_keys FKs, $sequences sequences)"
