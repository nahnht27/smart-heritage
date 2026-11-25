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

CI run #155 (commit 276268c):
https://github.com/nahnht27/smart-heritage/actions/runs/45410192373

CI run #156 (commit 492b509), job log confirms 72/72:
https://github.com/nahnht27/smart-heritage/actions/runs/45422616134

Synchronized branch CI (merge commit 1748a92), job log confirms 72/72:
https://github.com/nahnht27/smart-heritage/actions/runs/45646351477

### Secret Leakage Review

    Commits scanned: 176
    Data scanned: 4.81 MB
    Raw findings: 1
    Confirmed false positives: 1
    Confirmed real secrets: 0

Raw Gitleaks exit code: 1.

No confirmed real secret was detected within the reviewed scope.

Post-synchronization rescan (2026-11-25, Gitleaks 8.24.2):

    Commits scanned: 173
    Data scanned: 4.94 MB
    Raw findings: 1
    Confirmed false positives: 1
    Confirmed real secrets: 0
    Scanner exit code: 1

The finding is unchanged: rule `generic-api-key` in
`docs/sprint-6/README.md` line 10, commit `9fdc64413c4e`.
Manual review confirms ordinary Markdown text. No allowlist
or history rewrite was introduced. Gitleaks' default history
walk reported 173 commits; an explicit `--log-opts=HEAD` walk
reported 150 commits. Both scans found the same single
reviewed false positive. `git rev-list --count HEAD` is 195,
so the tool's commit-count basis differs from `rev-list`;
the scan range is recorded here without overstating it.

### Dependency Audit

Before remediation:

    10 vulnerabilities (9 moderate, 1 high)

After remediation:

    found 0 vulnerabilities

Production dependency audit:

    found 0 vulnerabilities

Post-synchronization dependency audit (2026-11-25, npm 11.12.1):

    npm audit:            0 vulnerabilities
    npm audit --omit=dev: 0 vulnerabilities
    package.json diff:    none
    --force used:         no

| Package | Before | After | Scope | Dependency path | Advisory |
|---|---|---|---|---|---|
| follow-redirects | 1.16.1 | 1.16.3 | Transitive | axios@1.20.0 | GHSA-mrwp-f3q8-3g9p (high) |
| minimatch | 10.2.6 | 11.0.9 | Transitive | eslint@10.15.0, typescript-eslint@8.74.0 | GHSA-g3hv-75wg-m249 (medium) |

The minimatch advisory covers `>=7.0.0 <11.0.1`; 11.0.9 is
outside the vulnerable range. The follow-redirects advisory
covers `>=1.16.0 <=1.16.1`; 1.16.3 is outside that range.
The lockfile also advances the eslint/typescript-eslint
cascade needed to satisfy the minimatch 11 ranges. These are
transitive, lockfile-only updates; no direct dependency range
in package.json changed and no application code changed.
M4 dependency review remains pending and has not been claimed
as approved.

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

### Synchronized Linux Frontend Regression

After merging `origin/main` (`50132ea`), the full frontend suite
was rerun on Linux with Node.js v24.15.0 and npm 11.12.1:

    npm ci:      265 packages, 0 vulnerabilities
    npm run lint: PASS
    npm test:    19 test files, 162 tests passed
    npm run build: PASS (59 modules, built in 331ms)

The increase from 129 to 162 tests is from the additional
M4 Translations and Feedback tests already on main. Dashboard
Analytics and CSV security regressions remain included and pass.
Windows was not available in the synchronized environment, so
the recorded 120/129 Windows result is preserved unchanged and
is not reported as PASS.

## Changed Files

- backend/src/test/java/com/university/backend/security/JwtExpirationTest.java
- backend/src/test/java/com/university/backend/security/JwtExpirationHttpTest.java
- frontend/package-lock.json
- docs/testing/sprint-6-m5-security-negative-test-supplement.md
- docs/logs/LTJ-77.md
- docs/logs/LTJ-76.md
- docs/logs/LTJ-78.md
- docs/testing/sprint-6-m5-performance-reliability-report.md

## Findings

| ID | Severity | Status | Proposed owner |
|---|---|---|---|
| SEC-F01 | High | Lockfile remediated; M4 review pending | M4 |
| SEC-F02 | Moderate | Lockfile remediated; M4 review pending | M4 |
| SEC-F03 | Low | Environment-dependent test failures | M4 |
| SEC-F04 | Informational | Gitleaks false positive reviewed | M5 |

## Limitations

- Windows regression recorded nine failed Dashboard tests.
- Linux regression passed all 162 tests after main synchronization.
- Locale is a likely contributor but not isolated as the sole cause.
- Secret leakage review does not guarantee absence of all secrets.
- Historical PostgreSQL run #155 predates the JWT and dependency
  changes; runs #156 and the synchronized CI confirm 72/72 after them.
- Dependency remediation still requires M4 review.
- Updated CI is green; PR review and M4 review remain pending.

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

The branch is synchronized with main `50132ea` through merge commit
`1748a92`. The 12-job CI run
https://github.com/nahnht27/smart-heritage/actions/runs/45646351477
passed on `1748a92` (`backend-test`, `postgres-integration`,
`database-backup-restore`, `frontend-checks`, `mobile-tests`,
`mobile-static-analysis (advisory)`, `demo-seed-static-checks`,
`demo-seed-isolation`, `demo-seed-lifecycle`, `docker-build`,
`integration-smoke`, `production-smoke`).

Combined PR review and M4 dependency review remain pending.
Final release approval also requires E2E acceptance.
The Windows locale limitation remains unchanged.
