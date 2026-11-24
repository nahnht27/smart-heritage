# Smart Heritage — Requirements Traceability

Status: **honest as-built traceability** at `main` (`6e11c0b`).
Sources: `docs/requirements/01_project_scope.md`,
`02_functional_requirements.md`, `03_non_functional_requirements.md`, and the
code paths listed as evidence.

## 1. Status legend

| Status | Meaning |
|---|---|
| **IMPLEMENTED** | A working code path exists and is covered by tests or CI evidence |
| **PARTIAL** | Some behavior exists, but a requirement or platform is incomplete |
| **PLACEHOLDER** | A screen or stub exists without real behavior/data |
| **NOT IMPLEMENTED** | No behavior exists |
| **PENDING VERIFICATION** | Code exists, but the required real hardware/device evidence is missing |
| **NOT MEASURED** | Non-functional target has no benchmark evidence in this repository |

A requirement marked IMPLEMENTED does not imply production deployment; that
remains pending (see [release-readiness.md](../release-readiness.md)).

## 2. Visitor functional requirements

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| FR-V01 | Visitor can register and log in in the mobile app | **IMPLEMENTED** | `mobile/src/app/index.tsx`, `mobile/src/services/authApi.ts`; backend `AuthController`, `AuthService`; `AuthControllerTest` |
| FR-V02 | Visitor can update profile and select preferred language | **PARTIAL** | `PUT /api/users/me` accepts `preferredLanguageId`; there is no language catalogue, no FK, and no finished mobile language-selection UI |
| FR-V03 | Visitor can view an interactive heritage-site map | **PLACEHOLDER** | `mobile/src/app/map.tsx` renders "Interactive Map goes here"; no map SDK or coordinates UI |
| FR-V04 | System automatically detects nearby artifacts using iBeacon | **PENDING VERIFICATION** | Code path is real: `use-beacon-discovery.ts`, `beaconService.ts`, `trigger.ts`, `beaconApi.ts`; physical BLE hardware/device verification is pending |
| FR-V05 | Deliver artifact information when a beacon is detected | **PENDING VERIFICATION** | `useBeaconDiscovery` resolves via `GET /api/beacons/resolve`, shows an 8 s banner, and records an interaction; verified in unit tests, not on physical beacons |
| FR-V06 | Provide descriptions, images, videos and audio guides | **PARTIAL** | Backend stores `multimedia` rows; mobile renders image/audio/video via `MultimediaPlayer`; real-device playback and media URL availability are not verified |
| FR-V07 | Continue viewing artifact information after leaving beacon coverage | **IMPLEMENTED** | Content is loaded by artifact ID and is independent of the beacon lifecycle; beacon banner dismissal/exit does not clear the artifact screen |
| FR-V08 | Visitor can save favorite artifacts | **PLACEHOLDER** | `mobile/src/app/favorite.tsx` uses `MOCK_FAVORITES`; no backend table or endpoint |
| FR-V09 | Visitor can review visit history | **PLACEHOLDER** | `favorite.tsx` uses `MOCK_VISIT_HISTORY`; interaction history is stored server-side but there is no visitor-facing history endpoint/UI |
| FR-V10 | Visitor can rate artifacts and submit feedback | **PLACEHOLDER** | `mobile/src/app/feedback.tsx` only shows a local `alert()`; no feedback table, API or moderation flow |

## 3. Administrator functional requirements

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| FR-A01 | Administrator can securely log in | **IMPLEMENTED** | `/login`, `ProtectedRoute`, ADMIN role check in `frontend/src/App.tsx`; JWT + RBAC backend |
| FR-A02 | Create, edit and manage heritage sites and artifacts | **IMPLEMENTED** | `HeritageSitesPage`, `ArtifactsPage`; admin CRUD endpoints; delete guards; controller tests |
| FR-A03 | Upload and manage multimedia and multilingual descriptions | **PARTIAL** | Multimedia CRUD is implemented with URL-based records; there is no upload, no translation table and no multilingual description model |
| FR-A04 | Register, configure and assign iBeacon devices | **IMPLEMENTED** | `BeaconsPage`; `/api/admin/beacons` CRUD; UUID/major/minor identity; artifact mapping; `BeaconServiceTest`, `BeaconResolutionIntegrityIT` |
| FR-A05 | Manage beacon deployment locations on an interactive map | **NOT IMPLEMENTED** | No map UI or location fields for beacons; `navigation.ts` has no beacon-map page |
| FR-A06 | Manage supported languages and content translations | **PLACEHOLDER** | `/translations` route renders `PlaceholderPage`; no language/translation domain |
| FR-A07 | Moderate visitor feedback and reviews | **PLACEHOLDER** | `/feedback` route renders `PlaceholderPage`; no feedback domain |
| FR-A08 | Dashboard for interactions, popularity, frequency and language | **PARTIAL** | `/dashboard` shows totals, unique visitors, type breakdown and top 10 via `/api/analytics/interactions/summary`; timeseries/language endpoints exist but are not rendered; no feedback metrics |
| FR-A09 | Export statistical reports to PDF or Excel | **PARTIAL** | Browser-side CSV export of the summary (`analyticsCsv.ts`); no PDF/Excel, no server report job |

## 4. System / automated requirements

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| FR-S01 | Continuously process nearby iBeacon/BLE signals | **PENDING VERIFICATION** | Foreground ranging is implemented in `beaconService.ts` and `useBeaconDiscovery`; app focuses/pauses scan with screen/AppState; background scanning is configured but not hardware-verified |
| FR-S02 | Prevent duplicate notifications within the same coverage | **IMPLEMENTED** | `BeaconTriggerController` entry/exit/stale delays + 60 s cooldown; unit tests in `mobile/src/services/__tests__/beaconTrigger.test.ts` |
| FR-S03 | Trigger relevant content on a different beacon | **IMPLEMENTED** | Per-identity state map and key include UUID/major/minor; each accepted trigger resolves and may show a new banner |
| FR-S04 | Synchronize interactions, beacons and content | **PARTIAL** | Clients call real REST APIs; there is no offline queue or conflict-resolution protocol beyond per-event retry with the same `eventId` |
| FR-S05 | Record interactions and preferences for analytics | **PARTIAL** | Interactions and derived duration are recorded; `preferredLanguageId` is stored but not used for content; favorites/history are not persisted |
| FR-S06 | Deliver multilingual content per visitor preference | **NOT IMPLEMENTED** | Only `language_code` is recorded on interactions; no translated content store, selection logic or catalogue |
| FR-S07 | Securely store operational data and user information | **PARTIAL** | BCrypt passwords, JWT, RBAC, validation, parameterized JPA queries, non-root backend container; pending items: login rate limiting, token revocation, TLS/HSTS outside external proxy, production deployment |

## 5. Non-functional requirements

These are not certification claims. Most targets have no load/security test
evidence in this repository.

| ID | Target | Status | Notes / evidence |
|---|---|---|---|
| NFR-P01 | Beacon detection → content within 2 s | **NOT MEASURED** | No physical-device latency measurement; code has a 2 s entry delay by design plus network time |
| NFR-P02 | 95% of API requests < 2 s | **NOT MEASURED** | No load test in CI; analytics range is capped at 90 days |
| NFR-P03 | Dashboard report < 5 s | **NOT MEASURED** | No benchmark; query uses `interacted_at` index and limits top artifacts to 10 |
| NFR-U01 | Intuitive interface | **PARTIAL** | Responsive React layout and accessible labels exist; no formal usability study |
| NFR-U02 | Major tasks within 3–5 interactions | **NOT MEASURED** | No interaction-count evaluation |
| NFR-U03 | Responsive web + varied mobile screens | **PARTIAL** | React Native layout and responsive CSS exist; no device matrix evidence |
| NFR-S01 | HTTPS/TLS 1.2+ | **PENDING** | Production Compose binds loopback for an external TLS proxy; no certificate/domain in repo, no TLS test |
| NFR-S02 | RBAC | **IMPLEMENTED** | `SecurityConfig`, `CustomUserDetailsService`, `@PreAuthorize`, ADMIN guard in `App.tsx`; `PublicContentAccessTest`, `CorsIntegrationTest`, controller tests |
| NFR-S03 | Protect data from unauthorized access | **PARTIAL** | Route/role enforcement, hashed passwords, no secret in Git; missing rate limiting/revocation/CSP/HSTS |
| NFR-SC01 | 500 concurrent users | **NOT MEASURED** | No load test; single backend container per stack |
| NFR-SC02 | Multiple sites, thousands of artifacts, hundreds of beacons | **PARTIAL** | Schema supports the cardinality; no volume/performance test |
| NFR-SC03 | Future horizontal scaling | **PARTIAL** | Stateless API and externalized config support it; no shared cache/session and no load balancer configured |
| NFR-AV01 | 99% availability | **NOT MEASURED** | No production deployment or monitoring/SLO evidence |
| NFR-AV02 | Manual artifact access when beacon fails | **IMPLEMENTED** | Artifact list/detail are independent public reads; beacon failure only affects the banner/interaction |
| NFR-R01 | Avoid duplicate notifications in coverage | **IMPLEMENTED** | Same debounce/cooldown as FR-S02 |
| NFR-R02 | Reliable synchronization of content/interactions | **PARTIAL** | REST persistence and unique `eventId`; no offline queue/backfill |
| NFR-R03 | Graceful recovery from temporary network interruption | **PARTIAL** | Mobile shows retry UI and interaction failure does not block content; screens reload on retry; no automatic background resync |
| NFR-M01 | Clear modular separation | **IMPLEMENTED** | Client/backend/database separation and backend layering; documented in `java-backend-architecture.md` |
| NFR-M02 | OpenAPI/Swagger documentation | **NOT IMPLEMENTED** | No springdoc/OpenAPI dependency, generated spec or Swagger UI |
| NFR-M03 | Extension points for AI/AR/smart city | **PARTIAL** | Modular services and REST boundary help; no plugin/event architecture or explicit extension API |

## 6. Delivery and quality evidence

| Check | Evidence |
|---|---|
| Backend unit/slice tests | `backend/src/test`, CI `backend-test` (`./mvnw test`) |
| PostgreSQL integration | `VisitorInteractionPostgresIT`, `DatabaseMigrationIT`, `SchemaDetectorIT`, `ArtifactQueryOptimizationIT`, `BeaconResolutionIntegrityIT`; CI `postgres-integration` enforces minimum counts |
| Database backup/restore | `scripts/database/test-backup-restore.sh`; CI `database-backup-restore` on PostgreSQL 16 |
| Frontend | CI `frontend-checks`: lint, Vitest, TypeScript + Vite build |
| Mobile | CI `mobile-tests`: Jest with coverage; `mobile-static-analysis` is advisory |
| Docker/Compose | CI `docker-build` validates dev + production config and builds dev images |
| Public API smoke | CI `integration-smoke` |
| Production packaging smoke | CI `production-smoke`: Nginx, SPA fallback, `/api` proxy, health, port exposure |
| Release readiness | [release-readiness.md](../release-readiness.md) |
| Backup/restore acceptance | [database-backup-restore.md](../database-backup-restore.md) |

## 7. Unimplemented requirement groups

The following requirement groups are not backed by production code and must not
be described as complete:

1. Mobile map (FR-V03) and beacon deployment map (FR-A05).
2. Favorites and visitor-facing visit history (FR-V08, FR-V09).
3. Feedback submission, persistence and moderation (FR-V10, FR-A07).
4. Language/translation catalogue and multilingual content (FR-V02, FR-A03,
   FR-A06, FR-S06).
5. PDF/Excel report generation (FR-A09).
6. OpenAPI/Swagger publication (NFR-M02).
7. Physical BLE, real-device multimedia, iOS hardware and production
   deployment verification.

## 8. Related documents

- [System architecture](system-architecture.md)
- [API overview](api-overview.md)
- [Architecture decisions](architecture-decisions.md)
- [Release readiness](../release-readiness.md)
- [Sprint 5 test report](../../testing/sprint-5-m5-test-report.md)
- [Sprint 5 physical beacon checklist](../../testing/sprint-5-beacon-physical-demo-checklist.md)
