# Sprint 6 - M5 Security Negative Testing Report

## 1. Overview

- **Jira:** LTJ-76
- **Task:** S6-M5-02 - Security Negative Testing
- **Branch:** LTJ-76
- **Date:** 2026-11-23
- **Owner:** M5 - QA / Analytics / Reliability

## 2. Test objectives

Verify that the application rejects unauthorized access, malformed input, invalid Beacon values, duplicate resources and potentially dangerous CSV content.

## 3. Test environment

- Backend: Java 17, Spring Boot 3.2.5, Maven
- Frontend: React, TypeScript, Vitest
- Database: PostgreSQL
- Deployment: Docker
- API base URL: http://localhost:8080

## 4. Security-negative test matrix

| ID | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| SEC-01 | Missing JWT on protected API | 401 | 401 | PASS |
| SEC-02 | Invalid JWT | 401 | 401 | PASS |
| SEC-03 | VISITOR accesses ADMIN Beacon API | 403 | 403 | PASS |
| SEC-04 | Invalid login credentials | 401 | 401 | PASS |
| SEC-05 | Login request missing password | 400 | 400 | PASS |
| SEC-06 | Unknown heritage site | 404 | 404 | PASS |
| SEC-07 | Duplicate username | 409 | 409 | PASS |
| SEC-08 | Duplicate email | 409 | 409 | PASS |
| SEC-09 | Beacon major exceeds 65535 | 400 | 400 | PASS |
| SEC-10 | Duplicate Beacon identity | 409 | 409 | PASS |
| SEC-11 | Beacon major/minor boundary validation | Reject invalid ranges | Rejected in automated tests | PASS |
| SEC-12 | CSV formula injection (=, +, -, @) | Escape dangerous cells | Escaped in unit tests | PASS |
| SEC-13 | CSV leading whitespace, tab and CR | Prevent formula injection | Validated in unit tests | PASS |

## 5. Automated test execution

| Suite | Executed | Passed | Failed |
|---|---:|---:|---:|
| AuthControllerTest | 18 | 18 | 0 |
| BeaconControllerTest | 6 | 6 | 0 |
| BeaconResolveValidationTest | 18 | 18 | 0 |
| GlobalExceptionHandlerTest | 3 | 3 | 0 |
| Artifact, Heritage Site, Multimedia, Visitor Interaction, CORS and Public Content tests | 82 | 82 | 0 |
| analyticsCsv.test.ts | 14 | 14 | 0 |
| **Total test executions** | **141** | **141** | **0** |

All listed executions reported zero errors and zero skipped tests.

## 6. Reproduction commands

Run backend tests from `backend/`:

```powershell
mvn "-Dtest=AuthControllerTest" test
mvn "-Dtest=BeaconControllerTest" test
mvn "-Dtest=BeaconResolveValidationTest" test
mvn "-Dtest=GlobalExceptionHandlerTest" test
mvn "-Dtest=ArtifactControllerTest,HeritageSiteControllerTest,MultimediaControllerTest,VisitorInteractionControllerTest,CorsIntegrationTest,PublicContentAccessTest" test

```

Run frontend CSV tests from `frontend/`:

```powershell
npm ci
npm test -- --run src/utils/__tests__/analyticsCsv.test.ts
```

## 7. Evidence

- AuthControllerTest: 18/18 PASS
- BeaconControllerTest: 6/6 PASS
- BeaconResolveValidationTest: 18/18 PASS
- GlobalExceptionHandlerTest: 3/3 PASS
- Additional Controller tests: 82/82 PASS
- Analytics CSV tests: 14/14 PASS

## 8. Limitations

- Real ADMIN login on Docker has not been fully verified.
- Physical Android BLE testing is outside this task.
- npm reported 10 dependency vulnerabilities requiring separate review.
- This is targeted negative testing, not a full penetration test.

## 9. Conclusion

All 141 selected test executions passed with no failures. Remaining limitations are documented.

