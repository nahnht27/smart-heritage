
# SPRINT 5 - M5 FULL-STACK REGRESSION TEST RESULTS

**Project:** Smart Heritage  
**Sprint:** Sprint 5  
**Task ID:** S5-M5-01  
**Task:** Full-Stack End-to-End Regression  
**Role:** M5 - QA / Analytics / Reliability  
**Test Date:** November 14, 2026  
**Git Branch:** LTJ-62  
**Environment:** Windows, Docker QA, PostgreSQL, Physical Android Device

---

## 1. Objective

Verify critical Smart Heritage workflows across Backend APIs, PostgreSQL, and the Android Mobile application.

This report documents test activities executed on November 14, 2026, including security validation, anonymous visitor interactions, idempotency, Multimedia integration, and Mobile UI regression.

---

## 2. Test Environment

| Component | Configuration |
|---|---|
| Backend | Spring Boot / Docker |
| QA Backend URL | http://localhost:8081 |
| Database | PostgreSQL |
| QA Database | smart_heritage_test |
| Database Container | smart-heritage-db |
| Backend Container | smart-heritage-backend-qa |
| Mobile | React Native / Expo SDK 57 |
| Device | Physical Android Device |
| Mobile Backend URL | http://10.160.1.225:8081/api |
| Testing Tools | PowerShell, curl, Docker, psql |
| Test Data | Heritage Site 48, Artifact 48 |

All tests used the dedicated QA environment.

---

## 3. Test Execution Summary

| Test Case | Test Scenario | Result |
|---|---|---|
| M5-SEC-401 | Unauthorized Artifact Deletion | PASS |
| M5-SEC-409 | Resource Conflict Handling | PASS |
| M5-API-ANON-01 | Anonymous Visitor Interaction | PASS |
| M5-API-IDEMP-01 | Interaction Idempotency | PASS |
| M5-API-MEDIA-01 | Multimedia API Integration | PASS |
| M5-API-MEDIA-02 | Multimedia Database Verification | PASS |
| M5-API-MEDIA-03 | Multimedia Deletion and Cleanup | PASS |
| M5-MOB-01 | Launch Android Application | PASS |
| M5-MOB-04 | Artifact List | PASS |
| M5-MOB-05 | Artifact Detail | PASS |
| M5-MOB-08 | Heritage Site Display | PASS |
| M5-MOB-09 | Favorites and History Screen | UI PASS |
| M5-MOB-10 | Favorites List | UI PASS |
| M5-MOB-11 | Visit History List | UI PASS |
| M5-MOB-12 | Feedback Screen | UI PASS |
| M5-MOB-13 | Heritage Map Screen | UI PASS |
| M5-MOB-14 | Bluetooth Activation | PASS |
| M5-MOB-15 | Location Permission Dialog | PASS |
| DEF-001 | Invalid Beacon Parameter Validation | FAIL - OPEN |

Additional Mobile test IDs (M5-MOB-08 to M5-MOB-15) are QA reporting identifiers and are not confirmed Jira task IDs.

---

## 4. Security Testing

### 4.1 M5-SEC-401 - Unauthorized Artifact Deletion

**Endpoint:** DELETE /api/artifacts/48

| Test Step | Expected Result | Actual Result | Status |
|---|---|---|---|
| DELETE without valid ADMIN JWT | HTTP 401 | HTTP 401 | PASS |
| GET Artifact after rejected DELETE | HTTP 200 | HTTP 200 | PASS |

**Result: PASS**

The backend rejected an unauthorized deletion request and preserved Artifact 48.

### 4.2 M5-SEC-409 - Resource Conflict Handling

**Endpoint:** DELETE /api/artifacts/48

**Preconditions:**

- Artifact ID 48 existed.
- Associated Visitor Interactions: 2.
- Associated Beacons: 1.
- Associated Multimedia: 0.
- ADMIN authentication succeeded.

| Test Step | Expected Result | Actual Result | Status |
|---|---|---|---|
| ADMIN Login | Successful authentication | SUCCESS | PASS |
| DELETE Artifact 48 | HTTP 409 | HTTP 409 | PASS |
| GET Artifact 48 after DELETE | Artifact remains accessible | Artifact ID 48 | PASS |

**Result: PASS**

The backend correctly prevented deletion of an Artifact referenced by existing Visitor Interactions and Beacons.

---

## 5. Anonymous Visitor Identity and Idempotency

**Test Case:** M5-API-ANON-01  
**Endpoint:** POST /api/interactions

### 5.1 Test Results

| Test Step | Expected Result | Actual Result | Status |
|---|---|---|---|
| Submit interaction without JWT | HTTP 201 | HTTP 201 | PASS |
| Resubmit identical eventId | HTTP 200 | HTTP 200 | PASS |
| Verify PostgreSQL record | One matching event | 1 record | PASS |
| Verify visitorId | UUID stored correctly | UUID matched | PASS |
| Verify artifactId | Artifact 48 | Artifact 48 | PASS |
| Verify interactionType | VIEW | VIEW | PASS |

### 5.2 PostgreSQL Evidence

| Field | Actual Value |
|---|---|
| event_id | 006a2611-06d4-4760-8adf-d7d767c73eb0 |
| visitor_id | b34a759b-f806-4d29-8be7-f3f48beb1751 |
| artifact_id | 48 |
| interaction_type | VIEW |
| record_count | 1 |

### 5.3 Conclusion

**Result: PASS**

The Backend API accepted an interaction from an unauthenticated visitor and stored the visitor UUID.

Resubmitting the same eventId returned HTTP 200 without creating a duplicate database record.

**Limitation:** Visitor identity persistence after restarting the Android application was not independently verified.

---

## 6. Multimedia API Integration Testing

**Test Case:** M5-API-MEDIA-01  
**Artifact ID:** 48  
**Test Multimedia ID:** 3

### 6.1 Test Data

| Field | Value |
|---|---|
| multimediaId | 3 |
| artifactId | 48 |
| type | AUDIO |
| title | M5 QA Multimedia Test |
| url | https://example.com/qa-test-audio.mp3 |

The Multimedia URL was a placeholder used for API testing.

### 6.2 Test Execution

| Step | Test Scenario | Actual Result | Status |
|---|---|---|---|
| 1 | Create Multimedia | Multimedia ID 3 created | PASS |
| 2 | GET /api/multimedia?artifactId=48 | HTTP 200 | PASS |
| 3 | Verify Artifact association | Artifact ID 48 | PASS |
| 4 | Verify PostgreSQL persistence | Multimedia ID 3 stored | PASS |
| 5 | DELETE /api/multimedia/3 | HTTP 200 | PASS |
| 6 | Verify database cleanup | Remaining records = 0 | PASS |

### 6.3 Database Verification

```sql
SELECT *
FROM multimedia
WHERE multimedia_id = 3;
```

Before deletion, PostgreSQL contained one matching Multimedia record linked to Artifact 48.

After deletion:

```sql
SELECT COUNT(*) AS remaining
FROM multimedia
WHERE multimedia_id = 3;
```

**Actual Result:** remaining = 0

### 6.4 Conclusion

**Result: PASS**

Multimedia creation, retrieval, Artifact association, database persistence, deletion, and cleanup were verified successfully.

**Limitation:** Actual audio playback was not tested because the Multimedia URL was a placeholder.

---

## 7. Physical Android Mobile UI Testing

**Device:** Physical Android Device  
**Mobile Application:** Smart Heritage QA APK

### 7.1 Application and Content

| Test Case | Scenario | Actual Result | Status |
|---|---|---|---|
| M5-MOB-01 | Launch Android App | Application opened successfully | PASS |
| M5-MOB-04 | View Artifact List | 1 Artifact displayed | PASS |
| M5-MOB-05 | View Artifact Detail | Artifact 48 details displayed | PASS |
| M5-MOB-08 | View Heritage Site | Site 48 displayed on Home | PASS |

**Verified Content:**

| Field | Value |
|---|---|
| Heritage Site | M5 PostgreSQL IT site |
| Site ID | 48 |
| Artifact | M5 PostgreSQL IT artifact |
| Artifact ID | 48 |
| Artifact List Count | 1 |

The Android application successfully retrieved and displayed Heritage Site and Artifact content from the QA backend.

### 7.2 Favorites and Visit History

| Test Case | Scenario | Actual Result | Status |
|---|---|---|---|
| M5-MOB-09 | Open Favorites & History | Screen displayed | UI PASS |
| M5-MOB-10 | View Favorite Artifacts | 2 entries displayed | UI PASS |
| M5-MOB-11 | View Visit History | 2 entries displayed | UI PASS |

**Favorites displayed:**

- Trống Đồng Đông Sơn
- Bình Gốm Hoa Lam Chu Đậu

**History displayed:**

- Trống Đồng Đông Sơn
- Kiếm Cổ Thời Trần

The Favorites and History screen displayed both sections successfully.

Data creation, persistence, and synchronization with the Backend were not independently verified.

### 7.3 Feedback Screen

| Test Scenario | Actual Result | Status |
|---|---|---|
| Open Feedback Screen | Screen displayed | UI PASS |
| Feedback Input | Text field visible | UI PASS |
| Submit Button | Button displayed | UI PASS |

Feedback submission and database persistence were not tested.

### 7.4 Heritage Map Screen

| Test Scenario | Actual Result | Status |
|---|---|---|
| Open Heritage Map | Screen displayed | UI PASS |
| Interactive Map | Placeholder displayed | NOT IMPLEMENTED |

The screen displayed the placeholder message:

`Interactive Map goes here`

Interactive map behavior was not verified.

### 7.5 Beacon and Android Permissions

| Test Scenario | Actual Result | Status |
|---|---|---|
| Beacon Discovery Panel | Displayed on Home | UI PASS |
| Bluetooth Activation | Bluetooth enabled | PASS |
| Android Location Permission | Permission dialog displayed | PASS |
| Physical Beacon Detection | No independent hardware evidence | NOT VERIFIED |

Physical BLE hardware validation is assigned to M3.

---

## 8. DEF-001 Regression Retest

**Defect:** Invalid Beacon parameter returns HTTP 500 instead of HTTP 400.

**Endpoint:** GET /api/beacons/resolve

### Test Input

| Parameter | Value |
|---|---|
| uuid | 11111111-2222-4333-8444-555555555555 |
| major | 70000 |
| minor | 1 |

### Retest Results

| Test Step | Expected Result | Actual Result | Status |
|---|---|---|---|
| Invalid Beacon major | HTTP 400 | HTTP 500 | FAIL |
| Review GlobalExceptionHandler | Validation exception handling | No specific ConstraintViolationException handler found | INVESTIGATED |

The inspected source did not contain a dedicated handler for `ConstraintViolationException`. This is a possible explanation for the observed HTTP 500.

The running Docker QA image was not independently confirmed to contain every latest source change.

**DEF-001 Status: OPEN**

The Backend team must investigate and fix the issue before QA can close the defect.

---

## 9. Evidence Summary

| Evidence | Verified Result |
|---|---|
| Unauthorized Artifact DELETE | HTTP 401 |
| ADMIN Artifact DELETE with dependencies | HTTP 409 |
| Artifact Preservation | Artifact ID 48 remained accessible |
| Anonymous Visitor Interaction | HTTP 201 |
| Duplicate Interaction Submission | HTTP 200 |
| Interaction Database Record | Exactly 1 record |
| Multimedia Creation | Multimedia ID 3 |
| Multimedia Retrieval | HTTP 200 |
| Multimedia PostgreSQL Verification | Matching record confirmed |
| Multimedia Deletion | HTTP 200 |
| Multimedia Cleanup | 0 remaining records |
| Android Artifact List | 1 Artifact displayed |
| Android Artifact Detail | Artifact 48 displayed |
| Heritage Site on Mobile | Site 48 displayed |
| Favorites | 2 entries displayed |
| Visit History | 2 entries displayed |
| Feedback UI | Input form and Submit button displayed |
| Heritage Map UI | Placeholder screen displayed |
| Bluetooth | Enabled |
| Location Permission | Permission prompt displayed |
| DEF-001 Retest | HTTP 500 - FAIL |

---

## 10. Final Assessment

The November 14, 2026 QA execution successfully verified:

- HTTP 401 authentication protection.
- HTTP 409 resource conflict protection.
- Anonymous Visitor Interaction creation.
- Interaction idempotency and PostgreSQL persistence.
- Multimedia API CRUD and database cleanup.
- Android Artifact List and Detail.
- Heritage Site display on Android.
- Favorites, History, Feedback, and Map screen rendering.
- Bluetooth activation and Android location permission prompt.

**Overall Result:** Completed test scenarios passed within their verified scope.




