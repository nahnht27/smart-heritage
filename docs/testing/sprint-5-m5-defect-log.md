
# SPRINT 5 - M5 CONFIRMED DEFECT LOG

**Project:** Smart Heritage  
**Task ID:** S5-M5-01  
**Task Name:** Full-Stack End-to-End Regression  
**Role:** M5 - QA / Analytics / Reliability  
**Test Date:** November 13, 2026  
**Environment:** Docker Backend QA  
**Backend URL:** http://localhost:8081

---

## 1. Confirmed Defect Summary

| Defect ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| DEF-001 | Backend Beacon Resolution | Invalid Beacon major returns HTTP 500 instead of HTTP 400 | Medium | OPEN |

**Confirmed Defects:** 1  
**Open Defects:** 1  
**Closed Defects:** 0

The defect has been reproduced and documented successfully.

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
| Status | OPEN |
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

---

## 3. Defect Evidence

| Evidence | Result |
|---|---|
| Invalid Beacon API Response | HTTP 500 |
| Valid Beacon API Response | HTTP 200 |
| Backend QA Regression Retest | HTTP 500 |
| Reproduction Command | Documented |
| Expected vs Actual Result | Documented |

---

## 4. Final Defect Assessment

| Metric | Result |
|---|---|
| Confirmed Defects | 1 |
| Open Defects | 1 |
| Resolved Defects | 0 |
| Closed Defects | 0 |
| QA Reproduction | COMPLETED |
| Backend Fix | NOT CONFIRMED |

**DEF-001 Status: OPEN**

The defect identification, reproduction, and documentation activities are complete. The backend issue itself has not been resolved.
