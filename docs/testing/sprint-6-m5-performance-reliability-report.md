# Sprint 6 - M5 Performance & Reliability Report

## 1. Overview

- Project: Smart Heritage
- Task: S6-M5-03 / LTJ-78
- Role: M5 - QA, Analytics & Reliability
- Test date: 2026-11-24
- Branch: LTJ-76
- Base commit: 7d51c7f69cfba09d18aeaae3accef955203b7d4b
- Environment: Local Docker
- Backend: Spring Boot
- Database: PostgreSQL
- Testing tool: Grafana k6 v2.4.0

## 2. Final Performance Results

| Test | VUs | Requests | Checks | Error Rate | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Smoke | 1 | 20 | 20/20 | 0% | 29.69 | 12.79 | 85.91 | N/A | PASS |
| Baseline | 5 | 580 | 580/580 | 0% | 14.34 | 9.19 | 32.19 | 88.11 | PASS |
| Beacon | 5 | 150 | 300/300 | 0% | 17.60 | 15.48 | 36.57 | 55.49 | PASS |
| Reliability | 10 max | 1028 | 1028/1028 | 0% | 7.83 | 6.29 | 17.41 | 30.30 | PASS |
| Analytics | 5 | 150 | 300/300 | 0% | 24.10 | 17.49 | 43.70 | 128.19 | PASS |

### Summary

- Test scenarios passed: 5/5
- Total HTTP requests: 1928
- Successful checks: 2228/2228
- HTTP error rate: 0%
- Interrupted iterations: 0
- All configured performance criteria satisfied.

## 3. Reliability Verification

Four successful reliability executions were completed.

| Run | Requests | Error Rate | p95 (ms) | p99 (ms) |
|---|---:|---:|---:|---:|
| Initial | 1012 | 0% | 28.52 | 46.80 |
| Retest | 1016 | 0% | 24.39 | 38.99 |
| Parameterized | 996 | 0% | 39.27 | 131.09 |
| Final raw-summary run | 1028 | 0% | 17.41 | 30.30 |

The backend remained responsive during the tested
60-second ramp-up scenario with up to 10 virtual users.

## 4. Docker Resource Monitoring

Evidence: performance/results/sprint6-docker-stats.csv

- Monitoring samples: 30
- Monitoring interval: approximately 68 seconds

| Metric | Backend | PostgreSQL |
|---|---:|---:|
| Minimum CPU | 0.17% | 0% |
| Maximum sampled CPU | 6.35% | 7.84% |
| Minimum RAM | 519.1 MiB | 57.29 MiB |
| Maximum sampled RAM | 519.7 MiB | 61.11 MiB |
| Maximum RAM percentage | 6.70% | 0.79% |

Memory usage remained relatively stable during observation.
Concurrent execution with k6 was not independently confirmed.

## 5. Test Data and Environment Preparation

- The initial Smoke Test failed because Artifact ID 48
  did not exist in the local database.
- Local Artifact ID 1 was verified.
- A local QA Beacon was created using SQL.
- A dedicated QA account was registered through the API.
- The ADMIN role was assigned in the local database.
- Admin authentication and JWT authorization were verified.
- One synthetic BEACON_TRIGGER interaction was inserted.
- Analytics returned one interaction and one unique visitor.

No credentials or JWT tokens are included in this report.

## 6. Script Improvements

The following scripts were parameterized:

- performance/smoke.js
- performance/baseline.js
- performance/beacon-performance.js
- performance/reliability.js

ARTIFACT_ID defaults to 48 for compatibility with the
original QA configuration.

Local testing was executed with ARTIFACT_ID=1.
All four modified scripts passed their local retests.

## 7. CI Verification

- GitHub Actions CI #146: SUCCESS
- Base commit: 7d51c7f
- Branch: LTJ-76
- Duration: 2 minutes 3 seconds

CI #145 for commit 3fcdb16 also completed successfully.

The historical CI evidence above used the 9-job workflow.

Post-synchronization CI (2026-11-25):

- Latest main: `50132ea`
- Merge commit and tested HEAD: `1748a92`
- CI run: 45646351477
- URL: https://github.com/nahnht27/smart-heritage/actions/runs/45646351477
- Result: SUCCESS, 12/12 jobs
- Job log confirms backend 159/159 and PostgreSQL 72/72
- Job log confirms frontend 162/162 in 19 files and mobile 108/108

## 8. Limitations

- Testing was conducted in a local Docker environment.
- Maximum tested concurrency was 10 virtual users.
- Long-duration endurance testing was not performed.
- Physical BLE testing was outside this performance scope.
- QA interaction data was generated directly using SQL.
- Concurrent Docker resource monitoring was not confirmed.
- Default Artifact ID 48 was not retested in the original QA environment.
- Vietnamese artifact names displayed encoding issues in PowerShell;
  the root cause was not established.

## 9. QA Sign-off

Local performance testing: PASS.

All five performance scenarios satisfied their configured
criteria in the tested environment.

Local QA recommendation: PASS WITH LIMITATIONS. Final release sign-off pending.

The synchronized branch CI is green on merge commit `1748a92`.
Final release approval remains subject to combined PR review,
M4 dependency review, and outstanding integration acceptance tests.

## 10. Throughput and Performance Thresholds

| Test | Throughput (req/s) | Duration | Result |
|---|---:|---|---|
| Smoke | 3.49 | 5 iterations | PASS |
| Baseline | 18.82 | 30s | PASS |
| Beacon | 4.90 | 30s | PASS |
| Reliability | 16.86 | 60s | PASS |
| Analytics | 4.87 | 30s | PASS |

### Configured Thresholds

- Smoke: HTTP failure rate = 0%, checks = 100%.
- Baseline: HTTP failure rate < 1%, checks = 100%.
- Beacon: HTTP failure rate < 1%, p95 < 500ms, checks = 100%.
- Reliability: HTTP failure rate < 1%, p95 < 500ms, checks = 100%.
- Analytics: HTTP failure rate < 1%, p95 < 500ms, checks = 100%.

### Environment and Dataset

- Windows host with Docker Desktop.
- k6 executed in a separate Docker container.
- Spring Boot backend accessed through host.docker.internal:8080.
- PostgreSQL running in a Docker container.
- Local fixture: one artifact, one QA beacon and one synthetic interaction.
- Results do not establish production capacity.




## 11. Final Raw k6 Evidence

Final execution date: 2026-11-24.
All five scenarios were rerun with raw summary export.

Evidence files:

- performance/results/sprint6-smoke-summary.json
- performance/results/sprint6-baseline-summary.json
- performance/results/sprint6-beacon-summary.json
- performance/results/sprint6-reliability-summary.json
- performance/results/sprint6-analytics-summary.json

The final results in Section 2 and Section 10 correspond
to these new executions.

Previous reliability runs are retained as historical evidence.
Smoke p99 was not reported by the test configuration.

### 11.1 Raw threshold interpretation

The result files match the native k6 v2.4.0 `--summary-export`
schema, confirmed against a local v2.4.0 probe. In this schema,
the boolean under each metric's `thresholds` object is the
inverse of the threshold result:

- `false` = the threshold did **not** fail.
- `true` = the threshold failed.

This was reproduced with k6 v2.4.0 on 2026-11-25 using a local
HTTP probe, independent of the project fixture:

| Probe | Threshold | Console | Exit code | Exported value |
|---|---|---|---:|---|
| Passing | `http_req_failed: rate==0` | PASS | 0 | `false` |
| Deliberately failing | `http_req_failed: rate==1` | FAIL | 99 | `true` |

All threshold entries in the five Sprint 6 result files are
`false`. No configured threshold failed.

For a Rate metric such as `http_req_failed`, `passes` and
`fails` are sample counters. They are not failed-request
counts. The actual error rate is the `value` field. Every
scenario reports `value: 0`:

| Scenario | Requests | `http_req_failed` value | Sample fails | Checks | Thresholds |
|---|---:|---:|---:|---:|---|
| Smoke | 20 | 0 | 20 | 20/20 | all not failed |
| Baseline | 580 | 0 | 580 | 580/580 | all not failed |
| Beacon | 150 | 0 | 150 | 300/300 | all not failed |
| Reliability | 1,028 | 0 | 1,028 | 1,028/1,028 | all not failed |
| Analytics | 150 | 0 | 150 | 300/300 | all not failed |

The original k6 process exit codes were not stored in the JSON
artifacts. The threshold records show no failure, which is the
same condition under which k6 returns exit code 0.

## 12. Latest Main Regression and CI Evidence

- Branch: main
- Commit SHA: 50132ea
- CI Run Number: 154
- CI Run ID: 45338875684
- Date: 2026-11-24
- Workflow status: SUCCESS
- CI jobs: 12/12 successful
- Evidence URL:
  https://github.com/nahnht27/smart-heritage/actions/runs/45338875684

### Regression Test Counts

| Test Suite | Passed | Failed | Status |
|---|---:|---:|---|
| Backend | 155 | 0 | PASS |
| Frontend | 162 | 0 | PASS |
| Mobile | 108 | 0 | PASS |
| PostgreSQL Integration | Not verified | Not verified | CI SUCCESS |
| Confirmed total | 425 | 0 | PASS |

The confirmed total excludes PostgreSQL integration tests
because their exact count was not obtained.

### CI Jobs

| Job | Status |
|---|---|
| backend-test | SUCCESS |
| postgres-integration | SUCCESS |
| database-backup-restore | SUCCESS |
| frontend-checks | SUCCESS |
| mobile-tests | SUCCESS |
| mobile-static-analysis (advisory) | SUCCESS |
| demo-seed-static-checks | SUCCESS |
| demo-seed-isolation | SUCCESS |
| demo-seed-lifecycle | SUCCESS |
| docker-build | SUCCESS |
| integration-smoke | SUCCESS |
| production-smoke | SUCCESS |

These results apply to main commit 50132ea only and are historical.

### Synchronized LTJ-76 CI (2026-11-25)

- Latest main merged: `50132ea`
- Merge commit / tested HEAD: `1748a92`
- CI run: 45646351477
- URL: https://github.com/nahnht27/smart-heritage/actions/runs/45646351477
- Result: SUCCESS, 12/12 jobs
- Backend: 159/159
- Frontend: 162/162 in 19 files
- Mobile: 108/108 in 12 suites
- PostgreSQL integration: 72/72
- JWT security regression: 4/4
- npm audit (all and production): 0 vulnerabilities
- All 12 jobs: backend-test, postgres-integration,
  database-backup-restore, frontend-checks, mobile-tests,
  mobile-static-analysis (advisory), demo-seed-static-checks,
  demo-seed-isolation, demo-seed-lifecycle, docker-build,
  integration-smoke, production-smoke

The local performance scenarios were not rerun by CI; the raw
result files remain the evidence for the local performance run.

Final evidence commit `349b14c` passed the push CI
(run 45648453143) and the PR-triggered CI (run 45648883631),
both 12/12. The PR run initially hit a transient Maven Central
HTTP 429 in `integration-smoke`; the failed job was rerun
without code changes and passed.

## 13. Known Findings and Limitations

Owner and severity assignments below are QA recommendations
pending confirmation by the responsible team members.

| ID | Finding | Proposed Severity | Proposed Owner | Status |
|---|---|---|---|---|
| QA-01 | Local Artifact ID mismatch | Low | M5/M2 | Mitigated by ARTIFACT_ID parameter |
| QA-02 | Physical BLE acceptance evidence unavailable | Medium | M3/M5 | NOT VERIFIED |
| QA-03 | Real-device multimedia acceptance evidence unavailable | Medium | M3/M5 | NOT VERIFIED |
| QA-04 | Small fixture and limited concurrency | Medium | M5/M1 | Limitation |
| QA-05 | Concurrent Docker monitoring not confirmed | Low | M5 | Limitation |
| QA-06 | Previously reported npm audit findings: 9 moderate and 1 high | High | M4/M5 | Lockfile remediation gives 0/0; M4 review pending |
| QA-07 | Vietnamese text encoding issue in PowerShell output | Low | M2/M5 | Root cause not verified |
| QA-08 | PostgreSQL integration test count | Low | M5 | Resolved: 72/72 confirmed |
| QA-09 | Final full-stack acceptance incomplete | Medium | M3/M4/M5 | Pending |
| QA-10 | CI verification for new commit | Medium | M5 | Resolved: run 45646351477 on 1748a92, 12/12 green |
| QA-11 | Windows locale-dependent Dashboard tests | Low | M4 | Open: 120/129 on Windows; Linux 162/162 |

No performance threshold failures were observed in the
five final local performance scenarios.

## 14. Final QA Recommendation

Local performance: PASS.

QA recommendation for the tested scope: PASS WITH LIMITATIONS.

Overall release approval remains pending:

- Combined PR review and M4 dependency review.
- Outstanding full-stack acceptance evidence.
- Physical BLE and multimedia acceptance evidence.
- Security findings triage and risk acceptance where required.
- Final release approval by M1.

The synchronized CI is green, but it does not constitute release
approval and does not remove the limitations above.

## 15. Finalization Update (2026-11-26)

The historical performance and CI results above are preserved.

### 15.1 Windows Dashboard locale regression

All nine Windows failures were the same hardcoded assertion: the test expected
`1,420`, while `DashboardPage` uses runtime-locale `toLocaleString()` and
`vi-VN` renders `1.420`. There is no fixed-locale requirement or runtime UI
language selector, so runtime-locale formatting is the intended behavior.

The tests now derive the expected total from the shared `formatCount` helper;
explicit `en-US` and `vi-VN` formatter tests were added. Product behavior was
not changed.

- Linux `LANG=vi_VN.UTF-8` reproduced 6 passed / 9 failed before the fix.
- Targeted Dashboard + formatter: 18/18 passed under both locales.
- Full frontend: 20 files, 165/165 passed under both locales.
- ESLint and production build passed.
- Native Windows was not available and is not reported as PASS.

### 15.2 Dependency and M4 review

- 19 lockfile entries changed; `frontend/package.json` unchanged; no `--force`.
- `npm ci`: 265 packages, 0 vulnerabilities.
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities each.
- `npm ls --all`: exit 0, no invalid peers; only expected optional platform
  gaps.
- `follow-redirects` 1.16.1 -> 1.16.3; `minimatch` 10.2.6 -> 11.0.9;
  `eslint` 10.12.0 -> 10.15.0; `typescript-eslint` 8.71.2 -> 8.74.0.
- M4 owner `nahnht27` was verified from M4-labelled PRs #28, #29, #30, #35,
  #40, #41 and #44. Review was requested on PR #46; no review decision was
  manufactured and no approval is claimed.

### 15.3 Runtime acceptance limits

Local Docker Compose could not be executed in this agent environment: the
Docker daemon is inactive, `/var/run/docker.sock` is absent, and sudo requires
a password. CI `integration-smoke` and `production-smoke` cover public API and
production packaging only.

S6-M5-01 later executed manual full-stack E2E on Windows 11 with an isolated
Compose project. It verified Admin authentication, creation flows, beacon
resolve, interaction persistence, analytics/dashboard/CSV agreement and
Android Emulator image display. Protected-route denial, edit/delete CRUD,
error/offline resilience, favorite/history and feedback persistence and
post-run cleanup were not evidenced. Physical BLE, physical-device media and
audio/video playback remain unverified or require human acceptance. See
`docs/testing/S6-M5-01-e2e-acceptance-report.md` and
`docs/testing/sprint-6-full-stack-acceptance-checklist.md`.

### 15.4 Performance evidence unchanged

The five k6 scenarios were not rerun or reinterpreted:

- 1,928 requests; 2,228/2,228 checks; 0% HTTP errors; maximum 10 VUs.
- All legacy `--summary-export` threshold entries remain `false`.
- Original k6 process exit codes were not retained.
- Docker resource monitoring concurrency with k6 remains unconfirmed.
- No Prometheus, Grafana, OpenTelemetry or Kubernetes stack was added.

### 15.5 CI evidence for the final code commit

Code HEAD: `adc88222a3b3b32e110d5df03607ab8c13fe979c`. Subsequent
documentation-only commits are covered by the final 12/12 run recorded on
PR #46.

- Push run `45751420300`: 12/12 success.
- PR run `45751427038`: 12/12 success.
- Backend: 159/159.
- Frontend: 20 files, 165/165.
- Mobile: 12 suites, 108/108.
- PostgreSQL integration: 72/72.
- `integration-smoke`: 17 passed, 0 failed, 9 skipped.
- `production-smoke`: PASS.
- The five k6 raw result files were preserved; CI did not rerun performance.

### 15.6 Final recommendation

QA recommendation for the tested scope remains **PASS WITH LIMITATIONS**.
Final merge/release approval remains with M1 and is still conditional on M4
review, acceptance of the documented E2E limitations (physical BLE,
physical-device/audio-video media, favorite/history and feedback persistence),
and risk acceptance for the remaining findings.
