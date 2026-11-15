#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GOAL="${1:-info}"
if [[ $# -gt 0 ]]; then
    shift
fi

case "$GOAL" in
    info|migrate|baseline|validate) ;;
    *)
        echo "Usage: $0 {info|migrate|baseline|validate}" >&2
        exit 2
        ;;
esac

: "${SPRING_DATASOURCE_URL:?Set SPRING_DATASOURCE_URL}"
: "${SPRING_DATASOURCE_USERNAME:?Set SPRING_DATASOURCE_USERNAME}"
: "${SPRING_DATASOURCE_PASSWORD:?Set SPRING_DATASOURCE_PASSWORD}"

FLYWAY_IMAGE="${FLYWAY_IMAGE:-flyway/flyway:10.22.0}"
FLYWAY_BASELINE_VERSION="${FLYWAY_BASELINE_VERSION:-3}"
CONNECT_RETRIES="${FLYWAY_CONNECT_RETRIES:-5}"

DOCKER_ARGS=(--rm)
if [[ -n "${FLYWAY_NETWORK:-}" ]]; then
    DOCKER_ARGS+=(--network "$FLYWAY_NETWORK")
fi

exec docker run "${DOCKER_ARGS[@]}" \
    -e "FLYWAY_URL=$SPRING_DATASOURCE_URL" \
    -e "FLYWAY_USER=$SPRING_DATASOURCE_USERNAME" \
    -e "FLYWAY_PASSWORD=$SPRING_DATASOURCE_PASSWORD" \
    -e "FLYWAY_LOCATIONS=filesystem:/flyway/sql" \
    -e "FLYWAY_BASELINE_VERSION=$FLYWAY_BASELINE_VERSION" \
    -e "FLYWAY_BASELINE_ON_MIGRATE=false" \
    -e "FLYWAY_CLEAN_DISABLED=true" \
    -e "FLYWAY_CONNECT_RETRIES=$CONNECT_RETRIES" \
    -v "$ROOT_DIR/backend/src/main/resources/db/migration:/flyway/sql:ro" \
    "$FLYWAY_IMAGE" \
    "$GOAL" "$@"
