# Sprint 6 - M5 Security Negative Testing Supplement

## 1. Overview

- Project: Smart Heritage
- Jira: LTJ-77
- Task: S6-M5-02
- Owner: M5 - QA / Analytics / Reliability
- Branch: LTJ-76
- Execution date: 2026-11-24
- Local QA status: PASS WITH LIMITATIONS

This report supplements the original security negative testing report.
The original report remains unchanged.

## 2. Security Regression Matrix

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| SEC-01 | Missing JWT | HTTP 401 | PASS |
| SEC-02 | Invalid JWT | HTTP 401 | PASS |
| SEC-03 | VISITOR accesses admin endpoint | HTTP 403 | PASS |
| SEC-04 | Invalid credentials | HTTP 401 | PASS |
| SEC-05 | Missing login password | HTTP 400 | PASS |
| SEC-06 | Unknown heritage site | HTTP 404 | PASS |
| SEC-07 | Duplicate username | HTTP 409 | PASS |
| SEC-08 | Duplicate email | HTTP 409 | PASS |
| SEC-09 | Invalid beacon major | HTTP 400 | PASS |
| SEC-10 | Duplicate beacon identity | HTTP 409 | PASS |
| SEC-11 | Invalid major/minor ranges | Validation rejection | PASS |
| SEC-12 | CSV formula injection | Safe CSV output | PASS |
| SEC-13 | CSV whitespace and control characters | Safe CSV output | PASS |
| SEC-14 | ADMIN accesses protected endpoint | HTTP 200 | PASS |
| SEC-15 | Empty login body | HTTP 400 | PASS |
| SEC-16 | Valid JWT | Accepted | PASS |
| SEC-17 | Expired JWT | Rejected | PASS |
| SEC-18 | Malformed JWT | Rejected | PASS |
| SEC-19 | Expired JWT on protected endpoint | HTTP 401 | PASS |
| SEC-20 | Malformed JSON | HTTP 400 | PASS |
| SEC-21 | Unknown database integrity violation | No incorrect HTTP 409 | PASS |
| SEC-22 | PostgreSQL constraints | Enforced | PASS |
| SEC-23 | Secret leakage review | No confirmed real secrets | PASS WITH LIMITATIONS |
| SEC-24 | Dependency security audit | Zero reported vulnerabilities | PASS |

SEC-01 through SEC-13 reference the original report.
SEC-14 and SEC-15 were verified against the running local backend.
SEC-16 through SEC-19 were verified by new automated tests.
SEC-20 and SEC-21 reference existing automated tests.
SEC-22 references the PostgreSQL integration CI evidence.

## 3. JWT Expiration Regression

New automated test files:

- backend/src/test/java/com/university/backend/security/JwtExpirationTest.java
- backend/src/test/java/com/university/backend/security/JwtExpirationHttpTest.java

Command:

    mvn "-Dtest=JwtExpirationTest,JwtExpirationHttpTest" test

| Test class | Passed | Failed |
|---|---:|---:|
| JwtExpirationTest | 3 | 0 |
| JwtExpirationHttpTest | 1 | 0 |
| Total | 4 | 0 |

Maven result: BUILD SUCCESS.
Errors: 0.
Skipped: 0.

The expired JWT HTTP test uses Spring MockMvc.
No production authentication implementation was modified.

## 4. PostgreSQL Integration Evidence

- CI run: #155
- Run ID: 45410192373
- Branch: LTJ-76
- Commit: 276268c
- Result: SUCCESS

https://github.com/nahnht27/smart-heritage/actions/runs/45410192373

| Integration suite | Passed |
|---|---:|
| VisitorInteractionPostgresIT | 22 |
| DatabaseMigrationIT | 12 |
| SchemaDetectorIT | 16 |
| ArtifactQueryOptimizationIT | 5 |
| BeaconResolutionIntegrityIT | 17 |
| Total | 72 |

Failures: 0.
Errors: 0.
Skipped: 0.

PostgreSQL 16 integration tests verify database migration,
uniqueness, foreign key and range constraints.

This CI run predates the new JWT tests and dependency patch.

Post-synchronization confirmation:

- CI run #156 (ID 45422616134, commit 492b509) contains the
  JWT and dependency changes; its PostgreSQL job log confirms
  72 passed, 0 failures, 0 errors, 0 skipped.
- The synchronized CI run (ID 45646351477, merge commit 1748a92)
  also confirms 72/72 for PostgreSQL integration.
- The 72-test count is therefore verified; it is not inferred
  from job status alone.

## 5. Secret Leakage Review

### 5.1 Tracked files and configuration

- Searched tracked files for credential-related patterns.
- Searched for private key markers and JWT-shaped strings.
- Reviewed five environment and deployment configuration files.
- Verified Git ignore rules for five local environment paths.
- Production Compose requires externally supplied secrets.
- Production examples use placeholders.
- Development defaults are intended for local use only.

No tracked private key files or JWT-shaped strings were
detected by the selected patterns.

### 5.2 Gitleaks history scan

Tool: Gitleaks Docker image.

Image digest:

sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f

| Metric | Result |
|---|---|
| Commits scanned | 176 |
| Data scanned | 4.81 MB |
| Raw findings | 1 |
| False positives | 1 |
| Confirmed real secrets | 0 |
| Scanner exit code | 1 |

Finding:

- Rule: generic-api-key
- File: docs/sprint-6/README.md
- Line: 10
- Commit: 9fdc64413c4ed11105a38b1efca9f301f7d73038
- Classification: False positive

Manual inspection confirmed ordinary Markdown documentation.
No Git history or scanner allowlist was modified.

No confirmed real secret was detected within the reviewed scope.
Untracked files were not included in the historical scan.

### 5.3 Post-synchronization rescan

Tool: local Gitleaks 8.24.2 (not the Docker image).

| Metric | Result |
|---|---|
| Commits scanned (default walk) | 173 |
| Commits scanned (`--log-opts=HEAD`) | 150 |
| Data scanned | 4.94 MB |
| Raw findings | 1 |
| False positives | 1 |
| Confirmed real secrets | 0 |
| Scanner exit code | 1 |

The finding is unchanged: rule `generic-api-key`,
`docs/sprint-6/README.md` line 10, commit
`9fdc64413c4ed11105a38b1efca9f301f7d73038`. The flagged text
is ordinary Markdown documentation. No allowlist, suppression
or history rewrite was introduced. This remains a scanner
false positive, not a confirmed secret.

## 6. Frontend Dependency Security

Initial audit: 10 vulnerabilities, including 9 moderate and 1 high.

Advisories:

- follow-redirects: GHSA-mrwp-f3q8-3g9p
- minimatch: GHSA-g3hv-75wg-m249

References:

https://github.com/advisories/GHSA-mrwp-f3q8-3g9p

https://github.com/advisories/GHSA-g3hv-75wg-m249

Commands:

    npm audit fix --dry-run --ignore-scripts
    npm audit fix --ignore-scripts
    npm audit
    npm audit --omit=dev

| Audit scope | Before | After |
|---|---:|---:|
| All dependencies | 10 | 0 |
| Production dependencies | 1 | 0 |
| High severity | 1 | 0 |
| Moderate severity | 9 | 0 |

Only frontend/package-lock.json was modified.
No application source code or package.json was modified.
The remediation did not use --force.

Application-specific exploitability was not established.

Post-synchronization audit (2026-11-25, npm 11.12.1):

| Package | Before | After | Scope | Path |
|---|---|---|---|---|
| follow-redirects | 1.16.1 | 1.16.3 | Transitive | axios@1.20.0 |
| minimatch | 10.2.6 | 11.0.9 | Transitive | eslint@10.15.0 / typescript-eslint@8.74.0 |

- `npm audit`: 0 vulnerabilities.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm ls follow-redirects minimatch eslint`: resolved as above.
- `frontend/package.json` is unchanged versus main.
- The lockfile also carries the eslint/typescript-eslint
  cascade required for the minimatch 11 range; these are
  transitive lockfile updates, not direct dependency changes.

M4 dependency review remains pending and has not been claimed
as approval.

## 7. Frontend Regression

### 7.1 Windows execution

- OS: Windows 11
- Node.js: 24.21.0
- npm: 11.19.0
- Locale: vi-VN

| Metric | Result |
|---|---|
| Test files passed | 14/15 |
| Tests passed | 120/129 |
| Tests failed | 9 |

All nine failures occurred in DashboardPage.test.tsx.

The application uses locale-dependent toLocaleString().
Windows formats 1420 as 1.420, while test assertions
include the expected value 1,420.

### 7.2 Docker Linux execution

- Image: node:22-bookworm
- OS: Debian Linux
- Node.js: 22.23.5
- npm: 10.9.9
- Locale: en-US

Image digest:

sha256:1a81f3fd55b56c8fe964333a05bd1f257450b914a1196eb8bd577374900a1f70

| Validation | Result |
|---|---|
| npm ci | PASS |
| Dependency audit | 0 vulnerabilities |
| ESLint | PASS |
| Test files | 15/15 PASS |
| Unit tests | 129/129 PASS |
| Dashboard Analytics | 15/15 PASS |
| CSV security tests | 14/14 PASS |
| Production build | PASS |
| Build exit code | 0 |

The Docker environment matches the CI Node.js major version,
but uses Debian instead of Ubuntu.

Locale is a likely contributor to the Windows failures.
Node.js and npm versions also differ, so Locale has not
been isolated as the sole cause.

No application code or test assertions were modified to force a pass.

### 7.3 Synchronized Linux rerun (2026-11-25)

After merging main `50132ea` into `LTJ-76`:

- Node.js v24.15.0, npm 11.12.1, Linux.
- `npm ci`: 265 packages, 0 vulnerabilities.
- `npm run lint`: PASS.
- `npm test`: 19 files, 162/162 tests passed.
- `npm run build`: PASS.

The additional tests come from the M4 Translations and Feedback
work already on main. Dashboard Analytics and CSV security
coverage remain present and pass.

Windows was not available for the synchronized rerun. The
historical 120/129 Windows result and its nine Dashboard
locale-sensitive failures remain the recorded Windows status;
Windows is not reported as PASS.

## 8. Findings and Ownership

| ID | Severity | Finding | Status | Proposed owner |
|---|---|---|---|---|
| SEC-F01 | High | follow-redirects vulnerability | Lockfile remediated; M4 review pending | M4 |
| SEC-F02 | Moderate | minimatch-related vulnerabilities | Lockfile remediated; M4 review pending | M4 |
| SEC-F03 | Low | Environment-dependent Dashboard tests | Open; Linux passes 162/162 | M4 |
| SEC-F04 | Informational | Gitleaks documentation false positive | Reviewed | M5 |

M5 is responsible for regression verification.
M4 review and M1 release acceptance remain pending.

## 9. Limitations

- Expired JWT HTTP testing uses MockMvc rather than live Docker HTTP.
- Secret scanning is limited to the reviewed patterns and history.
- Windows Dashboard failures remain documented; Windows was not
  available for the synchronized rerun.
- Original and patched dependencies were not compared under
  identical Windows conditions.
- Historical CI #155 predates the new changes; run #156 and the
  synchronized run 45646351477 validate them.
- Dependency remediation still requires M4 review.
- Physical BLE and media acceptance belong to the E2E task.
- This review is not a full penetration test.

## 10. Conclusion

Local QA recommendation: PASS WITH LIMITATIONS.

Security negative-path regression and all four new JWT tests passed.
PostgreSQL integration evidence recorded 72 passing tests.

No confirmed real secret was detected within the reviewed scope.
The frontend dependency audit reports zero vulnerabilities
after remediation.

The patched frontend passed clean installation, ESLint,
all 162 unit tests and production build on synchronized Linux.

The synchronized 12-job CI run 45646351477 passed on merge
commit `1748a92`, including backend 159/159, PostgreSQL 72/72,
frontend 162/162 and mobile 108/108.

Final release approval remains pending M4 dependency review,
E2E acceptance and combined PR review. Windows remains a
documented limitation.

## 11. Terminal Evidence
Evidence is documented using actual terminal outputs, automated
test results, source code references and GitHub Actions logs.
Screenshots were not collected.

### E01 - JWT Expiration Testing

Command:

    mvn "-Dtest=JwtExpirationTest,JwtExpirationHttpTest" test

Recorded results:

    Tests run: 4
    Failures: 0
    Errors: 0
    Skipped: 0
    BUILD SUCCESS

### E02 - Local API Security

Recorded HTTP results:

    ADMIN access: HTTP 200
    Empty login body: HTTP 400

### E03 - PostgreSQL Integration

CI run: 45410192373

Recorded results:

    VisitorInteractionPostgresIT: 22 passed
    DatabaseMigrationIT: 12 passed
    SchemaDetectorIT: 16 passed
    ArtifactQueryOptimizationIT: 5 passed
    BeaconResolutionIntegrityIT: 17 passed

    Total: 72 passed
    Failures: 0
    Errors: 0
    Skipped: 0

### E04 - Gitleaks Security Scan

Recorded results:

    Commits scanned: 176
    Data scanned: 4.81 MB
    Findings: 1
    Confirmed false positives: 1
    Confirmed real secrets: 0

The flagged documentation was manually reviewed.
The raw scanner exit code was 1.

### E05 - Dependency Audit

Before remediation:

    10 vulnerabilities (9 moderate, 1 high)

After remediation:

    found 0 vulnerabilities

Production dependency audit:

    found 0 vulnerabilities

### E06 - Windows Frontend Regression

Recorded results:

    Test Files: 1 failed, 14 passed (15)
    Tests: 9 failed, 120 passed (129)

Locale diagnostic output:

    Locale: vi-VN
    Default: 1.420
    en-US: 1,420
    vi-VN: 1.420

### E07 - Docker Linux Frontend Regression

Terminal output:

    v22.23.5
    10.9.9
    en-US
    1,420

    added 265 packages, and audited 266 packages in 10s
    found 0 vulnerabilities

    Test Files  15 passed (15)
         Tests  129 passed (129)
      Duration  15.63s

### E08 - Production Build

Terminal output:

    > frontend@0.0.0 build
    > tsc -b && vite build

    vite v8.3.4 building client environment for production...
    transforming...
    53 modules transformed.
    rendering chunks...
    computing gzip size...
    dist/index.html                   0.47 kB
    dist/assets/index-DYx38uMw.css   58.15 kB
    dist/assets/index-ChpVu0Gv.js   343.88 kB

    built in 250ms

    $LASTEXITCODE
    0

### E09 - Git Validation

Terminal output:

    git branch --show-current
    LTJ-76

    git diff --stat
    1 file changed, 103 insertions(+), 89 deletions(-)

    git diff --check

No whitespace errors were reported for the tracked diff.

### E10 - Synchronized Branch Validation

    2026-11-25
    Latest main: 50132ea8f48ee869167b5d86d38d3b4b142e1944
    Merge commit / HEAD: 1748a9251996707d51ad848f6f2299cb43db39ad
    Merge type: git merge --no-ff origin/main (no conflicts)
    Ahead/behind vs origin/main: 4 ahead / 0 behind
    CI run: 45646351477
    CI jobs: 12/12 SUCCESS

### E11 - Backend and PostgreSQL

    Targeted JWT: 4 tests, 0 failures, 0 errors, 0 skipped
    Backend full suite: 159 tests, 0 failures, 0 errors, 0 skipped
    PostgreSQL integration: 72 tests, 0 failures, 0 errors, 0 skipped
    PostgreSQL suites: 22 + 12 + 16 + 5 + 17 = 72

### E12 - Dependency and Secret Scan

    npm audit: 0 vulnerabilities
    npm audit --omit=dev: 0 vulnerabilities
    follow-redirects: 1.16.1 -> 1.16.3
    minimatch: 10.2.6 -> 11.0.9
    package.json changed: no
    --force used: no

    Gitleaks 8.24.2
    Commits scanned (default): 173
    Data scanned: 4.94 MB
    Raw findings: 1
    Confirmed false positives: 1
    Confirmed real secrets: 0
    Exit code: 1

### E13 - Synchronized Frontend

    Node.js v24.15.0, npm 11.12.1, Linux
    npm ci: 265 packages, 0 vulnerabilities
    ESLint: PASS
    Vitest: 19 files, 162/162 passed
    Production build: PASS

### Evidence Status

E01-E13 were recorded from actual execution results.
Some results are summarized rather than reproduced verbatim.
No screenshots or fabricated execution results are included.

The final synchronized CI evidence is run 45646351477 on
merge commit `1748a92`. Windows remains a documented
limitation and is not reported as PASS.
