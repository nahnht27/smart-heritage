# LTJ-77 - Security and Negative-Path Regression

## Task Information

- Sprint: 6
- Task: S6-M5-02
- Jira: LTJ-77
- Owner: M5 - QA / Analytics / Reliability
- Branch: LTJ-76
- Date: 2026-11-24
- QA status: PASS WITH LIMITATIONS

## Objectives

- Verify authentication and authorization.
- Verify expired JWT rejection.
- Verify invalid requests and database constraints.
- Verify CSV injection protection.
- Review potential secret leakage.
- Review and remediate frontend dependency vulnerabilities.
- Execute frontend regression after remediation.

## Completed Work

- Verified ADMIN access returns HTTP 200.
- Verified empty login request returns HTTP 400.
- Added JWT expiration and HTTP authentication tests.
- Verified all four new JWT tests passed.
- Reviewed PostgreSQL integration results from CI #155.
- Reviewed tracked configuration files and Git history.
- Classified one Gitleaks finding as a false positive.
- Remediated frontend dependency vulnerabilities without --force.
- Verified frontend lint, unit tests and production build on Linux.

## Execution Evidence

### JWT Regression

    Tests run: 4
    Failures: 0
    Errors: 0
    Skipped: 0
    BUILD SUCCESS

### PostgreSQL Integration

    Total tests: 72
    Failures: 0
    Errors: 0
    Skipped: 0

CI run:
https://github.com/nahnht27/smart-heritage/actions/runs/45410192373

### Secret Leakage Review

    Commits scanned: 176
    Data scanned: 4.81 MB
    Raw findings: 1
    Confirmed false positives: 1
    Confirmed real secrets: 0

Raw Gitleaks exit code: 1.

No confirmed real secret was detected within the reviewed scope.

### Dependency Audit

Before remediation:

    10 vulnerabilities (9 moderate, 1 high)

After remediation:

    found 0 vulnerabilities

Production dependency audit:

    found 0 vulnerabilities

### Windows Frontend Regression

    Locale: vi-VN
    Default: 1.420
    en-US: 1,420

    Test Files: 14 passed, 1 failed
    Tests: 120 passed, 9 failed

All nine failures occurred in DashboardPage.test.tsx.

### Docker Linux Frontend Regression

    Node.js: v22.23.5
    npm: 10.9.9
    Locale: en-US

    Test Files  15 passed (15)
         Tests  129 passed (129)
      Duration  15.63s

ESLint: PASS.
Dashboard Analytics: 15/15 PASS.
CSV security tests: 14/14 PASS.

### Production Build

    53 modules transformed.
    built in 250ms

    $LASTEXITCODE
    0

Production build: PASS.

## Changed Files

- backend/src/test/java/com/university/backend/security/JwtExpirationTest.java
- backend/src/test/java/com/university/backend/security/JwtExpirationHttpTest.java
- frontend/package-lock.json
- docs/testing/sprint-6-m5-security-negative-test-supplement.md
- docs/logs/LTJ-77.md

## Findings

| ID | Severity | Status | Proposed owner |
|---|---|---|---|
| SEC-F01 | High | Locally remediated; review pending | M4 |
| SEC-F02 | Moderate | Locally remediated; review pending | M4 |
| SEC-F03 | Low | Environment-dependent test failures | M4 |
| SEC-F04 | Informational | Gitleaks false positive reviewed | M5 |

## Limitations

- Windows regression recorded nine failed Dashboard tests.
- Linux regression passed all 129 tests.
- Locale is a likely contributor but not isolated as the sole cause.
- Secret leakage review does not guarantee absence of all secrets.
- PostgreSQL CI evidence predates the new changes.
- Dependency remediation requires M4 review.
- Updated CI and PR review remain pending.

## Evidence Format

Evidence is based on actual terminal outputs, automated test
results and GitHub Actions logs.

Some execution results are summarized.
Screenshots were not collected.

## Report

docs/testing/sprint-6-m5-security-negative-test-supplement.md

The original security report remains unchanged.

## Conclusion

Local QA recommendation: PASS WITH LIMITATIONS.

Commit, push, updated CI verification and PR review remain pending.
Final release approval also requires E2E acceptance.
