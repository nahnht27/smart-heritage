#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_MAJOR="${EXPECTED_POSTGRES_MAJOR:-16}"
MAX_DATABASE_NAME_LENGTH=63
TEST_DB_PREFIX="${TEST_DB_PREFIX:-s6_backup_restore_}"
APP_TEST_PORT="${APP_TEST_PORT:-18081}"
REQUIRE_APP_CHECK="${REQUIRE_APP_CHECK:-0}"
FLYWAY_MODE="${FLYWAY_MODE:-auto}"

log() {
  printf '[test-backup-restore] %s\n' "$*" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

if [[ ! "$TEST_DB_PREFIX" =~ ^[a-z][a-z0-9_]{0,30}$ ]]; then
  fail "TEST_DB_PREFIX must be lowercase letters, digits and underscores (max 31 chars)"
fi

for variable in PGHOST PGPORT PGUSER PGPASSWORD; do
  [[ -n "${!variable:-}" ]] || fail "$variable is required for the disposable test"
done

for command in psql pg_dump pg_restore createdb dropdb sha256sum truncate sed curl java; do
  command -v "$command" >/dev/null 2>&1 || fail "$command is required"
done

if [[ "$FLYWAY_MODE" == "auto" ]]; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    FLYWAY_MODE="docker"
  else
    FLYWAY_MODE="maven"
  fi
fi

case "$FLYWAY_MODE" in
  docker)
    command -v docker >/dev/null 2>&1 || fail "docker is required for FLYWAY_MODE=docker"
    docker info >/dev/null 2>&1 || fail "Docker daemon is required for FLYWAY_MODE=docker"
    ;;
  maven)
    [[ -x "$ROOT_DIR/backend/mvnw" ]] || fail "backend/mvnw is required for FLYWAY_MODE=maven"
    ;;
  *)
    fail "FLYWAY_MODE must be auto, docker or maven"
    ;;
esac

export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"
export PGTZ=UTC
export EXPECTED_POSTGRES_MAJOR="$EXPECTED_MAJOR"
export FLYWAY_NETWORK="${FLYWAY_NETWORK:-host}"

run_id="$(date -u +%Y%m%d%H%M%S)_$$"
SOURCE_DB="${TEST_DB_PREFIX}${run_id}_src"
TARGET_DB="${TEST_DB_PREFIX}${run_id}_tgt"
NONEMPTY_DB="${TEST_DB_PREFIX}${run_id}_nonempty"

for database in "$SOURCE_DB" "$TARGET_DB" "$NONEMPTY_DB"; do
  (( ${#database} <= MAX_DATABASE_NAME_LENGTH )) \
    || fail "generated database name is too long: $database"
  [[ "$database" == "$TEST_DB_PREFIX"* ]] || fail "unsafe database name: $database"
done

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/s6-backup-restore.XXXXXX")"
chmod 700 "$TMP_DIR"
BACKUP_DIR="$TMP_DIR/backups"
CREATED_DATABASES=()
APP_PID=""

all_databases=("$SOURCE_DB" "$TARGET_DB" "$NONEMPTY_DB")

stop_backend() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" >/dev/null 2>&1; then
    kill -TERM "$APP_PID" >/dev/null 2>&1 || true
    for _ in $(seq 1 30); do
      kill -0 "$APP_PID" >/dev/null 2>&1 || break
      sleep 1
    done
    if kill -0 "$APP_PID" >/dev/null 2>&1; then
      kill -KILL "$APP_PID" >/dev/null 2>&1 || true
    fi
    wait "$APP_PID" 2>/dev/null || true
  fi
  APP_PID=""
}

cleanup() {
  local status=$?
  trap - EXIT
  stop_backend

  for database in "${CREATED_DATABASES[@]}"; do
    [[ "$database" == "$TEST_DB_PREFIX"* ]] \
      || { log "refusing to drop unexpected database: $database"; continue; }
    found=0
    for expected_database in "${all_databases[@]}"; do
      if [[ "$database" == "$expected_database" ]]; then
        found=1
        break
      fi
    done
    [[ "$found" == "1" ]] \
      || { log "refusing to drop unexpected database: $database"; continue; }
    dropdb --no-password --if-exists --force --maintenance-db=postgres "$database" >/dev/null 2>&1 \
      || log "could not drop test database: $database"
  done

  rm -rf "$TMP_DIR"
  exit "$status"
}
trap cleanup EXIT

psql_db() {
  local database="$1"
  shift
  psql -X -qAt -w -v ON_ERROR_STOP=1 -d "$database" "$@"
}

run_flyway() {
  local goal="$1"
  if [[ "$FLYWAY_MODE" == "docker" ]]; then
    "$ROOT_DIR/scripts/database/flyway.sh" "$goal"
  else
    (cd "$ROOT_DIR/backend" && ./mvnw -B -q "flyway:$goal")
  fi
}

create_database() {
  local database="$1"
  createdb --no-password --maintenance-db=postgres --template=template0 --encoding=UTF8 "$database"
  CREATED_DATABASES+=("$database")
}

assert_empty_target() {
  local database="$1"
  local count
  count="$(psql_db "$database" -c \
    "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f', 'i')")"
  [[ "$count" == "0" ]] || fail "expected empty target '$database', found $count user relation(s)"
}

jdbc_host="$PGHOST"
if [[ "$jdbc_host" == *:* && "$jdbc_host" != \[*\] ]]; then
  jdbc_host="[$jdbc_host]"
fi
jdbc_base="jdbc:postgresql://${jdbc_host}:${PGPORT}"

write_snapshot() {
  local database="$1"
  local output="$2"

  {
    psql_db "$database" -c "select 'role|' || to_jsonb(t)::text from public.role t order by role_id"
    psql_db "$database" -c "select 'user|' || to_jsonb(t)::text from public.\"user\" t order by user_id"
    psql_db "$database" -c "select 'heritage_site|' || to_jsonb(t)::text from public.heritage_site t order by site_id"
    psql_db "$database" -c "select 'artifact|' || to_jsonb(t)::text from public.artifact t order by artifact_id"
    psql_db "$database" -c "select 'multimedia|' || to_jsonb(t)::text from public.multimedia t order by multimedia_id"
    psql_db "$database" -c "select 'beacon|' || to_jsonb(t)::text from public.beacon t order by beacon_id"
    psql_db "$database" -c "select 'visitor_interaction|' || to_jsonb(t)::text from public.visitor_interaction t order by interaction_id"
    psql_db "$database" -c "select 'column|' || table_name || '|' || column_name || '|' || data_type || '|' || is_nullable || '|' || coalesce(column_default, '') from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position"
    psql_db "$database" -c "select 'index|' || indexname || '|' || indexdef from pg_indexes where schemaname = 'public' order by indexname"
    psql_db "$database" -c "select 'constraint|' || c.conname || '|' || c.contype::text || '|' || pg_get_constraintdef(c.oid, true) from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public' order by c.conname"
    psql_db "$database" -c "select 'sequence|' || sequencename || '|' || coalesce((xpath('/row/last_value/text()', query_to_xml(format('select last_value from %I.%I', schemaname, sequencename), false, true, '')))[1]::text, 'null') || '|' || coalesce((xpath('/row/is_called/text()', query_to_xml(format('select is_called from %I.%I', schemaname, sequencename), false, true, '')))[1]::text, 'null') from pg_sequences where schemaname = 'public' order by sequencename"
    psql_db "$database" -c "select 'flyway|' || installed_rank || '|' || coalesce(version, '') || '|' || description || '|' || type || '|' || script || '|' || coalesce(checksum::text, '') || '|' || success::text from flyway_schema_history order by installed_rank"
  } > "$output"
}

log "Creating disposable PostgreSQL $EXPECTED_MAJOR databases"
create_database "$SOURCE_DB"
create_database "$TARGET_DB"
create_database "$NONEMPTY_DB"

export SPRING_DATASOURCE_URL="${jdbc_base}/${SOURCE_DB}"
export SPRING_DATASOURCE_USERNAME="$PGUSER"
export SPRING_DATASOURCE_PASSWORD="$PGPASSWORD"

log "Migrating source database with Flyway ($FLYWAY_MODE mode)"
run_flyway migrate

log "Seeding deterministic fixture data"
PGDATABASE="$SOURCE_DB" psql -X -q -w -v ON_ERROR_STOP=1 \
  -f "$ROOT_DIR/scripts/database/fixtures/backup-restore-fixture.sql"

write_snapshot "$SOURCE_DB" "$TMP_DIR/source.snapshot"

log "Creating backup"
backup_file="$(
  PGDATABASE="$SOURCE_DB" \
    "$ROOT_DIR/scripts/database/backup.sh" --output-dir "$BACKUP_DIR"
)"
[[ -f "$backup_file" ]] || fail "backup script did not create a file"
[[ -f "${backup_file}.metadata" ]] || fail "backup metadata is missing"
[[ -f "${backup_file}.sha256" ]] || fail "backup checksum is missing"

corrupt_base="$TMP_DIR/corrupt.dump"
cp "$backup_file" "$corrupt_base"
cp "${backup_file}.metadata" "${corrupt_base}.metadata"
cp "${backup_file}.sha256" "${corrupt_base}.sha256"
backup_size="$(wc -c < "$corrupt_base" | tr -d ' ')"
(( backup_size > 32 )) || fail "backup is too small for the corruption scenario"
truncate -s "$(( backup_size - 32 ))" "$corrupt_base"
corrupt_size="$(wc -c < "$corrupt_base" | tr -d ' ')"
corrupt_sha="$(sha256sum "$corrupt_base" | cut -d ' ' -f1)"
sed -i \
  -e "s/^size_bytes=.*/size_bytes=$corrupt_size/" \
  -e "s/^sha256=.*/sha256=$corrupt_sha/" \
  "${corrupt_base}.metadata"
printf '%s  %s\n' "$corrupt_sha" "$(basename "$corrupt_base")" > "${corrupt_base}.sha256"

log "Scenario: corrupt archive must fail and leave the target empty"
if "$ROOT_DIR/scripts/database/restore.sh" "$corrupt_base" "$TARGET_DB" --yes \
    >"$TMP_DIR/corrupt-restore.log" 2>&1; then
  fail "restore unexpectedly accepted a corrupt archive"
fi
assert_empty_target "$TARGET_DB"

checksum_base="$TMP_DIR/checksum-mismatch.dump"
cp "$backup_file" "$checksum_base"
cp "${backup_file}.metadata" "${checksum_base}.metadata"
cp "${backup_file}.sha256" "${checksum_base}.sha256"
original_sha="$(sha256sum "$backup_file" | cut -d ' ' -f1)"
printf 'x' >> "$checksum_base"
checksum_size="$(wc -c < "$checksum_base" | tr -d ' ')"
sed -i "s/^size_bytes=.*/size_bytes=$checksum_size/" "${checksum_base}.metadata"
printf '%s  %s\n' "$original_sha" "$(basename "$checksum_base")" > "${checksum_base}.sha256"

log "Scenario: checksum mismatch must fail before restore"
if "$ROOT_DIR/scripts/database/restore.sh" "$checksum_base" "$TARGET_DB" --yes \
    >"$TMP_DIR/checksum-restore.log" 2>&1; then
  fail "restore unexpectedly accepted a checksum mismatch"
fi
assert_empty_target "$TARGET_DB"

version_base="$TMP_DIR/incompatible-version.dump"
cp "$backup_file" "$version_base"
cp "${backup_file}.metadata" "${version_base}.metadata"
cp "${backup_file}.sha256" "${version_base}.sha256"
sed -i \
  -e "s/^server_version=.*/server_version=15.0/" \
  -e "s/^server_version_num=.*/server_version_num=150000/" \
  "${version_base}.metadata"
version_sha="$(sha256sum "$version_base" | cut -d ' ' -f1)"
printf '%s  %s\n' "$version_sha" "$(basename "$version_base")" > "${version_base}.sha256"

log "Scenario: incompatible PostgreSQL version must be refused"
if "$ROOT_DIR/scripts/database/restore.sh" "$version_base" "$TARGET_DB" --yes \
    >"$TMP_DIR/version-restore.log" 2>&1; then
  fail "restore unexpectedly accepted an incompatible PostgreSQL version"
fi
assert_empty_target "$TARGET_DB"

log "Scenario: default protected production name must be refused"
if env -u PROTECTED_DATABASES "$ROOT_DIR/scripts/database/restore.sh" \
    "$backup_file" smart_heritage --yes \
    >"$TMP_DIR/protected-restore.log" 2>&1; then
  fail "restore unexpectedly accepted the protected production database name"
fi
grep -q "protected database" "$TMP_DIR/protected-restore.log" \
  || fail "protected-name refusal did not report the protection guard"
assert_empty_target "$TARGET_DB"

log "Scenario: source database must not be a restore target"
if "$ROOT_DIR/scripts/database/restore.sh" "$backup_file" "$SOURCE_DB" --yes \
    >"$TMP_DIR/source-target-restore.log" 2>&1; then
  fail "restore unexpectedly accepted the source database as target"
fi
write_snapshot "$SOURCE_DB" "$TMP_DIR/source-after-refusals.snapshot"
diff -u "$TMP_DIR/source.snapshot" "$TMP_DIR/source-after-refusals.snapshot" \
  || fail "source database changed during refused restores"

psql_db "$NONEMPTY_DB" -c "create table restore_safety_marker (id integer primary key)"

log "Scenario: non-empty target must be refused"
if "$ROOT_DIR/scripts/database/restore.sh" "$backup_file" "$NONEMPTY_DB" --yes \
    >"$TMP_DIR/nonempty-restore.log" 2>&1; then
  fail "restore unexpectedly accepted a non-empty target"
fi
marker_count="$(psql_db "$NONEMPTY_DB" -c "select count(*) from restore_safety_marker")"
[[ "$marker_count" == "0" ]] || fail "non-empty target changed during refused restore"

log "Restoring into the empty target"
"$ROOT_DIR/scripts/database/restore.sh" "$backup_file" "$TARGET_DB" --yes

log "Comparing source and restored data/schema/Flyway state"
write_snapshot "$TARGET_DB" "$TMP_DIR/restored.snapshot"
diff -u "$TMP_DIR/source.snapshot" "$TMP_DIR/restored.snapshot" \
  || fail "restored database does not match the source"

log "Validating Flyway state on the restored database"
export SPRING_DATASOURCE_URL="${jdbc_base}/${TARGET_DB}"
run_flyway info
run_flyway validate

log "Checking sequence state inside a rolled-back transaction"
sequence_result="$(
  psql_db "$TARGET_DB" <<'SQL'
BEGIN;
WITH before AS (
    SELECT coalesce(max(site_id), 0) AS max_id FROM public.heritage_site
), inserted AS (
    INSERT INTO public.heritage_site (name)
    VALUES ('sequence-integrity-check')
    RETURNING site_id
)
SELECT CASE WHEN inserted.site_id > before.max_id THEN 'ok' ELSE 'failed' END
FROM inserted, before;
ROLLBACK;
SQL
)"
grep -qx 'ok' <<< "$sequence_result" \
  || fail "restored sequence did not generate an ID above the existing maximum"

if [[ -z "${BACKEND_JAR:-}" ]]; then
  for candidate in "$ROOT_DIR"/backend/target/backend-*.jar; do
    if [[ -f "$candidate" ]]; then
      BACKEND_JAR="$candidate"
      break
    fi
  done
fi

if [[ -z "${BACKEND_JAR:-}" ]]; then
  [[ "$REQUIRE_APP_CHECK" != "1" ]] \
    || fail "BACKEND_JAR is required for the application compatibility check"
  log "Skipping application check: BACKEND_JAR is not set"
else
  [[ -f "$BACKEND_JAR" ]] || fail "BACKEND_JAR not found: $BACKEND_JAR"
  BACKEND_JAR="$(cd "$(dirname "$BACKEND_JAR")" && pwd -P)/$(basename "$BACKEND_JAR")"
  app_log="$TMP_DIR/backend.log"

  log "Starting backend against the restored database"
  SPRING_DATASOURCE_URL="${jdbc_base}/${TARGET_DB}" \
  SPRING_DATASOURCE_USERNAME="$PGUSER" \
  SPRING_DATASOURCE_PASSWORD="$PGPASSWORD" \
  SPRING_PROFILES_ACTIVE=prod \
  SPRING_FLYWAY_ENABLED=true \
  SPRING_JPA_HIBERNATE_DDL_AUTO=validate \
  JWT_SECRET="BackupRestoreTestSecretThatIsAtLeast256BitsLong!2026" \
  CORS_ALLOWED_ORIGINS="http://127.0.0.1:${APP_TEST_PORT}" \
    java -jar "$BACKEND_JAR" --server.port="$APP_TEST_PORT" >"$app_log" 2>&1 &
  APP_PID=$!

  healthy=0
  for _ in $(seq 1 90); do
    if ! kill -0 "$APP_PID" >/dev/null 2>&1; then
      tail -n 80 "$app_log" >&2 || true
      fail "backend exited before becoming healthy"
    fi
    if curl -fsS "http://127.0.0.1:${APP_TEST_PORT}/api/health" 2>/dev/null \
        | grep -q '"status":"UP"'; then
      healthy=1
      break
    fi
    sleep 1
  done

  if [[ "$healthy" != "1" ]]; then
    tail -n 80 "$app_log" >&2 || true
    fail "backend did not become healthy against the restored database"
  fi

  curl -fsS "http://127.0.0.1:${APP_TEST_PORT}/api/heritage-sites" \
    | grep -q 'S6 Backup Heritage Site' \
    || fail "restored heritage site is not available through the API"
  curl -fsS -G "http://127.0.0.1:${APP_TEST_PORT}/api/beacons/resolve" \
    --data-urlencode "uuid=66666666-6666-4666-8666-666666666666" \
    --data-urlencode "major=321" \
    --data-urlencode "minor=654" \
    | grep -q 'S6 Backup Artifact' \
    || fail "restored beacon does not resolve to the expected artifact"

  stop_backend
  log "Application compatibility check passed"
fi

log "PASS: backup, safety refusals, restore, data/schema/Flyway and sequence checks"
