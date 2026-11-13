# M5 — PostgreSQL Integration Test Report

**Project:** Smart Heritage
**Sprint:** Sprint 4 — End-to-End Integration & Core Business Features
**Role:** M5 — Analytics & Testing Engineer
**Task:** PostgreSQL Integration Testing & Analytics Reliability
**Test Date:** November 7, 2026
**Final Result:** 22/22 integration tests passed; full `verify` also passed 95 unit tests — BUILD SUCCESS

---

## 1. Overview and Objectives

This report verifies the Visitor Interaction and Analytics modules against a real PostgreSQL database instead of H2 in-memory.

Objectives:

- Verify PostgreSQL connectivity, schema, and constraints.
- Validate authenticated and anonymous interaction persistence.
- Verify Wave 3 identity rules: `visitorId` UUID, nullable `userId`, principal-derived user identity.
- Test idempotency, retries, and concurrent duplicate requests.
- Verify interaction duration calculations.
- Validate summary, daily time-series, and language analytics queries.
- Test JWT authentication and ADMIN authorization.
- Verify validation, error handling, and transaction rollback.
- Establish a local performance baseline.

## 2. Test Environment

| Component | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.2.5 |
| Build Tool | Maven 3.9.6 / Maven Wrapper |
| Test Framework | JUnit 5 |
| API Testing | Spring MockMvc |
| Database | PostgreSQL 16.13 (Docker, disposable container) |
| Test Database | `smart_heritage_test` |
| ORM | Spring Data JPA / Hibernate |
| Database Access | `JdbcTemplate` |
| Schema Management | Flyway (`ddl-auto=validate`) |
| Test Profile | `postgres-test` |
| Timezone | UTC |

**Test class:**

`backend/src/test/java/com/university/backend/integration/VisitorInteractionPostgresIT.java`

The suite runs against a dedicated database and must not be executed against production or development data. The local verification used a disposable container on host port `55432`; CI uses an ephemeral PostgreSQL 16 service.

### Test Execution Command

Run from the `backend` directory:

```bash
POSTGRES_TEST_URL=jdbc:postgresql://localhost:55432/smart_heritage_test \
POSTGRES_TEST_USERNAME=<test-user> \
POSTGRES_TEST_PASSWORD=<test-password> \
./mvnw -B -Ppostgres-integration verify
```

Docker variant:

```bash
docker run --rm --network host \
  -v "$PWD":/workspace \
  -v maven_repo:/root/.m2 \
  -w /workspace/backend \
  -e POSTGRES_TEST_URL=jdbc:postgresql://localhost:55432/smart_heritage_test \
  -e POSTGRES_TEST_USERNAME=<test-user> \
  -e POSTGRES_TEST_PASSWORD=<test-password> \
  maven:3.9.6-eclipse-temurin-17 \
  ./mvnw -B -Ppostgres-integration verify
```

The `postgres-integration` profile:

- Runs Failsafe against `**/*IT.java`.
- Fails when no integration tests are found (`failIfNoTests=true`).
- Passes `POSTGRES_TEST_*` values as `SPRING_DATASOURCE_*` only to the Failsafe fork, so H2 unit tests remain isolated.
- Also runs the regular Surefire unit tests as part of `verify`.

## 3. Integration Test Results

### 3.1 Database Connectivity and Schema Verification

**Test methods:**

- `schemaUsesCurrentColumnsAndFlywayHistory`

**Verification:**

- `visitor_interaction.user_id` is nullable.
- `visitor_interaction.visitor_id` is `uuid`.
- Flyway migrations `2`, `3`, and `4` are applied successfully.
- The unique constraint on `event_id` exists.
- Expected timestamp and duration column types are present.

**Result: PASS**

### 3.2 Interaction Persistence and Foreign Key Integrity

**Test methods:**

- `persistsAuthenticatedInteractionWithPrincipalAndIgnoresClientUserId`
- `persistsAnonymousInteractionWithNullableUserId`
- `rejectsUnknownArtifactWithoutPersisting`
- `databaseRejectsInvalidArtifactForeignKey`

**Verification:**

- Authenticated `POST /api/interactions` returns HTTP 201 and stores the principal's `user_id`.
- A client-supplied `userId` in the body is ignored.
- Anonymous events persist with `user_id = NULL`.
- Nonexistent artifacts return HTTP 404 without inserting a record.
- PostgreSQL rejects invalid artifact foreign keys.

**Result: PASS**

### 3.3 Idempotency, Retry, and Concurrency

**Test methods:**

- `authenticatedRetryAcceptsChangedVisitorId`
- `authenticatedRetryRejectsDifferentUser`
- `anonymousRetryRequiresSameVisitorId`
- `concurrentDuplicateCreatesExactlyOneRecord`

| Scenario | Expected Behavior |
|---|---|
| Same authenticated user retries the same `eventId` with a changed `visitorId` | HTTP 200, no duplicate |
| Different authenticated user submits the same `eventId` | HTTP 409 |
| Anonymous retry uses the same `visitorId` | HTTP 200, no duplicate |
| Anonymous retry uses a different `visitorId` | HTTP 409 |
| Two concurrent requests with the same `eventId` | Exactly one record |

Concurrency tests use `ExecutorService` and `CountDownLatch` to coordinate requests.

**Result: PASS**

### 3.4 Duration Calculation

**Test methods:**

- `calculatesDurationAndPersistsIt`
- `handlesMissingEndedAtWithNullDuration`
- `rejectsEndBeforeStartWithoutPersisting`

| Scenario | Expected Result |
|---|---|
| Start and end supplied | Correct duration in seconds |
| Missing `endedAt` | `NULL` duration |
| End before start | HTTP 400, no record |

**Result: PASS**

### 3.5 Analytics Query Verification

**Test methods:**

- `summaryCountsDistinctVisitorIdsNotUsers`
- `dailyTimeSeriesFillsMissingUtcDays`
- `dailyTimeSeriesReturnsZeroBucketsForEmptyRange`
- `analyticsEndpointsRequireAdmin`
- `analyticsEndpointsValidateDateRange`
- `languageAnalyticsAggregatesAndBucketsUnknown`
- `languageAnalyticsReturnsEmptyArrayForEmptyRange`

**Verified behavior:**

| Analytics Check | Expected Result |
|---|---|
| Summary total interactions | Correct count in `[from, to)` |
| Summary unique visitors | Distinct `visitorId`, not `userId` |
| Daily time-series | Every UTC calendar day is present |
| Empty UTC days | `totalInteractions = 0`, `uniqueVisitors = 0` |
| Leap day | Included correctly |
| Language aggregation | Sorted by count desc, then language code asc |
| Null/blank language | Normalized to `UNKNOWN` |
| Empty range | Empty language array / zero-filled daily buckets |
| Missing `from` or `to` | HTTP 400 |
| `from >= to` | HTTP 400 |
| Range over 90 days | HTTP 400 |
| VISITOR token | HTTP 403 |
| No token | HTTP 401 |

**Result: PASS**

### 3.6 Authentication and Authorization

**Test method:**

- `analyticsEndpointsRequireAdmin`

Both new endpoints were checked:

- `GET /api/analytics/interactions/timeseries`
- `GET /api/analytics/interactions/languages`

| Request | Expected HTTP Status |
|---|---:|
| Without JWT | 401 Unauthorized |
| VISITOR JWT | 403 Forbidden |
| ADMIN JWT | 200 OK |

**Result: PASS**

### 3.7 Input Validation and Error Handling

**Test method:**

- `rejectsInvalidInteractionPayloads`

Invalid cases include missing required fields, invalid interaction type, invalid language code, negative/nonexistent artifact IDs, malformed UUIDs, and invalid timestamp ordering. Rejected requests do not create records.

**Result: PASS**

### 3.8 Transaction Rollback Verification

**Test method:**

- `rollbackOnDuplicateEventIdLeavesNoPartialRecord`

A transaction inserts a valid interaction, then attempts a duplicate `eventId`. PostgreSQL rejects the duplicate via the unique constraint, the transaction rolls back, and no partial record remains.

**Result: PASS**

## 4. PostgreSQL Performance Baseline

**Test method:**

- `performanceBaseline`

The test inserts 200 interactions across 20 visitors, then measures the combined execution time of:

- summary analytics,
- daily time-series analytics,
- language analytics.

### Final local measurement

| Metric | Result |
|---|---:|
| Inserted records | 200 |
| Unique visitors | 20 |
| Combined analytics latency | 22 ms |
| Daily buckets | 1 |
| Language aggregate total | 200 |
| Database integrity | PASS |

The measurement is a local, single-run baseline for regression visibility. It is not a production capacity or SLA claim.

## 5. Overall Test Summary

### Maven execution result

```text
[INFO] Tests run: 95, Failures: 0, Errors: 0, Skipped: 0
[INFO] Tests run: 22, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Final statistics

| Metric | Result |
|---|---:|
| Unit tests | 95 |
| PostgreSQL integration tests | 22 |
| Integration failures | 0 |
| Integration errors | 0 |
| Integration skipped | 0 |
| Integration pass rate | 100% |
| Build status | SUCCESS |

### Native query projection fix

The daily time-series query initially returned zero-valued projections because PostgreSQL lower-cased the snake_case aliases, which did not map to the interface projection getters. The aliases are now quoted camelCase names:

```sql
CAST(i.interacted_at AT TIME ZONE 'UTC' AS DATE) AS "interactionDate",
COUNT(*) AS "totalInteractions",
COUNT(DISTINCT i.visitor_id) AS "uniqueVisitors"
```

After this fix, all 22 integration tests pass.

## 6. CI Enforcement

The `postgres-integration` CI job now:

1. Starts an ephemeral PostgreSQL 16 service.
2. Runs `./mvnw -B -Ppostgres-integration verify`.
3. Parses `target/failsafe-reports/TEST-*VisitorInteractionPostgresIT.xml`.
4. Fails unless:
   - exactly one matching report exists,
   - at least 22 tests ran,
   - `failures = 0`,
   - `errors = 0`,
   - `skipped = 0`.
5. Uploads Surefire and Failsafe reports.

There is no `continue-on-error` or `|| true` on the PostgreSQL gate.

**Verified on PR #24:** `postgres-integration` passed in 1m20s; the report gate observed 22 tests with 0 failures/errors/skipped.

Run: https://github.com/nahnht27/smart-heritage/actions/runs/42261630401

## 7. Limitations and Future Improvements

The following remain outside the verified scope:

- Production database migration testing.
- Larger datasets and sustained high-concurrency testing.
- Query execution plans via `EXPLAIN ANALYZE`.
- Analytics reads during concurrent writes.
- Frontend chart integration for the new timeseries/languages endpoints.
- Mobile runtime E2E verification with a real device/emulator.
- CI verification: PR #24, run `42261630401` — `postgres-integration` PASS. See https://github.com/nahnht27/smart-heritage/actions/runs/42261630401.

## 8. Conclusion

The PostgreSQL integration suite passed **22/22 tests** with zero failures, errors, or skipped tests. The full Maven `verify` run also passed **95 unit tests**.

The results verify Wave 3 interaction identity rules, persistence, constraints, idempotency, concurrency handling, duration calculation, summary analytics, UTC daily time-series, language aggregation, authorization, validation, and transaction rollback.

**Final Result: 22/22 INTEGRATION TESTS PASSED — BUILD SUCCESS.**

## 9. LTJ-54 migration governance update (2026-11-13)

Bổ sung kiểm thử migration và schema detector ngoài suite Visitor Interaction:

- `SchemaDetectorIT` — **16/16 PASS**:
  - V1/V2 không có bảng `beacon` vẫn detect đúng;
  - V3 có history không bị báo nhầm thành V4;
  - V4 đầy đủ, Hibernate-era, partial schema, các V4 thiếu invariant và
    constraint cùng tên sai biểu thức được phân loại đúng
    (`4`, `3`, `UNEXPECTED`).
- `DatabaseMigrationIT` — **8/8 PASS**:
  - fresh DB chạy V1–V4 và validate;
  - không auto-baseline schema không có history;
  - baseline hiện tại ở V3, V2 ở V2, legacy V1 ở V1;
  - schema kiểu Hibernate được V4 chuẩn hoá index/check/default/FK;
  - constraint trùng tên sai biểu thức làm V4 fail rõ ràng, không bị thay thế.
- `VisitorInteractionPostgresIT` — **22/22 PASS**, có thêm assertion Flyway V4.
- `./mvnw -B test` — **134/134 unit tests PASS**.
- `./mvnw -B -Ppostgres-integration verify` — **46/46 integration tests PASS**
  (22 Visitor Interaction + 8 migration + 16 detector).
- Manual PostgreSQL 16 disposable:
  - fresh DB: V1–V4, app health `UP`, Hibernate validate PASS;
  - DB kiểu Hibernate: detection `3` → baseline 3 → V4 → detection `4`, dữ
    liệu giữ nguyên, app health `UP`.

Chi tiết: [migration-strategy.md](../database/migration-strategy.md) và
[schema-baseline.md](../database/schema-baseline.md).
