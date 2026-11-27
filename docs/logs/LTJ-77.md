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

Final evidence commit `349b14c` also passed the 12-job push CI
(run 45648453143) and the PR-triggered CI (run 45648883631).
The PR run initially hit a transient Maven Central HTTP 429 in
`integration-smoke`; the failed job was rerun without code
changes and passed, leaving 12/12 green.

Combined PR review and M4 dependency review remain pending.
Final release approval also requires E2E acceptance.
The Windows locale limitation remains unchanged.

## Finalization update (2026-11-26)

The historical results above are preserved unchanged.

### Windows Dashboard locale regression

Root cause:

- All nine failures were `DashboardPage` tests asserting the literal text
  `1,420`.
- `DashboardPage` formats counts with locale-aware `toLocaleString()`.
  Under `vi-VN`, 1420 renders as `1.420`.
- There is no fixed-formatting-locale requirement in the repository and no
  runtime UI language selector. `preferredLanguageId` is stored but is not used
  to select content or formatting. The dashboard therefore follows the
  runtime/browser locale.
- The tests hardcoded an `en-US` result; product behavior was not the defect.

Correction:

- Added `frontend/src/utils/numberFormat.ts` with
  `formatCount(value, locale?)`, defaulting to the runtime locale.
- `DashboardPage` now uses `formatCount` for all displayed counts.
- `DashboardPage` tests derive the expected total from `formatCount(1420)`.
- Added explicit formatter coverage for `en-US` (`1,420`) and
  `vi-VN` (`1.420`).
- No `Number.prototype` monkey-patching, no skipped tests and no deleted or
  weakened assertions.

Validation:

- Linux locale simulation with `LANG=vi_VN.UTF-8` reproduced the Windows
  failure exactly: `DashboardPage.test.tsx` 6 passed / 9 failed (15 total).
- Targeted `DashboardPage` + `numberFormat` tests: 18/18 passed under both
  `en-US` and `vi-VN`, exit 0.
- Full frontend suite: 20 files, 165/165 passed under both `en-US` and
  `vi-VN`, exit 0. Runs were sequential; concurrent Vitest processes produced
  unrelated fixture contention and are not used as evidence.
- ESLint: PASS. `tsc -b && vite build`: PASS (60 modules).
- Native Windows 11 was not available and was not rerun. The Linux `vi-VN`
  result is a locale simulation, not native Windows validation.

### Dependency review and M4

- The M4 GitHub login is `nahnht27`, verified from the M4-labelled PRs
  #28, #29, #30, #35, #40, #41 and #44 (admin, analytics, beacon,
  translations/feedback), not from a display name.
- A review request was submitted to `nahnht27` on PR #46. No review decision
  or approval was manufactured.
- Lockfile-only changes: 19 resolved entries. `frontend/package.json` is
  unchanged. No `--force` was used.
- `npm ci`: 265 packages, 0 vulnerabilities.
- `npm audit`: 0 vulnerabilities; `npm audit --omit=dev`: 0 vulnerabilities.
- `npm ls --all`: exit 0, no invalid peers; only normal optional platform
  gaps (`fsevents`, other-OS binaries, optional Vite integrations).
- `follow-redirects` 1.16.1 -> 1.16.3; `minimatch` 10.2.6 -> 11.0.9;
  `eslint` 10.12.0 -> 10.15.0; `typescript-eslint` 8.71.2 -> 8.74.0;
  `brace-expansion` 5.0.12 -> 5.1.0; `@isaacs/nonrecursive-glob-match`
  1.1.0 added as a dev transitive dependency of minimatch 11.
- No direct dependency, framework or application toolchain was changed.

### Full-stack acceptance

- Local Docker Compose was not executable: the Docker daemon is inactive,
  `/var/run/docker.sock` is absent, and starting it requires a sudo password.
- CI `integration-smoke` covers public API health/content and the
  anonymous negative path only. CI `production-smoke` covers production
  packaging, SPA fallback, proxy and port exposure.
- Real-browser admin login/session, protected routes, CRUD, beacon resolution,
  analytics visibility, CSV export and browser-to-backend integration remain
  **NOT VERIFIED**.
- Physical BLE and real-device multimedia acceptance remain blocked by
  hardware or require human acceptance.
- Owner/evidence tracking:
  `docs/testing/sprint-6-full-stack-acceptance-checklist.md`.

### Preserved evidence

- JWT regression 4/4; backend 159/159; PostgreSQL 72/72.
- k6: 5 scenarios, 1,928 requests, 2,228/2,228 checks, 0% HTTP errors.
  The legacy `--summary-export` threshold interpretation is unchanged;
  original k6 process exit codes were not retained; Docker monitoring
  concurrency remains unconfirmed.
- Gitleaks: 1 reviewed false positive, 0 confirmed real secrets, exit code 1.

### CI evidence for the final code commit (2026-11-26)

Code HEAD: `adc88222a3b3b32e110d5df03607ab8c13fe979c`.

- Push run `45751420300`: 12/12 jobs success.
  https://github.com/nahnht27/smart-heritage/actions/runs/45751420300
- PR-triggered run `45751427038`: 12/12 jobs success.
  https://github.com/nahnht27/smart-heritage/actions/runs/45751427038
- Backend: 159/159.
- Frontend: 20 files, 165/165.
- Mobile: 12 suites, 108/108.
- PostgreSQL integration: 72/72.
- `integration-smoke`: 17 passed, 0 failed, 9 skipped (credentials and
  write scenarios are intentionally excluded from CI).
- `production-smoke`: PASS (health, SPA fallback, `/api` proxy, port exposure).
- All jobs: backend-test, postgres-integration, database-backup-restore,
  frontend-checks, mobile-tests, mobile-static-analysis (advisory),
  demo-seed-static-checks, demo-seed-isolation, demo-seed-lifecycle,
  docker-build, integration-smoke, production-smoke.

The CI is green for this code commit. Subsequent documentation-only commits
are covered by the final 12/12 run recorded on PR #46. CI does not replace
browser full-stack, native Windows, physical BLE or real-device multimedia
acceptance.
