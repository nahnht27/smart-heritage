
# SPRINT 5 - M5 CONFIRMED DEFECT LOG

**Project:** Smart Heritage  
**Task ID:** S5-M5-01  
**Task Name:** Full-Stack End-to-End Regression  
**Role:** M5 - QA / Analytics / Reliability  
**Historical Test Date:** November 13, 2026\
**Latest-Main Retest Date:** November 15, 2026\
**Environment:** Docker Backend QA (historical) / local Java 17 + PostgreSQL 16 (latest-main retest)
**Backend URL:** http://localhost:8081 (historical) / http://localhost:18081 (latest-main retest)

---

## 1. Confirmed Defect Summary

| Defect ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| DEF-001 | Backend Beacon Resolution | Invalid Beacon major returned HTTP 500 instead of HTTP 400 | Medium | FIXED |

**Confirmed Defects:** 1  
**Open Defects:** 0
**Closed Defects:** 1

The defect was reproduced and documented, then fixed and verified under S5-M2-02.

---

## 2. DEF-001 - Invalid Beacon Validation

### 2.1 Defect Information

| Field | Description |
|---|---|
| Defect ID | DEF-001 |
| Title | Invalid Beacon major value returns HTTP 500 |
| Module | Backend Beacon Resolution |
| API | GET /api/beacons/resolve |
| Classification | Functional Defect |
| Severity | Medium |
| Status | FIXED (verified under S5-M2-02) |
| Environment | Docker QA Backend |
| Responsible Module | Backend Request Validation |

### 2.2 Preconditions

| ID | Precondition |
|---|---|
| PRE-01 | Backend QA is running |
| PRE-02 | Backend is accessible through port 8081 |
| PRE-03 | Beacon Resolution API is available |

### 2.3 Test Data

| Parameter | Value |
|---|---|
| uuid | 11111111-2222-4333-8444-555555555555 |
| major | 70000 |
| minor | 1 |

The `major` value exceeds the maximum valid value of 65535.

### 2.4 Steps to Reproduce

| Step | Action |
|---|---|
| 1 | Start Backend QA |
| 2 | Open PowerShell |
| 3 | Send a GET request to Beacon Resolution |
| 4 | Set major = 70000 |
| 5 | Observe the response status |

### 2.5 Reproduction Command

```powershell
curl.exe -i "http://localhost:8081/api/beacons/resolve?uuid=11111111-2222-4333-8444-555555555555&major=70000&minor=1"
```

### 2.6 Expected and Actual Results

| Item | Result |
|---|---|
| Expected HTTP Status | 400 Bad Request |
| Actual HTTP Status | 500 Internal Server Error |
| Expected Behavior | Reject invalid Beacon parameters |
| Actual Behavior | Invalid request produces internal server error |
| Test Status | FAIL |

### 2.7 Regression Verification

| Test Case | Actual Result | Status |
|---|---|---|
| Valid Beacon major = 100 | HTTP 200 | PASS |
| Invalid Beacon major = 70000 | HTTP 500 | FAIL |
| Retest after Backend QA rebuild | HTTP 500 | FAIL |

The defect remained reproducible after rebuilding the Backend QA image from updated source code.

### 2.8 Related Positive Test

| Field | Actual Result |
|---|---|
| Beacon ID | 1 |
| UUID | 11111111-2222-4333-8444-555555555555 |
| Major | 100 |
| Minor | 1 |
| Artifact ID | 48 |
| Site ID | 48 |
| HTTP Status | 200 |

Valid Beacon Resolution worked correctly.

### 2.9 Recommendation

The Backend development team should review validation and exception handling for invalid Beacon parameters.

Requests containing values outside the allowed range should produce HTTP 400 instead of HTTP 500.

The QA team should rerun regression testing after the issue is corrected.

Follow-up owner: **S5-M2-02 — Beacon Resolution Integrity & Performance**.
No separate M2 Jira defect identifier was found in the repository, so none is
invented here.

### 2.10 Latest-Main Retest (November 15, 2026)

The defect was retested against latest main
`bd0c381dcd2d67a833bdccea3341285cf7ca4f6d` using a local Java 17 backend
against PostgreSQL 16. No backend application code was modified for LTJ-62.

| Item | Result |
|---|---|
| Endpoint | `GET /api/beacons/resolve` |
| UUID | `11111111-2222-4333-8444-555555555555` |
| major | `70000` |
| minor | `1` |
| Expected | HTTP 400 Bad Request with validation error |
| Actual | HTTP 500 Internal Server Error |
| Actual response | `{"success":false,"message":"An unexpected error occurred",...}` |
| Valid-range control | HTTP 404 for an unknown beacon with major `100` |
| DEF-001 status at retest time | **OPEN (pre-fix)** |

The latest-main retest confirmed that the defect was still reproducible before
S5-M2-02. At that time, the backend applied `@Min(0)` / `@Max(65535)` to the
Resolve parameters, but exception handling returned the generic 500 response
when validation failed.

---

## 3. Defect Evidence

| Evidence | Result |
|---|---|
| Invalid Beacon API Response | HTTP 500 |
| Valid Beacon API Response | HTTP 200 |
| Backend QA Regression Retest | HTTP 500 |
| Latest-Main Retest (November 15, 2026) | HTTP 500 (pre-fix) |
| S5-M2-02 automated PostgreSQL retest | HTTP 400 — PASS |
| Invalid-request interaction count | Unchanged — PASS |
| Reproduction Command | Documented |
| Expected vs Actual Result | Documented |

---

## 4. Final Defect Assessment

| Metric | Result |
|---|---|
| Confirmed Defects | 1 |
| Open Defects | 0 |
| Resolved Defects | 1 |
| Closed Defects | 1 |
| QA Reproduction | COMPLETED |
| Backend Fix | CONFIRMED |
| Regression Verification | PASS |

**DEF-001 Status: FIXED**

The defect was fixed under S5-M2-02 and verified by automated backend and PostgreSQL tests.

---

## 5. DEF-001 Resolution Verification (S5-M2-02)

### 5.1 Fix Summary
- Added `@NotNull` to the public Beacon Resolve parameters.
- Added a dedicated `ConstraintViolationException` handler returning HTTP 400.
- Kept `@Min(0)` / `@Max(65535)` range validation.
- Narrowed unknown `DataIntegrityViolationException` handling to HTTP 500 instead of returning a misleading 409.
- No migration was required; existing PostgreSQL constraints already enforce Beacon identity and ranges.

### 5.2 Verification Results
| Test Case | Expected | Actual | Status |
|---|---|---|---|
| `major=70000` | HTTP 400 | HTTP 400 | PASS |
| `minor=70000` | HTTP 400 | HTTP 400 | PASS |
| Negative and `65536` values | HTTP 400 | HTTP 400 | PASS |
| Non-integer and empty values | HTTP 400 | HTTP 400 | PASS |
| Missing required parameters | HTTP 400 | HTTP 400 | PASS |
| Boundary values `0` and `65535` | Accepted | Accepted | PASS |
| Invalid request creates no VisitorInteraction | Count unchanged | Count unchanged | PASS |

### 5.3 Evidence
- `BeaconResolveValidationTest`: 18 tests, 0 failures.
- `BeaconResolutionIntegrityIT`: 15 tests, 0 failures.
- Full backend Surefire: 154 tests, 0 failures.
- Full PostgreSQL Failsafe: 70 tests, 0 failures.
- CI PostgreSQL gate now includes `BeaconResolutionIntegrityIT` with a minimum of 15 tests.

**DEF-001 is FIXED and ready for QA closure.**
