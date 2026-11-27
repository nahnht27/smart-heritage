# LTJ-78 - Release Performance, Reliability & QA Sign-off

## Task Information

- Sprint: 6
- Task: S6-M5-03
- Owner: M5
- Date: 2026-11-24
- Branch: LTJ-76

## Completed Work

- Verified Docker and Grafana k6 environment.
- Completed Smoke, Baseline, Beacon, Reliability and Analytics tests.
- Prepared local QA Beacon and Analytics data.
- Verified Admin authentication and JWT authorization.
- Parameterized ARTIFACT_ID in four performance scripts.
- Successfully retested all four modified scripts.
- Collected 30 Docker resource monitoring samples.
- Verified base commit CI #146 successfully.

## Final Results

- Performance scenarios: 5/5 PASS.
- HTTP requests: 1928.
- Successful checks: 2228/2228.
- HTTP error rate: 0%.
- Maximum tested concurrency: 10 VUs.
- Highest scenario p95: 85.91 ms.
- Interrupted iterations: 0.

## Deliverables

- performance/smoke.js
- performance/baseline.js
- performance/beacon-performance.js
- performance/reliability.js
- performance/results/sprint6-docker-stats.csv
- docs/testing/sprint-6-m5-performance-reliability-report.md

## QA Status

Local performance testing: PASS.

Local QA recommendation: PASS WITH LIMITATIONS. Final release sign-off pending.

Docker monitoring under concurrent load remains unconfirmed.
Final synchronized CI passed on merge commit `1748a92`
(run 45646351477, 12/12 jobs).
Outstanding integration acceptance tests remain outside
the completed performance testing scope.



## Raw Performance Evidence

- performance/results/sprint6-smoke-summary.json
- performance/results/sprint6-baseline-summary.json
- performance/results/sprint6-beacon-summary.json
- performance/results/sprint6-reliability-summary.json
- performance/results/sprint6-analytics-summary.json

All five final raw-summary executions passed.

### Synchronized Raw Threshold Verification

The five result files match the native k6 v2.4.0
`--summary-export` schema, confirmed against a local v2.4.0
probe. In that schema, `thresholds: {"expression": false}` means
the threshold did not fail (`LastFailed=false`); `true` means it
failed. This was verified with a local k6 v2.4.0 probe: a passing
run exported `false` and exited 0; a deliberately failing
threshold exported `true` and exited 99.

For `http_req_failed`, the `passes`/`fails` fields are Rate
sample counters, not failed-request counts. In the synchronized
files every 20/580/150/1028/150-request scenario reports
`value: 0`, i.e. a 0% HTTP failure rate, with `fails` equal to
the number of successful samples. All exported threshold values
are `false`, so no configured threshold failed. The original
process exit codes were not separately captured in the JSON
artifacts.

## Latest Main Regression and CI

- Main commit: 50132ea
- CI run number: 154
- CI run ID: 45338875684
- CI jobs: 12/12 successful.
- Backend: 155/155 passed.
- Frontend: 162/162 passed.
- Mobile: 108/108 passed.
- Confirmed regression tests: 425/425 passed.
- PostgreSQL integration: CI SUCCESS; count not verified.
- Known findings and limitations documented in the performance report.
- Local QA recommendation: PASS WITH LIMITATIONS.
- The above main run is historical; it does not validate the M5 diff.

### Synchronized Branch CI (2026-11-25)

- Latest main merged: `50132ea`
- Merge commit / tested HEAD: `1748a92`
- CI run: 45646351477
- URL: https://github.com/nahnht27/smart-heritage/actions/runs/45646351477
- Jobs: 12/12 successful (mobile-static-analysis is advisory)
- Backend unit/security tests: 159/159
- Frontend tests: 162/162 in 19 files
- Mobile tests: 108/108 in 12 suites
- PostgreSQL integration: 72/72 (job log confirmed)
- JWT regression: 4/4
- npm audit (all and production): 0 vulnerabilities
- Performance scenarios: 5/5; 1,928 requests, 2,228/2,228 checks, 0% errors
- Docker monitoring: 30 samples / 15 timestamps / 68 seconds; concurrent
  execution with k6 remains unconfirmed
- Windows: historical 120/129 with nine Dashboard failures; not rerun
- M4 dependency review: pending
- PR review: pending
- Final evidence commit `349b14c`: push CI run 45648453143
  and PR-triggered run 45648883631 both 12/12 green. The PR run
  had one transient Maven Central 429 in `integration-smoke`;
  the job was rerun without code changes and passed.

## Finalization update (2026-11-26)

The raw performance artifacts and historical results above are preserved.

- Dashboard locale regression: all nine Windows failures were hardcoded
  `1,420` assertions. The dashboard uses runtime-locale formatting, so
  `vi-VN` renders `1.420`. Tests now derive the expected total from the
  shared `formatCount` helper, with explicit `en-US` and `vi-VN` coverage.
  Product behavior was not changed.
- Linux `LANG=vi_VN.UTF-8` reproduced the nine failures before the fix.
  After the fix: targeted 18/18 and full frontend 20 files / 165 tests under
  both `en-US` and `vi-VN`; ESLint and production build passed. Native
  Windows was not available and is not reported as PASS.
- Dependency revalidation: 19 lockfile entries, `package.json` unchanged,
  `npm ci` 265 packages / 0 vulnerabilities, audits 0/0, `npm ls --all`
  exit 0 with no invalid peers. M4 owner `nahnht27` was verified from
  M4-labelled PRs; review was requested and no approval is claimed.
- k6 evidence was not rerun or reinterpreted. The five scenarios still show
  1,928 requests, 2,228/2,228 checks and 0% HTTP errors. All legacy
  `--summary-export` threshold entries remain `false`; original process exit
  codes were not retained; Docker monitoring concurrency remains unconfirmed.
- Local Compose in this agent environment was blocked: Docker daemon inactive,
  no socket and sudo requires a password. S6-M5-01 later executed manual E2E
  on Windows 11 with isolated Compose and verified Admin authentication,
  creation flows, beacon resolve, interaction persistence, analytics/CSV
  agreement and Android Emulator image display. Evidence:
  `docs/testing/S6-M5-01-e2e-acceptance-report.md`.
- Physical BLE, physical-device media, audio/video playback, favorite/history
  and feedback persistence remain unverified; protected-route denial,
  edit/delete CRUD, error/offline resilience and post-run cleanup were not
  evidenced.
- Full-stack checklist:
  `docs/testing/sprint-6-full-stack-acceptance-checklist.md`.

### CI evidence for the final code commit (2026-11-26)

- Code HEAD: `adc88222a3b3b32e110d5df03607ab8c13fe979c`
- Push run `45751420300`: 12/12 success
- PR run `45751427038`: 12/12 success
- Subsequent documentation-only commits are covered by the final 12/12 run
  recorded on PR #46.
- Backend 159/159; frontend 20 files / 165 tests; mobile 108/108;
  PostgreSQL 72/72
- `integration-smoke`: 17 passed / 0 failed / 9 skipped
- `production-smoke`: PASS
- Performance evidence was not rerun by CI; the five raw k6 summaries
  remain the performance evidence.
