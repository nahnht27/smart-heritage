
# M5 — PostgreSQL Integration Test Report

**Project:** Smart Heritage  
**Sprint:** Sprint 4 — End-to-End Integration & Core Business Features  
**Role:** M5 — Analytics & Testing Engineer  
**Task:** PostgreSQL Integration Testing & Analytics Reliability  
**Test Date:** November 6, 2026  
**Final Result:** 19/19 Tests Passed — BUILD SUCCESS

---

## 1. Overview and Objectives

This task verifies the reliability and correctness of the Visitor Interaction and Analytics modules using a real PostgreSQL database instead of H2 in-memory.

The main objectives are:

- Verify PostgreSQL connectivity, schema, and constraints.
- Validate interaction persistence and data integrity.
- Test idempotency and concurrent requests.
- Verify interaction duration calculations.
- Validate existing analytics queries.
- Test JWT authentication and authorization.
- Verify error handling and transaction rollback.
- Establish an initial performance baseline.

## 2. Test Environment

| Component | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.2.5 |
| Build Tool | Maven 3.9.6 |
| Test Framework | JUnit 5 |
| API Testing | Spring MockMvc |
| Database | PostgreSQL |
| Test Database | smart_heritage_test |
| ORM | Spring Data JPA / Hibernate |
| Database Access | JdbcTemplate |
| Container | Docker |
| Test Profile | postgres-test |

**Test Class:**

`backend/src/test/java/com/university/backend/repository/VisitorInteractionPostgresIT.java`

The tests use a dedicated database to prevent interference with development data.

Hibernate uses `ddl-auto=create` to recreate the test schema. Therefore, the test suite must not be executed against production or development databases.

### Test Execution Command

Run from the `backend` directory:

```powershell
docker run --rm `
  --network container:smart-heritage-db `
  -v "${PWD}:/app" `
  -w /app `
  maven:3.9.6-eclipse-temurin-17 `
  mvn "-Dtest=VisitorInteractionPostgresIT" test
```

## 3. Integration Test Results

### 3.1. Database Connectivity and Schema Verification

**Test Methods:**
- `shouldConnectToPostgreSQL()`
- `shouldVerifyPostgreSQLSchemaConstraints()`

**Verification:**
- Successful connection to `smart_heritage_test`.
- Primary key exists on `visitor_interaction`.
- `event_id` uses UUID and has a UNIQUE constraint.
- `user_id` and `artifact_id` have FOREIGN KEY constraints.
- Timestamp and duration columns use the expected PostgreSQL data types.

**Result: PASS**

### 3.2. Interaction Persistence and Foreign Key Integrity

**Test Methods:**
- `shouldPersistVisitorInteraction()`
- `shouldRejectInvalidArtifactForeignKey()`
- `shouldRejectNonexistentArtifactWithoutPersisting()`

**Verification:**
- Valid `POST /api/interactions` returns HTTP 201.
- Event ID, authenticated user ID, artifact ID, interaction type, and language code are persisted correctly.
- Stored timestamps and calculated duration match the request.
- Invalid foreign key references are rejected by PostgreSQL.
- Requests referencing nonexistent artifacts return HTTP 404 without inserting records.

**Result: PASS**

### 3.3. Idempotency and Concurrency Testing

**Test Methods:**
- `shouldPersistVisitorInteraction()`
- `shouldPreventConcurrentDuplicateEvents()`
- `shouldPersistConcurrentDifferentEvents()`

| Scenario | Expected Behavior |
|---|---|
| First interaction request | HTTP 201 |
| Same user retries the same event | HTTP 200, no duplicate |
| Different user submits the same event ID | HTTP 409 |
| Two concurrent requests with the same event ID | Exactly one new record |
| Two concurrent requests with different event IDs | Both records persisted |

Concurrency tests use `ExecutorService` and `CountDownLatch` to coordinate request execution.

PostgreSQL successfully prevents duplicate event records while allowing different events to be inserted concurrently.

**Result: PASS**

### 3.4. Duration Calculation

**Test Methods:**
- `shouldCalculateAndPersistDurationCorrectly()`
- `shouldHandleMissingEndTime()`
- `shouldRejectInvalidTimeWithoutPersisting()`

| Scenario | Expected Result |
|---|---|
| Start: 10:00:00, End: 10:02:05 | 125 seconds |
| Start time equals end time | 0 seconds |
| Missing endedAt | NULL duration |
| End time before start time | HTTP 400 |
| Invalid timestamp ordering | No interaction persisted |

Duration calculations are performed by the backend and verified directly against PostgreSQL records.

**Result: PASS**

### 3.5. Analytics Query Verification

**Test Methods:**
- `shouldAggregateAnalyticsCorrectly()`
- `shouldReturnEmptyAnalyticsForPeriodWithoutData()`
- `shouldLimitPopularArtifactsToTen()`

Controlled test data contains two visitors, two artifacts, and interactions with known timestamps.

**Verified results:**

| Analytics Metric | Expected Result |
|---|---:|
| Total Interactions | 4 |
| Unique Visitors | 2 |
| VIEW Interactions | 2 |
| AUDIO_PLAY Interactions | 1 |
| SCAN Interactions | 1 |
| Artifact 1 Interactions | 3 |
| Artifact 2 Interactions | 1 |
| Empty Date Range | 0 / Empty List |
| Popular Artifacts Limit | 10 |

Date range queries follow the `[from, to)` convention, excluding interactions outside the specified interval.

**Result: PASS**

### 3.6. Authentication and Authorization

**Test Method:**

`shouldEnforceAnalyticsAuthenticationAndAuthorization()`

**Endpoint:** `GET /api/analytics/interactions/summary`

| Request | Expected HTTP Status |
|---|---:|
| Without JWT | 401 Unauthorized |
| VISITOR JWT | 403 Forbidden |
| ADMIN JWT | 200 OK |

JWT tokens are obtained through the existing authentication API.

Only authenticated administrators can access the tested Analytics summary endpoint.

**Result: PASS**

### 3.7. Input Validation and Error Handling

**Test Methods:**
- `shouldRejectInvalidInteractionRequests()`
- `shouldRejectInvalidTimeWithoutPersisting()`
- `shouldRejectNonexistentArtifactWithoutPersisting()`
- `shouldRejectMalformedEventId()`
- `shouldRejectMissingRequiredTimestamps()`

| Invalid Input | Expected Response |
|---|---|
| Missing eventId | HTTP 400 |
| Invalid interactionType | HTTP 400 |
| Invalid languageCode | HTTP 400 |
| Negative artifactId | HTTP 400 |
| Nonexistent artifactId | HTTP 404 |
| Malformed UUID | HTTP 400 |
| Missing startedAt | HTTP 400 |
| Missing interactedAt | HTTP 400 |
| End time before start time | HTTP 400 |

Database queries confirm that rejected requests do not create invalid interaction records.

**Result: PASS**

### 3.8. Transaction Rollback Verification

**Test Method:**

`shouldRollbackTransactionOnDuplicateEventId()`

**Procedure:**
1. Start a transaction using `TransactionTemplate`.
2. Insert a valid interaction.
3. Attempt another insert with the same `eventId`.
4. PostgreSQL rejects the duplicate due to the UNIQUE constraint.
5. The transaction is rolled back.
6. Verify that no partial interaction record remains.

**Expected Database State:**

| Stage | Record Count |
|---|---:|
| Before transaction | 0 |
| After first insert inside transaction | 1 |
| After transaction rollback | 0 |

The test confirms transaction atomicity for this database operation.

**Result: PASS**

## 4. PostgreSQL Performance Baseline

**Test Method:**

`shouldMeasurePostgreSQLPerformanceBaseline()`

The performance test inserts 200 interaction records and measures four analytics repository queries.

Five warmup runs and thirty measured runs are executed.

### Actual Measurements

| Metric | Result |
|---|---:|
| Inserted Records | 200 |
| Total Insert Time | 786.47 ms |
| Average Insert Latency | 3.932 ms |
| Insert Throughput | 254.30 records/sec |
| Analytics Warmup Runs | 5 |
| Analytics Measured Runs | 30 |
| Average Analytics Latency | 18.220 ms |
| P95 Analytics Latency | 44.277 ms |
| Minimum Analytics Latency | 9.106 ms |
| Maximum Analytics Latency | 47.919 ms |
| Database Integrity | PASS |

All 200 records were successfully inserted and verified.

The analytics latency represents the combined execution time of four repository queries, not an individual HTTP request.

These measurements establish a local performance baseline and do not represent production-scale performance.

## 5. Overall Test Summary

### Maven Execution Result

```text
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0

[INFO] BUILD SUCCESS

[INFO] Total time: 02:09 min
[INFO] Finished at: 2026-11-06T06:31:33Z
```

### Final Statistics

| Metric | Result |
|---|---:|
| Total Tests | 19 |
| Passed | 19 |
| Failures | 0 |
| Errors | 0 |
| Skipped | 0 |
| Pass Rate | 100% |
| Build Status | SUCCESS |

All implemented PostgreSQL integration tests passed successfully in a single Maven execution.

## 6. Limitations and Future Improvements

The following items remain outside the verified scope:

- Production database migration testing.
- Larger datasets and high-concurrency performance testing.
- Query execution plan analysis using `EXPLAIN ANALYZE`.
- Dedicated tests for analytics reads during concurrent inserts.
- Integration tests for future daily time-series and language analytics features.
- Full backend regression testing and runtime end-to-end verification.

These activities should be addressed during further Sprint 4 integration and optimization.

## 7. Conclusion

The PostgreSQL integration test suite for Smart Heritage Sprint 4 — M5 completed successfully with **19 passed tests, zero failures, and zero errors**.

The results verify the reliability of the implemented Visitor Interaction functionality, including persistence, database constraints, idempotency, concurrency handling, duration calculation, existing analytics queries, authentication, input validation, and transaction rollback.

The performance baseline also provides initial measurements for database insertion and analytics query execution.

**Task Status:** Core PostgreSQL Integration Testing completed successfully.

**Final Result: 19/19 TESTS PASSED — BUILD SUCCESS.**
