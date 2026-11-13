
# SPRINT 5 - M5 FULL-STACK REGRESSION TEST REPORT

**Project:** Smart Heritage  
**Task ID:** S5-M5-01  
**Task Name:** Full-Stack End-to-End Regression  
**Role:** M5 - QA / Analytics / Reliability  
**Test Date:** November 13, 2026  
**Git Branch:** LTJ-62  
**Test Environment:** Windows, Docker QA, PostgreSQL, Admin Web, Physical Android Device

---

## 1. Objective

Verify the correctness and reliability of critical Smart Heritage workflows across Backend APIs, Admin Web, PostgreSQL, and Mobile.

This report contains completed and verified test executions.

Confirmed defects are documented separately in `sprint-5-m5-defect-log.md`.

---

## 2. Test Environment

| Component | Configuration |
|---|---|
| Backend | Spring Boot |
| Backend QA | http://localhost:8081 |
| Database | PostgreSQL |
| Test Database | smart_heritage_test |
| Admin Frontend | React / Vite |
| Admin Web | http://localhost:5173 |
| Mobile | React Native / Expo SDK 57 |
| Mobile Device | Physical Android Device |
| API Testing | PowerShell, curl |
| Database Verification | Docker, PostgreSQL psql |
| Browser | Google Chrome |
| Version Control | Git / GitHub |

All Backend integration tests were executed against the QA environment.

---

## 3. Automated Regression Testing

### 3.1 Test Execution Results

| Test Suite | Passed | Failed | Status |
|---|---:|---:|---|
| Frontend Vitest | 58 | 0 | PASS |
| Mobile Jest | 81 | 0 | PASS |
| Backend Maven | 134 | 0 | PASS |
| PostgreSQL Integration | 22 | 0 | PASS |
| **TOTAL** | **295** | **0** | **PASS** |

### 3.2 Result

All 295 automated regression and integration tests passed in the recorded executions.

These results verify existing automated test coverage. Mobile Jest testing is separate from physical Android E2E testing.

**Automated Regression: PASS**

---

## 4. Admin Web Functional Testing

### 4.1 Test Summary

| Module | Test Scenario | Actual Result | Status |
|---|---|---|---|
| Admin Login | Login with valid Admin credentials | Dashboard displayed | PASS |
| Admin Dashboard | Load and refresh Analytics | Analytics displayed | PASS |
| Heritage Site Management | Create, Read, Update, Delete | 4/4 passed | PASS |
| Artifact Management | Create, Read, Update, Delete | 4/4 passed | PASS |
| Multimedia Management | Create, Update, Delete | 3/3 passed | PASS |
| Beacon Management | List, Create, Edit, Enable/Disable, Delete | 5/5 passed | PASS |
| Admin Logout | Logout and verify protected route | Successful | PASS |

### 4.2 Heritage Site Management

| Test Case | Actual Result | Status |
|---|---|---|
| Create Heritage Site | New test Site created | PASS |
| View Heritage Site | Site displayed correctly | PASS |
| Update Heritage Site | Changes saved successfully | PASS |
| Delete Heritage Site | Test Site deleted | PASS |

**Result: 4/4 PASS**

### 4.3 Artifact Management

| Test Case | Actual Result | Status |
|---|---|---|
| Create Artifact | New test Artifact created | PASS |
| View Artifact | Artifact displayed correctly | PASS |
| Update Artifact | Changes saved successfully | PASS |
| Delete Artifact | Test Artifact deleted | PASS |

**Result: 4/4 PASS**

### 4.4 Multimedia Management

| Test Case | Actual Result | Status |
|---|---|---|
| Create Multimedia | Successful | PASS |
| Update Multimedia | Successful | PASS |
| Delete Multimedia | Successful | PASS |

**Result: 3/3 PASS**

---

## 5. Beacon Management UI Testing

**Test Case ID:** M5-UI-14  
**Environment:** Admin Web  
**Overall Result:** PASS

| Test ID | Test Scenario | Actual Result | Status |
|---|---|---|---|
| M5-UI-14.1 | View Beacon List | List displayed | PASS |
| M5-UI-14.2 | Create Beacon | Test Beacon created | PASS |
| M5-UI-14.3 | Edit Beacon | Information updated | PASS |
| M5-UI-14.4 | Enable / Disable Beacon | Status changed successfully | PASS |
| M5-UI-14.5 | Delete Beacon | Test Beacon deleted | PASS |

The original Beacon record was preserved during testing.

**Beacon Management: 5/5 PASS**

---

## 6. Admin Authentication and Logout

### 6.1 Admin Login

| Test Scenario | Actual Result | Status |
|---|---|---|
| Login using valid Admin credentials | Login successful | PASS |
| Access Admin Dashboard | Dashboard displayed | PASS |
| Access protected Admin functions | Authorized requests accepted | PASS |

### 6.2 Admin Logout

**Test Case ID:** M5-UI-17

| Test Step | Actual Result | Status |
|---|---|---|
| Login as Admin | Successful | PASS |
| Click Logout | Redirected to Login | PASS |
| Access /dashboard after Logout | Redirected to Login | PASS |
| Inspect Local Storage | Empty | PASS |
| Inspect Session Storage | Empty | PASS |

Client-side logout and protected-route behavior were successfully verified.

**Admin Authentication and Logout: PASS**

---

## 7. Backend API Integration Testing

### 7.1 API Results

| Test Scenario | Actual Result | Status |
|---|---|---|
| Public Content Retrieval | HTTP 200 | PASS |
| Valid Beacon Resolution | HTTP 200 | PASS |
| Visitor Interaction Creation | HTTP 201 Created | PASS |
| Interaction Idempotency | Duplicate event returned HTTP 200 without duplicate insertion | PASS |
| Analytics Summary | Expected data returned | PASS |
| Analytics Timeseries | Expected data returned | PASS |
| Analytics Languages | Expected data returned | PASS |
| Admin API CRUD | 16/16 executed operations passed | PASS |

### 7.2 Authorization Testing

| Test Scenario | Actual Result | Status |
|---|---|---|
| Authorized Admin Access | Request accepted | PASS |
| Anonymous Access to Protected Analytics | HTTP 401 | PASS |
| Visitor Access to ADMIN-only Operations | HTTP 403 | PASS |
| Previously Tested Visitor Restrictions | 5/5 passed | PASS |

**Backend Positive-Path and Authorization Testing: PASS**

---

## 8. Expired JWT Testing

**Test Case ID:** M5-AUTH-01

### 8.1 Configuration

| Item | Value |
|---|---|
| Test Environment | Temporary Docker QA Backend |
| Port | 8083 |
| JWT Expiration | 30 seconds |
| Protected API | GET /api/users/me |

### 8.2 Test Results

| Test Step | Expected | Actual | Status |
|---|---|---|---|
| Login | Authentication successful | Successful | PASS |
| Request before token expiration | HTTP 200 | HTTP 200 | PASS |
| Request after token expiration | HTTP 401 | HTTP 401 | PASS |

The backend correctly rejected an expired JWT.

**M5-AUTH-01: PASS**

---

## 9. Network Failure and Recovery Testing

### 9.1 Network Failure

**Test Case ID:** M5-RES-01

| Test Step | Actual Result | Status |
|---|---|---|
| Open Admin Dashboard | Dashboard loaded | PASS |
| Enable Chrome DevTools Offline mode | Network disconnected | PASS |
| Refresh Dashboard | Error Loading Analytics displayed | PASS |
| Inspect error handling | Retry button displayed | PASS |
| Verify application stability | No application crash observed | PASS |

**M5-RES-01: PASS**

### 9.2 Network Recovery

**Test Case ID:** M5-RES-02

| Test Step | Actual Result | Status |
|---|---|---|
| Restore network connectivity | Network restored | PASS |
| Retry / Refresh Dashboard | Request executed | PASS |
| Authentication API | HTTP 200 | PASS |
| Analytics API | HTTP 200 | PASS |
| Dashboard Recovery | Normal operation restored | PASS |

**M5-RES-02: PASS**

---

## 10. Visitor Interaction to Analytics Integration

**Test Case ID:** M5-E2E-01  
**Execution Date:** November 13, 2026  
**Test Method:** Backend API, PostgreSQL, Admin Dashboard

### 10.1 Integration Workflow

| Step | Component | Actual Result | Status |
|---|---|---|---|
| 1 | Beacon Resolution | HTTP 200; Beacon ID 1 | PASS |
| 2 | Artifact Details | HTTP 200; Artifact ID 48 | PASS |
| 3 | Visitor Interaction | HTTP 201; Interaction ID 464 | PASS |
| 4 | PostgreSQL Verification | Interaction 464 stored | PASS |
| 5 | Analytics Summary | Total Interactions = 2 | PASS |
| 6 | Admin Dashboard | Total Interactions = 2 | PASS |

### 10.2 Test Data

| Field | Value |
|---|---|
| Beacon ID | 1 |
| Artifact ID | 48 |
| Site ID | 48 |
| Interaction ID | 464 |
| Interaction Type | BEACON_TRIGGER |
| Language Code | vi |
| Event ID | 51cdd677-ecf7-4b54-8608-dd893ef366da |
| Visitor ID | 94d622a9-8c96-456c-bd3f-a974971cf40d |
| Interaction Time | 2026-11-13T16:38:29Z |
| Database | smart_heritage_test |

### 10.3 PostgreSQL Verification

The following SQL queries were executed:

```sql
SELECT *
FROM visitor_interaction
WHERE interaction_id = 464;

SELECT COUNT(*) AS total_interactions
FROM visitor_interaction;
```

### 10.4 Database Results

| Database Column | Actual Value | Status |
|---|---|---|
| interaction_id | 464 | PASS |
| artifact_id | 48 | PASS |
| beacon_id | 1 | PASS |
| interaction_type | BEACON_TRIGGER | PASS |
| language_code | vi | PASS |
| event_id | 51cdd677-ecf7-4b54-8608-dd893ef366da | PASS |
| Matching Records | 1 | PASS |

### 10.5 Analytics Verification

| Metric | PostgreSQL | Admin Dashboard | Status |
|---|---:|---:|---|
| Total Interactions | 2 | 2 | PASS |

The tested integration flow was successful across Backend API, PostgreSQL, Analytics, and Admin Dashboard.

This execution used direct Backend API requests rather than native Mobile-originated interaction events.

**M5-E2E-01: PASS**

---

## 11. Physical Android Application Testing

**Test Case ID:** M5-MOB-01

| Test Scenario | Actual Result | Status |
|---|---|---|
| Build Android APK using Expo EAS | Build successful | PASS |
| Install APK on Physical Android Device | Installation successful | PASS |
| Launch Mobile Application | Application opened successfully | PASS |

### Build Evidence

Expo EAS Build:

https://expo.dev/accounts/thuhong/projects/app_temp/builds/fa9e5957-60f4-48b7-ac69-9111bf45974b

**M5-MOB-01: PASS**

---

## 12. Test Traceability Matrix

| User Journey | Test Type | Actual Result | Evidence |
|---|---|---|---|
| Admin Authentication | UI / API | PASS | Login and Logout |
| Content Management | Admin UI | PASS | Site 4/4, Artifact 4/4, Multimedia 3/3 |
| Beacon Management | Admin UI | PASS | Beacon CRUD 5/5 |
| Beacon Resolution | API | PASS | HTTP 200, Beacon ID 1 |
| Interaction Recording | API / PostgreSQL | PASS | HTTP 201, Interaction ID 464 |
| Interaction Idempotency | API / Database | PASS | Duplicate HTTP 200; no duplicate record |
| Analytics | Backend / Admin Web | PASS | PostgreSQL = 2; Dashboard = 2 |
| Expired JWT | API | PASS | HTTP 200 before, HTTP 401 after expiration |
| Network Reliability | Browser UI | PASS | Failure and Recovery 2/2 |
| Mobile App Launch | Physical Android | PASS | APK installed and launched |

---

## 13. Test Evidence Summary

| Evidence | Verified Result |
|---|---|
| Frontend Vitest | 58/58 PASS |
| Mobile Jest | 81/81 PASS |
| Backend Maven | 134/134 PASS |
| PostgreSQL Integration | 22/22 PASS |
| Heritage Site Management | 4/4 PASS |
| Artifact Management | 4/4 PASS |
| Multimedia Management | 3/3 PASS |
| Beacon Management | 5/5 PASS |
| Expired JWT | HTTP 200 then HTTP 401 |
| Network Failure / Recovery | 2/2 PASS |
| Visitor Interaction | HTTP 201, Interaction ID 464 |
| PostgreSQL Persistence | Interaction ID 464 stored |
| Analytics Consistency | Total Interactions = 2 |
| Physical Android APK | Build, Install, Launch PASS |

The results above summarize verified executions. Screenshots and terminal outputs can be attached separately as supporting artifacts.

---

## 14. Completed Test Summary

| Testing Area | Final Result |
|---|---|
| Automated Regression | 295/295 PASS |
| Admin Login / Logout | PASS |
| Heritage Site CRUD | 4/4 PASS |
| Artifact CRUD | 4/4 PASS |
| Multimedia CRUD | 3/3 PASS |
| Beacon Management | 5/5 PASS |
| Backend API Positive Scenarios | PASS |
| Authentication and Authorization | PASS for executed scenarios |
| Expired Token | PASS |
| Network Failure and Recovery | 2/2 PASS |
| Visitor to Analytics API Integration | 6/6 PASS |
| PostgreSQL Persistence | PASS |
| Analytics Data Consistency | PASS |
| Physical Android Installation and Launch | PASS |

## 15. Conclusion

The completed S5-M5-01 regression activities successfully verified automated tests, Admin Web functionality, authentication, authorization, network reliability, Backend API integration, PostgreSQL persistence, and Analytics consistency.

All 295 automated tests passed.

The Admin Web successfully completed the tested Heritage Site, Artifact, Multimedia, and Beacon management workflows.

The Visitor Interaction API successfully recorded Interaction ID 464, and PostgreSQL data matched the Admin Dashboard analytics total.

The Android QA APK was successfully built, installed, and launched on a physical device.

**Report Scope: Completed and verified test executions only.**

This report does not claim that every acceptance criterion of S5-M5-01 has been completed.
