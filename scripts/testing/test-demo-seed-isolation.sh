#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"

SENTINEL_DB='smart-heritage-db'
SENTINEL_BACKEND='smart-heritage-backend'
SENTINEL_VOLUME='smart-heritage_postgres_data'
SENTINEL_LABEL_KEY='demo-seed-isolation'

PROJECT="smart-heritage-seed-isolation-$(date +%s)-$$"
POSTGRES_CONTAINER_NAME="${PROJECT}-db"
BACKEND_CONTAINER_NAME="${PROJECT}-backend"
POSTGRES_VOLUME_NAME="${PROJECT}_postgres_data"
SENTINEL_LABEL_VALUE="$PROJECT"

POSTGRES_DB='smart_heritage_isolation'
POSTGRES_USER='postgres'
POSTGRES_PASSWORD='postgres'
POSTGRES_PORT="${POSTGRES_PORT:-15433}"
BACKEND_PORT="${BACKEND_PORT:-18083}"
JWT_SECRET='IsolationSentinelSecretThatIsAtLeast256BitsLong!2026'

log() {
  printf '[demo-seed-isolation] %s\n' "$*" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail 'docker is required'

case "$PROJECT" in
  smart-heritage-seed-isolation-*) ;;
  *)
    fail "Refusing to tear down Compose project '$PROJECT'"
    ;;
esac

[[ "$POSTGRES_CONTAINER_NAME" != "$SENTINEL_DB" ]] \
  || fail 'PostgreSQL container name is not isolated'
[[ "$BACKEND_CONTAINER_NAME" != "$SENTINEL_BACKEND" ]] \
  || fail 'Backend container name is not isolated'
[[ "$POSTGRES_VOLUME_NAME" != "$SENTINEL_VOLUME" ]] \
  || fail 'PostgreSQL volume name is not isolated'

container_exists() {
  docker container inspect "$1" >/dev/null 2>&1
}

volume_exists() {
  docker volume inspect "$1" >/dev/null 2>&1
}

wait_for_container_absent() {
  local name="$1"

  for _ in $(seq 1 20); do
    if ! container_exists "$name"; then
      return 0
    fi

    sleep 0.5
  done

  return 1
}

wait_for_volume_absent() {
  local name="$1"

  for _ in $(seq 1 20); do
    if ! volume_exists "$name"; then
      return 0
    fi

    sleep 0.5
  done

  return 1
}

snapshot_sentinels() {
  local name
  local label
  local snapshot=''

  for name in "$SENTINEL_DB" "$SENTINEL_BACKEND"; do
    if container_exists "$name"; then
      snapshot+="$name:$(docker inspect -f '{{.Id}}' "$name")|"
    else
      snapshot+="$name:absent|"
    fi
  done

  if volume_exists "$SENTINEL_VOLUME"; then
    label="$(
      docker volume inspect -f \
        "{{ index .Labels \"$SENTINEL_LABEL_KEY\" }}" \
        "$SENTINEL_VOLUME"
    )"
    snapshot+="$SENTINEL_VOLUME:$label"
  else
    snapshot+="$SENTINEL_VOLUME:absent"
  fi

  printf '%s' "$snapshot"
}

SENTINELS_CREATED=0
STACK_STARTED=0

cleanup() {
  local status=$?
  trap - EXIT

  if [[ "$STACK_STARTED" == "1" ]]; then
    docker compose -p "$PROJECT" \
      -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans \
      >/dev/null 2>&1 || true
  fi

  if [[ "$SENTINELS_CREATED" == "1" ]]; then
    docker rm -f "$SENTINEL_DB" "$SENTINEL_BACKEND" \
      >/dev/null 2>&1 || true
    docker volume rm -f "$SENTINEL_VOLUME" >/dev/null 2>&1 || true
  fi

  exit "$status"
}
trap cleanup EXIT

for name in "$SENTINEL_DB" "$SENTINEL_BACKEND"; do
  if container_exists "$name"; then
    fail "sentinel container already exists: $name"
  fi
done

if volume_exists "$SENTINEL_VOLUME"; then
  fail "sentinel volume already exists: $SENTINEL_VOLUME"
fi

log "Creating default-stack sentinels"
docker pull "$POSTGRES_IMAGE" >/dev/null
# Pre-existence was checked above, so anything created below is ours to remove,
# even if creation fails part-way.
SENTINELS_CREATED=1
docker create --name "$SENTINEL_DB" "$POSTGRES_IMAGE" >/dev/null
docker create --name "$SENTINEL_BACKEND" "$POSTGRES_IMAGE" >/dev/null
docker volume create \
  --label "$SENTINEL_LABEL_KEY=$SENTINEL_LABEL_VALUE" \
  "$SENTINEL_VOLUME" >/dev/null

SENTINELS_BEFORE="$(snapshot_sentinels)"

export COMPOSE_PROJECT_NAME="$PROJECT"
export POSTGRES_CONTAINER_NAME
export BACKEND_CONTAINER_NAME
export POSTGRES_VOLUME_NAME
export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
export POSTGRES_PORT BACKEND_PORT JWT_SECRET

compose() {
  docker compose -p "$PROJECT" \
    -f "$ROOT_DIR/docker-compose.yml" "$@"
}

log "Starting isolated PostgreSQL project: $PROJECT"
STACK_STARTED=1
compose up -d postgres --wait --wait-timeout 120

if ! container_exists "$POSTGRES_CONTAINER_NAME"; then
  fail "isolated PostgreSQL container was not created: $POSTGRES_CONTAINER_NAME"
fi

if ! volume_exists "$POSTGRES_VOLUME_NAME"; then
  fail "isolated PostgreSQL volume was not created: $POSTGRES_VOLUME_NAME"
fi

if container_exists "$BACKEND_CONTAINER_NAME"; then
  fail "unexpected isolated backend container: $BACKEND_CONTAINER_NAME"
fi

[[ "$(snapshot_sentinels)" == "$SENTINELS_BEFORE" ]] \
  || fail 'default-stack sentinels changed during isolated bring-up'

log "Tearing down isolated project"
compose down -v --remove-orphans
STACK_STARTED=0

if ! wait_for_container_absent "$POSTGRES_CONTAINER_NAME" \
    || ! wait_for_container_absent "$BACKEND_CONTAINER_NAME"; then
  fail 'isolated containers still exist after teardown'
fi

if ! wait_for_volume_absent "$POSTGRES_VOLUME_NAME"; then
  fail "isolated volume still exists after teardown: $POSTGRES_VOLUME_NAME"
fi

[[ "$(snapshot_sentinels)" == "$SENTINELS_BEFORE" ]] \
  || fail 'default-stack sentinels changed during isolated teardown'

if ! container_exists "$SENTINEL_DB" \
    || ! container_exists "$SENTINEL_BACKEND" \
    || ! volume_exists "$SENTINEL_VOLUME"; then
  fail 'default-stack sentinel resources are missing'
fi

log 'PASS: isolated Compose project, containers, and volume left the default stack untouched'
