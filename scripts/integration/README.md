# Integration smoke tests

`smoke-test.py` verifies a **running** Smart Heritage backend against the
documented API contract. It uses only the Python 3 standard library (no extra
dependencies).

## Prerequisites

1. Backend + PostgreSQL are running, e.g. from the repository root:

   ```bash
   docker compose up -d --build
   curl http://localhost:8080/api/health
   ```

   > On older machines without the Compose V2 plugin, `docker-compose up ...`
   > (with a hyphen) is the legacy equivalent. Prefer Compose V2.

2. Python 3.8+ on the machine running the script.

## Run

```bash
API_BASE_URL=http://localhost:8080/api python3 scripts/integration/smoke-test.py
```

Public scenarios (health, public content, invalid login) run without any
credentials. Authenticated scenarios are reported as `SKIP` when their
credentials are not provided.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_BASE_URL` | no | `http://localhost:8080/api` | Backend API base URL (includes `/api`) |
| `API_TIMEOUT_SECONDS` | no | `10` | Per-request HTTP timeout |
| `TEST_VISITOR_USERNAME` | for auth | — | Visitor username (backend logs in by **username**) |
| `TEST_VISITOR_PASSWORD` | for auth | — | Visitor password |
| `TEST_ADMIN_USERNAME` | for analytics | — | ADMIN username |
| `TEST_ADMIN_PASSWORD` | for analytics | — | ADMIN password |
| `TEST_ARTIFACT_ID` | for interaction write | — | Existing artifact id |
| `ENABLE_INTERACTION_WRITE` | no | `false` | Must be `true` to write an interaction event |
| `ENABLE_CONCURRENT_DUPLICATE` | no | `false` | Opt-in for the concurrent duplicate scenario (writes one extra event) |

Example:

```bash
export API_BASE_URL=http://localhost:8080/api
export TEST_VISITOR_USERNAME=smoke_visitor
export TEST_VISITOR_PASSWORD='********'
export TEST_ADMIN_USERNAME=smoke_admin
export TEST_ADMIN_PASSWORD='********'
export TEST_ARTIFACT_ID=1
export ENABLE_INTERACTION_WRITE=true
# Optional: also run the concurrent duplicate scenario (writes one extra event)
export ENABLE_CONCURRENT_DUPLICATE=true
python3 scripts/integration/smoke-test.py
```

## Scenarios

| Scenario | Checks |
|----------|--------|
| A — Health | `GET /api/health` returns 200 with `status=UP` |
| B — Public content | `GET /api/heritage-sites`, `/api/artifacts`, `/api/multimedia` return 200, `ApiResponse` envelope, `data` is a list |
| C — Authentication | invalid credentials → 401; valid credentials → JWT (token never printed) |
| D — User profile | `GET /api/users/me` with visitor JWT → 200 and profile; without token → 401 |
| E1 — Sequential duplicate | `POST /api/interactions` → 201; resend the **same** `eventId` after it completes → **must be 200** with the same `interactionId` and unchanged `totalInteractions` |
| E2 — Concurrent duplicate (opt-in) | Fire simultaneous requests with one `eventId`; exactly one 201, others may be 200/409, all success responses share one `interactionId`, and the analytics total grows by exactly one |
| F — Analytics authorization | anonymous → 401, VISITOR → 403, ADMIN → 200 |
| G — Analytics data | filtered summary reflects the recorded event; `from` without `to` → 400 |

## Security and data safety

- Credentials and JWTs are never printed. Use throwaway test accounts.
- The script never creates users or content.
- Scenario E1 **writes one interaction record** when enabled; E2 writes one more
  when its opt-in flag is enabled. There is no delete interaction endpoint, so
  the records cannot be removed through the API; they use fresh UUIDs and are
  harmless in a local/test database. Keep `ENABLE_INTERACTION_WRITE=false` for
  shared/production data.
- Duplicate behaviour (see the API contract):
  - **Sequential** duplicate (same `eventId`, sent after the first request has
    completed) **must return 200 OK** with the existing record. A 409 here is a
    failure.
  - **Concurrent** duplicate (requests overlapping in time) may return 409 for
    the requests blocked by the unique `event_id` constraint. Exactly one
    request creates the record.

## Exit codes

- `0` — no failed checks (skips allowed)
- `1` — at least one check failed
