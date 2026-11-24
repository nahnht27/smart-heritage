#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
EXPECTED_MAJOR="${EXPECTED_POSTGRES_MAJOR:-16}"

log() {
  printf '[backup] %s\n' "$*" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<'EOF'
Usage: scripts/database/backup.sh [--output-dir DIR]

Required libpq environment:
  PGHOST PGPORT PGDATABASE PGUSER
  PGPASSWORD or PGPASSFILE (non-interactive connections)

Optional:
  BACKUP_DIR              Output directory (default: backups/)
  EXPECTED_POSTGRES_MAJOR Required server major version (default: 16)

The final backup path is written to stdout; progress messages go to stderr.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

for variable in PGHOST PGPORT PGDATABASE PGUSER; do
  [[ -n "${!variable:-}" ]] || fail "$variable is required"
done

for command in pg_dump pg_restore psql sha256sum mktemp date head git sed tr wc cut basename; do
  command -v "$command" >/dev/null 2>&1 || fail "$command is required"
done

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd -P)"
[[ "$OUTPUT_DIR" != "$ROOT_DIR" ]] \
  || fail "BACKUP_DIR must not be the repository root: $OUTPUT_DIR"

case "$OUTPUT_DIR/" in
  "$ROOT_DIR"/*)
    relative_output_dir="${OUTPUT_DIR#"$ROOT_DIR"/}"
    git -C "$ROOT_DIR" check-ignore -q -- "${relative_output_dir}/" \
      || fail "BACKUP_DIR is inside the repository but not gitignored: $OUTPUT_DIR"
    ;;
esac

umask 077
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"

connection_info="$(
  psql -X -qAt -F '|' -w -v ON_ERROR_STOP=1 -c \
    "select current_database(), current_setting('server_version'), current_setting('server_version_num')"
)" || fail "cannot connect to PostgreSQL as $PGUSER"

IFS='|' read -r current_database server_version server_version_num <<< "$connection_info"

[[ "$current_database" == "$PGDATABASE" ]] \
  || fail "connected to '$current_database', expected '$PGDATABASE'"
[[ "$server_version_num" =~ ^[0-9]+$ ]] || fail "invalid server_version_num: $server_version_num"

server_major=$((server_version_num / 10000))
(( server_major == EXPECTED_MAJOR )) \
  || fail "PostgreSQL server major $server_major is not supported; expected $EXPECTED_MAJOR"

pg_dump_version="$(pg_dump --version | sed -E 's/.* ([0-9]+(\.[0-9]+)*).*/\1/')"
pg_dump_major="${pg_dump_version%%.*}"
[[ "$pg_dump_major" =~ ^[0-9]+$ ]] || fail "cannot determine pg_dump version"

(( pg_dump_major >= server_major )) \
  || fail "pg_dump $pg_dump_version is older than PostgreSQL server $server_version"

created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
file_timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_slug="$(printf '%s' "$PGDATABASE" | tr -c 'A-Za-z0-9_.-' '_')"
database_slug="${database_slug%_}"
[[ -n "$database_slug" ]] || database_slug="database"

target="$OUTPUT_DIR/${database_slug}_${file_timestamp}.dump"
[[ ! -e "$target" ]] || fail "backup already exists: $target"
tmp_dump="$(mktemp "$OUTPUT_DIR/.${database_slug}_${file_timestamp}.dump.XXXXXX")"
tmp_metadata="$(mktemp "$OUTPUT_DIR/.${database_slug}_${file_timestamp}.metadata.XXXXXX")"
tmp_checksum="$(mktemp "$OUTPUT_DIR/.${database_slug}_${file_timestamp}.sha256.XXXXXX")"
chmod 600 "$tmp_dump" "$tmp_metadata" "$tmp_checksum"

cleanup() {
  rm -f "$tmp_dump" "$tmp_metadata" "$tmp_checksum"
}
trap cleanup EXIT

log "Dumping database '$PGDATABASE' from $PGHOST:$PGPORT"
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --no-password \
  --file="$tmp_dump" \
  --dbname="$PGDATABASE"

[[ -s "$tmp_dump" ]] || fail "pg_dump produced an empty file"
[[ "$(head -c 5 "$tmp_dump")" == "PGDMP" ]] || fail "backup does not have the PGDMP custom-format header"

pg_restore --list "$tmp_dump" >/dev/null \
  || fail "pg_restore cannot read the generated archive"

size_bytes="$(wc -c < "$tmp_dump" | tr -d ' ')"
sha256="$(sha256sum "$tmp_dump" | cut -d ' ' -f1)"
[[ "$sha256" =~ ^[0-9a-f]{64}$ ]] || fail "could not compute SHA-256"

cat > "$tmp_metadata" <<EOF
format=custom
database=$PGDATABASE
server_version=$server_version
server_version_num=$server_version_num
pg_dump_version=$pg_dump_version
created_at_utc=$created_at
size_bytes=$size_bytes
sha256=$sha256
EOF

printf '%s  %s\n' "$sha256" "$(basename "$target")" > "$tmp_checksum"

mv "$tmp_dump" "$target"
mv "$tmp_metadata" "$target.metadata"
mv "$tmp_checksum" "$target.sha256"
trap - EXIT

log "Backup OK: $size_bytes bytes, SHA-256 $sha256"
printf '%s\n' "$target"
