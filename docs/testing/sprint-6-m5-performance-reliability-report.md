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

CI #145 for commit 3fcd b16 (without the space: 3fcdb16)
also completed successfully.

CI verification for the new performance commit
is pending until the changes are pushed.

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

Final release approval remains subject to CI verification
of the new commit and outstanding integration acceptance tests.

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

These results apply to main commit 50132ea only.
They do not represent the upcoming LTJ-76 commit or PR head.

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
| QA-06 | Previously reported npm audit findings: 9 moderate and 1 high | High | M4/M5 | Requires triage and current-status verification |
| QA-07 | Vietnamese text encoding issue in PowerShell output | Low | M2/M5 | Root cause not verified |
| QA-08 | PostgreSQL integration test count unavailable | Low | M5 | CI SUCCESS; count not verified |
| QA-09 | Final full-stack acceptance incomplete | Medium | M3/M4/M5 | Pending |
| QA-10 | CI verification for new commit | Medium | M5 | Pending push |

No performance threshold failures were observed in the
five final local performance scenarios.

## 14. Final QA Recommendation

Local performance: PASS.

QA recommendation for the tested scope: PASS WITH LIMITATIONS.

Overall release approval remains pending:

- CI verification for the actual new commit and PR head.
- Outstanding full-stack acceptance evidence.
- Physical BLE and multimedia acceptance evidence.
- Security findings triage and risk acceptance where required.
- Final release approval by M1.
