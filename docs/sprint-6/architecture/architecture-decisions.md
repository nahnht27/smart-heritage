# Smart Heritage — Architecture Decisions

Status: **accepted decisions reflected in `main` at `6e11c0b`**.
Format: lightweight ADR. Each decision states context, the choice, consequences,
and alternatives that were not taken.

## ADR-001 — Modular monolith instead of microservices

**Context.** The project has a small team, one relational domain and a short
delivery window. Heritage content, beacons and interactions share joins and
transactions.

**Decision.** Ship one Spring Boot application with strict internal packages
(controller/service/repository/entity) and one PostgreSQL database.

**Consequences.**

- One deployable unit, one transaction boundary, simple local development.
- Module boundaries are conventions, not network contracts.
- Scaling is vertical or whole-application horizontal; a future split would
  require extracting modules and defining contracts.
- No service discovery, gateway, broker or distributed tracing is needed.

**Alternatives rejected.** Microservices per domain, separate analytics service,
event-driven architecture. None of these would pay back their operational cost
at the current scale.

## ADR-002 — Spring Boot 3.2.5 on Java 17

**Context.** The course target is Java/Spring, and the runtime must be
maintainable and reproducible.

**Decision.** Java 17 LTS + Spring Boot 3.2.5 + Maven wrapper.

**Consequences.**

- Modern Jakarta namespaces, records, text blocks and `Instant` support.
- Java 17 is the minimum; upgrading to 21 is possible later but not done here.
- The backend Docker image is a JRE 17 image, so build and run toolchains are
  separated.

## ADR-003 — PostgreSQL as the only system of record

**Context.** The domain is relational: sites → artifacts → multimedia,
beacons → artifacts, users/roles, interactions. Analytics needs grouping.

**Decision.** Use PostgreSQL 16 for all persistent data. No cache, document
store, search engine or object store.

**Consequences.**

- Joins, FK constraints and aggregate SQL are available in one place.
- Media is referenced by URL; binary content is not stored in the database.
- Full-text search, geospatial indexing and horizontal sharding are not used.
- `numeric(9,6)` coordinates avoid PostGIS but support only simple display.

## ADR-004 — Flyway owns the schema, Hibernate validates

**Context.** Early development let Hibernate generate the schema, which left
drift between environments and no migration history.

**Decision.** Flyway migrations V1–V4 own all DDL. Every non-test environment
uses `ddl-auto=validate`; automatic baseline and clean are disabled.

**Consequences.**

- A schema mismatch fails startup instead of being silently altered.
- Existing databases must be explicitly classified and baselined; the process is
  documented and scripted.
- Every future change must be a new forward-only migration.
- H2 unit tests are not migration evidence; PostgreSQL integration tests and the
  CI backup/restore job are.

**Alternatives rejected.** Continuing with `ddl-auto=update`, Liquibase,
auto-baseline. Auto-baseline was rejected because it can adopt an incomplete
schema without review.

## ADR-005 — Stateless JWT authentication with role-based authorization

**Context.** Two clients call the same API; the web client runs in a browser and
the mobile client on devices. Session cookies would complicate both.

**Decision.** Issue signed JWTs from `/api/auth/login`, validate them in a
servlet filter, keep no server session, and authorize with `ROLE_ADMIN` /
`ROLE_VISITOR` using route rules plus `@PreAuthorize`.

**Consequences.**

- Horizontal scale is trivial; no sticky sessions.
- Token revocation/logout is client-side only until expiry.
- No refresh token, rotation or login rate limiting.
- The secret must be ≥256 bits outside local development.
- CSRF is disabled because the API does not authenticate with cookies.

**Alternatives rejected.** Server sessions, OAuth2/OIDC provider, API keys.
An external identity provider is disproportionate for this project.

## ADR-006 — Public read paths, protected writes

**Context.** Visitors must browse content without creating an account, and the
mobile app records anonymous interactions. Admin operations must remain locked
down.

**Decision.** Permit `GET` on content and beacon resources plus
`POST /api/interactions`; protect every content/beacon write and all analytics
with `@PreAuthorize("hasRole('ADMIN')")`.

**Consequences.**

- The visitor funnel has no authentication wall.
- Public content is intentionally read-only; the method security is the
  guarantee, not the URL pattern alone.
- Abuse protection relies on deployment-level controls that are not implemented
  (rate limiting, WAF, quotas).

## ADR-007 — Uniform `ApiResponse<T>` envelope

**Context.** Two clients and several error paths need a predictable contract.

**Decision.** Wrap success and error payloads in
`{ success, message, data, timestamp, path, errors }`, with null fields omitted.

**Consequences.**

- Clients can branch on `success` and display `message` consistently.
- Error shape is stable across validation, security and domain failures.
- `/api/health` is a deliberate exception and returns a plain map.
- The envelope adds one level of nesting for every payload.

**Alternatives rejected.** Raw resources plus RFC 7807 problem details. Problem
details would be cleaner but would require changing both existing clients.

## ADR-008 — Client-generated `eventId` plus database uniqueness for idempotency

**Context.** Mobile devices retry on flaky networks. Duplicate interaction rows
would corrupt analytics.

**Decision.** The client generates a UUID `eventId` per logical event and reuses
it on retry. The service pre-checks `findByEventId` for the common case; the
database unique constraint `uk_visitor_interaction_event_id` is the final guard.
Same identity replays return `200`; different identity reuse returns `409`.

**Consequences.**

- Retries are safe without a distributed lock.
- The identity comparison differs for authenticated vs anonymous events.
- A retry that changes any participant identity is treated as a conflict.
- The handler must recognize the constraint name to avoid leaking SQL details.

**Alternatives rejected.** Server-generated IDs only, an idempotency table, or
upserts without identity checks. Server IDs would make retries non-idempotent;
an extra table is unnecessary when the natural key is already unique.

## ADR-009 — iBeacon identity is `(proximity_uuid, major, minor)`

**Context.** MAC addresses are randomized on some Android devices and are not
available on iOS. Beacon hardware can be replaced.

**Decision.** Store and resolve beacons by the full iBeacon tuple. Enforce
uniqueness and range checks in PostgreSQL. Do not use MAC address.

**Consequences.**

- Resolution is platform-neutral and stable across reboot/replacement.
- Reusing a tuple requires editing the existing row; duplicates are rejected.
- Physical deployment still needs a mapping from device labels to tuples.

## ADR-010 — Beacon debounce and cooldown on the device

**Context.** BLE ranging emits many readings per second and RSSI fluctuates.
Triggering on every reading would spam banners and interactions.

**Decision.** Use `BeaconTriggerController` on the device: RSSI threshold −75,
2 s entry delay, 3 s exit delay, 3 s stale delay and 60 s cooldown per identity.
Only an accepted trigger calls the backend.

**Consequences.**

- The backend sees one logical event per entry.
- Behavior depends on client constants; another client must implement the same
  rules or accept noisier data.
- The backend still independently validates `beaconId`, enabled state and
  artifact mapping, so a malicious client cannot bypass domain checks.

**Alternatives rejected.** Server-side debouncing (too late and chatty), raw
reading upload (privacy and volume concerns).

## ADR-011 — Interaction analytics computed with SQL and UTC day buckets

**Context.** Dashboards need totals, unique visitors, type breakdown, top
artifacts and daily series. Data volume is modest but should not be loaded into
the JVM.

**Decision.** Use JPQL aggregate queries for summary/type/language/top artifacts
and one native PostgreSQL query for UTC date bucketing. Zero-fill missing days
in the service.

**Consequences.**

- The database does the aggregation; the API returns small JSON.
- Day boundaries are UTC for all clients, avoiding server-timezone drift.
- Native SQL is PostgreSQL-specific; a database port would need a rewrite.
- Range is capped at 90 days to bound query work.

**Alternatives rejected.** Pulling all rows and aggregating in Java (memory,
latency), materialized views/cron pre-aggregation (operational complexity not
yet justified).

## ADR-012 — CSV export is client-side; no PDF/Excel backend

**Context.** The admin dashboard must provide a downloadable report. The
requirement mentions PDF/Excel, but the implemented data is a single summary.

**Decision.** Export the currently loaded summary as RFC 4180 CSV in the browser.
Apply CSV formula-injection mitigation and a UTF-8 BOM for Excel.

**Consequences.**

- No server-side report service or file storage is needed.
- Export reflects exactly what the admin sees, including the selected range.
- PDF/Excel and scheduled reports remain unimplemented requirements.
- Large exports would need a backend job; current summary size is small.

## ADR-013 — Nginx static SPA plus same-origin `/api` proxy

**Context.** The Admin Web is a Vite SPA. Serving it separately from the API
would force CORS and expose two origins.

**Decision.** Build the SPA into an Nginx image that serves static assets,
applies SPA fallback and proxies `/api/` to the internal backend. Production
defaults to an empty `VITE_API_BASE_URL` so requests are same-origin.

**Consequences.**

- One public port; CORS is only relevant for direct/mobile browser use.
- Reverse proxy headers and timeouts are centralized.
- TLS/HSTS/CSP are delegated to an external proxy and are not fully configured
  in the container.
- Nginx master still runs as root in the official image.

**Alternatives rejected.** Serving the SPA from Spring Boot, a separate CDN, or
per-request runtime configuration. The static build is simpler and CI-verifiable.

## ADR-014 — Docker Compose for delivery, not Kubernetes

**Context.** The project needs a reproducible demo/staging package, but there is
no target cluster or production operations team.

**Decision.** Provide development and production Compose files, multi-stage
images, health checks, log rotation and a CI production-smoke job.

**Consequences.**

- The stack is reproducible on a single Linux host with Docker.
- Production hardening is limited; there is no autoscaling, ingress controller,
  secret manager or rolling deployment.
- The production stack has not been deployed to real infrastructure.

## ADR-015 — Honest placeholder policy

**Context.** The requirements describe a broader product than the implemented
scope. Pretending placeholders are complete would mislead reviewers and users.

**Decision.** Document every unimplemented or mock feature explicitly and keep
it out of "implemented" claims. The mobile map, feedback, favorites and history
screens, admin translations/feedback pages, PDF/Excel export, multilingual
storage and physical-device verification are all marked accordingly.

**Consequences.**

- The architecture matches reality and supports a defensible demo.
- Reviewers can distinguish implemented code paths from planned scope.
- The traceability matrix intentionally contains `PARTIAL` and `NOT IMPLEMENTED`
  rows.

## Decision summary

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Modular monolith | Accepted |
| ADR-002 | Java 17 / Spring Boot 3.2.5 | Accepted |
| ADR-003 | PostgreSQL only | Accepted |
| ADR-004 | Flyway owns schema | Accepted |
| ADR-005 | Stateless JWT + RBAC | Accepted |
| ADR-006 | Public reads, protected writes | Accepted |
| ADR-007 | `ApiResponse<T>` envelope | Accepted |
| ADR-008 | `eventId` idempotency + unique constraint | Accepted |
| ADR-009 | Beacon identity tuple | Accepted |
| ADR-010 | Device-side debounce | Accepted |
| ADR-011 | SQL analytics with UTC buckets | Accepted |
| ADR-012 | Client-side CSV export | Accepted |
| ADR-013 | Nginx SPA + same-origin proxy | Accepted |
| ADR-014 | Docker Compose delivery | Accepted |
| ADR-015 | Honest placeholder policy | Accepted |

## Related documents

- [System architecture](system-architecture.md)
- [Java backend architecture](java-backend-architecture.md)
- [Database ERD](database-erd.md)
- [API overview](api-overview.md)
- [Requirements traceability](requirements-traceability.md)
