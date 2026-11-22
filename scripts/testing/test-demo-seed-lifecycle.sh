#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:18082}"
POSTGRES_DB="${POSTGRES_DB:-smart_heritage_seed_ci}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
BACKEND_PORT="${BACKEND_PORT:-18082}"
POSTGRES_PORT="${POSTGRES_PORT:-15432}"
JWT_SECRET="${JWT_SECRET:-DemoSeedLifecycleSecretThatIsAtLeast256BitsLong!2026}"
ADMIN_USERNAME='seed_lifecycle_admin'
ADMIN_EMAIL='seed.lifecycle@example.com'
ADMIN_PASSWORD='seed-lifecycle-ci-only'

log() {
  printf '[demo-seed-lifecycle] %s\n' "$*" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

for command in curl docker python3 pwsh; do
  command -v "$command" >/dev/null 2>&1 || fail "$command is required"
done

export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD BACKEND_PORT POSTGRES_PORT JWT_SECRET
export CORS_ALLOWED_ORIGINS="$API_BASE_URL"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/demo-seed-lifecycle.XXXXXX")"
MANIFEST_PATH="$TMP_DIR/demo-seed-manifest.json"
SEED_SCRIPT="$ROOT_DIR/backend/scripts/seed-demo-data.ps1"
STACK_STARTED=0

cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$STACK_STARTED" == "1" ]]; then
    docker compose -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans \
      >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
  exit "$status"
}
trap cleanup EXIT

compose() {
  docker compose -f "$ROOT_DIR/docker-compose.yml" "$@"
}

psql_db() {
  compose exec -T postgres psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -X -q -A -t \
    -v ON_ERROR_STOP=1 \
    -c "$1"
}

db_count() {
  psql_db "$1" | tr -d '[:space:]'
}

run_seed() {
  SMART_HERITAGE_ADMIN_TOKEN="$ADMIN_TOKEN" \
    pwsh -NoProfile -NonInteractive \
      -File "$SEED_SCRIPT" \
      -BaseUrl "$API_BASE_URL" \
      -ManifestPath "$MANIFEST_PATH" \
      -PostgresUser "$POSTGRES_USER" \
      -PostgresDatabase "$POSTGRES_DB" \
      "$@"
}

log "Starting disposable Docker Compose stack"
STACK_STARTED=1
compose up -d --build --wait --wait-timeout 300

healthy=0
for _ in $(seq 1 60); do
  if curl -fsS "$API_BASE_URL/api/health" 2>/dev/null \
      | grep -q '"status":"UP"'; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "$healthy" == "1" ]] || fail "backend did not become healthy"

log "Registering disposable ADMIN account"
curl -fsS -X POST "$API_BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  >/dev/null

psql_db "
INSERT INTO role (name) VALUES ('ADMIN')
ON CONFLICT (name) DO NOTHING;
UPDATE \"user\"
SET role_id = (SELECT role_id FROM role WHERE name = 'ADMIN')
WHERE username = '$ADMIN_USERNAME';
" >/dev/null

ADMIN_TOKEN="$(
  curl -fsS -X POST "$API_BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])'
)"
[[ -n "$ADMIN_TOKEN" ]] || fail "ADMIN login did not return a token"

log "Running first Seed and Verify"
run_seed -Seed -Force
run_seed -Verify

FIRST_ANCHOR="$(
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["interactionAnchorAtUtc"])' \
    "$MANIFEST_PATH"
)"

log "Running repeated Seed and Verify"
run_seed -Seed -Force
run_seed -Verify

SECOND_ANCHOR="$(
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["interactionAnchorAtUtc"])' \
    "$MANIFEST_PATH"
)"
[[ "$FIRST_ANCHOR" == "$SECOND_ANCHOR" ]] \
  || fail "repeated Seed changed interactionAnchorAtUtc"

psql_db "
INSERT INTO heritage_site (name)
VALUES ('S6 Seed Lifecycle Preserved Site');
" >/dev/null

log "Running Cleanup WhatIf and checking no data changed"
MANIFEST_BEFORE="$(sha256sum "$MANIFEST_PATH" | cut -d ' ' -f1)"
run_seed -Cleanup -Force -WhatIf
MANIFEST_AFTER="$(sha256sum "$MANIFEST_PATH" | cut -d ' ' -f1)"
[[ "$MANIFEST_BEFORE" == "$MANIFEST_AFTER" ]] \
  || fail "Cleanup WhatIf changed the manifest"
[[ "$(db_count 'SELECT COUNT(*) FROM visitor_interaction')" == "60" ]] \
  || fail "Cleanup WhatIf changed interaction count"

log "Simulating interrupted cleanup by removing one owned interaction"
psql_db "
DELETE FROM visitor_interaction
WHERE interaction_id = (
    SELECT MIN(interaction_id) FROM visitor_interaction
);
" >/dev/null

log "Running actual Cleanup"
run_seed -Cleanup -Force

[[ "$(db_count 'SELECT COUNT(*) FROM visitor_interaction')" == "0" ]] \
  || fail "Cleanup left interactions"
[[ "$(db_count 'SELECT COUNT(*) FROM multimedia')" == "0" ]] \
  || fail "Cleanup left multimedia"
[[ "$(db_count 'SELECT COUNT(*) FROM beacon')" == "0" ]] \
  || fail "Cleanup left beacons"
[[ "$(db_count 'SELECT COUNT(*) FROM artifact')" == "0" ]] \
  || fail "Cleanup left artifacts"
[[ "$(db_count 'SELECT COUNT(*) FROM heritage_site')" == "1" ]] \
  || fail "Cleanup did not preserve the non-seed heritage site"

python3 - "$MANIFEST_PATH" <<'PY'
import json
import sys
manifest = json.load(open(sys.argv[1]))
assert manifest.get("cleanedAtUtc"), "cleanup timestamp missing"
assert not manifest.get("interactionAnchorAtUtc"), "anchor was not reset"
assert not manifest.get("interactions"), "interaction ownership was not cleared"
PY

if run_seed -Verify >"$TMP_DIR/verify-after-cleanup.log" 2>&1; then
  fail "Verify unexpectedly passed after cleanup"
fi

log "Running Seed and Verify after cleanup to refresh the anchor"
run_seed -Seed -Force
run_seed -Verify

THIRD_ANCHOR="$(
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["interactionAnchorAtUtc"])' \
    "$MANIFEST_PATH"
)"
[[ "$THIRD_ANCHOR" > "$SECOND_ANCHOR" ]] \
  || fail "post-cleanup Seed did not refresh interactionAnchorAtUtc"

[[ "$(db_count 'SELECT COUNT(*) FROM heritage_site')" == "5" ]] \
  || fail "post-cleanup Seed did not restore four demo sites"
[[ "$(db_count 'SELECT COUNT(*) FROM artifact')" == "20" ]] \
  || fail "post-cleanup Seed did not restore 20 artifacts"
[[ "$(db_count 'SELECT COUNT(*) FROM multimedia')" == "20" ]] \
  || fail "post-cleanup Seed did not restore 20 multimedia records"
[[ "$(db_count 'SELECT COUNT(*) FROM beacon')" == "4" ]] \
  || fail "post-cleanup Seed did not restore four beacons"
[[ "$(db_count 'SELECT COUNT(*) FROM visitor_interaction')" == "60" ]] \
  || fail "post-cleanup Seed did not restore 60 interactions"

log "Running final Cleanup and preservation check"
run_seed -Cleanup -Force
[[ "$(db_count 'SELECT COUNT(*) FROM heritage_site')" == "1" ]] \
  || fail "final Cleanup did not preserve the non-seed heritage site"
[[ "$(db_count 'SELECT COUNT(*) FROM visitor_interaction')" == "0" ]] \
  || fail "final Cleanup left interactions"

log "PASS: repeated Seed, Verify, WhatIf, cleanup recovery, and preservation checks"
