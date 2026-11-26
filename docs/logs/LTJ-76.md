# LTJ-76 - Security Negative Testing

## Thông tin chung

- **Branch:** `LTJ-76`
- **Task:** S6-M5-02 - Security Negative Testing
- **Sprint:** Sprint 6 - Final Integration, Acceptance & Release
- **Vai trò:** M5 - QA / Analytics / Reliability
- **Ngày kiểm thử:** 2026-11-23

## Mục tiêu

Xác minh hệ thống xử lý đúng các yêu cầu không hợp lệ, truy cập trái quyền, JWT thiếu hoặc không hợp lệ, tài nguyên không tồn tại, dữ liệu trùng lặp và nguy cơ CSV formula injection.

## Phạm vi kiểm thử

- Authentication và Authorization.
- JWT thiếu hoặc không hợp lệ.
- VISITOR truy cập API chỉ dành cho ADMIN.
- HTTP 400, 401, 403, 404 và 409.
- Beacon major/minor validation.
- Analytics CSV formula injection.

## Kết quả kiểm thử tự động

| Test suite | Passed | Failed | Errors | Skipped |
|---|---:|---:|---:|---:|
| AuthControllerTest | 18 | 0 | 0 | 0 |
| BeaconControllerTest | 6 | 0 | 0 | 0 |
| BeaconResolveValidationTest | 18 | 0 | 0 | 0 |
| GlobalExceptionHandlerTest | 3 | 0 | 0 | 0 |
| Additional Controller Tests | 82 | 0 | 0 | 0 |
| Analytics CSV Tests | 14 | 0 | 0 | 0 |
| **Total executions** | **141** | **0** | **0** | **0** |

All listed test runs completed successfully.

The total represents test executions across selected suites, not 141 independent security requirements.

## Manual API verification

| Scenario | Expected | Observed |
|---|---|---|
| Missing JWT on protected API | 401 | 401 - PASS |
| Invalid JWT | 401 | 401 - PASS |
| VISITOR accessing ADMIN Beacon API | 403 | 403 - PASS |
| Unknown heritage site | 404 | 404 - PASS |
| Login request missing password | 400 | 400 - PASS |
| Duplicate username | 409 | 409 - PASS |
| Duplicate email | 409 | 409 - PASS |
| Invalid login credentials | 401 | 401 - PASS |

## Evidence

- Maven test output: Auth 18/18 PASS.
- Maven test output: Beacon Controller 6/6 PASS.
- Maven test output: Beacon Resolve Validation 18/18 PASS.
- Maven test output: Global Exception Handler 3/3 PASS.
- Maven test output: Additional Controllers 82/82 PASS.
- Vitest output: Analytics CSV 14/14 PASS.

## Limitations and risks

- ADMIN login against the Docker deployment has not been verified with a real seeded ADMIN account. Admin authorization was tested using automated tests.
- Physical Android BLE verification is outside the scope of this security-negative task.
- Frontend npm installation reported 10 dependency audit findings (9 moderate, 1 high). These findings require separate review; this report does not claim they have been remediated.
- Passing the selected tests does not constitute a full penetration test or a complete security audit.

## Conclusion

The executed security-negative scenarios and selected automated test suites passed with no recorded test failures. Remaining limitations and dependency risks are documented above.

## Synchronization update (2026-11-25)

The historical LTJ-76 baseline above is preserved unchanged.

- Latest main merged: `50132ea`
- Merge commit / tested HEAD: `1748a92`
- CI run: 45646351477, 12/12 jobs successful
- Backend: 159/159; PostgreSQL integration: 72/72
- Frontend: 162/162 in 19 files on Linux; ESLint and build pass
- JWT expiration regression: 4/4
- npm audit (all and production): 0 vulnerabilities after the
  lockfile remediation in LTJ-77
- Gitleaks: one reviewed documentation false positive; zero
  confirmed real secrets
- Windows: historical 120/129 with nine locale-dependent
  Dashboard failures; not rerun, not reported as PASS
- Final evidence commit `349b14c`: push CI 45648453143 and
  PR-triggered CI 45648883631 both 12/12 green; one transient
  Maven Central 429 was rerun without code changes
- M4 dependency review and combined PR review remain pending
- Physical BLE/media acceptance remains outside this task

The npm audit limitation in the historical section is superseded
by the LTJ-77 remediation; the original observation is retained
for traceability.

## Finalization update (2026-11-26)

The historical security results above are preserved unchanged.

- Dashboard locale failures were isolated to nine hardcoded `1,420`
  assertions in `DashboardPage.test.tsx`. The dashboard intentionally uses
  runtime-locale formatting, so `vi-VN` renders `1.420`. Tests now derive the
  expected value from the shared `formatCount` helper; explicit `en-US` and
  `vi-VN` coverage was added. Product locale behavior was not changed.
- Reproduced on Linux with `LANG=vi_VN.UTF-8`: 6 passed / 9 failed before the
  fix. After the fix: targeted Dashboard/formatter 18/18, full frontend
  20 files / 165 tests in both `en-US` and `vi-VN`. Native Windows was not
  available and is not claimed as PASS.
- M4 owner `nahnht27` was verified from M4-labelled PRs #28, #29, #30, #35,
  #40, #41 and #44. Review was requested; no approval is claimed.
- Dependency revalidation: 19 lockfile entries, `package.json` unchanged,
  `npm ci` 265 packages / 0 vulnerabilities, both audits 0/0,
  `npm ls --all` exit 0 with only optional platform gaps.
- Local full-stack Compose remained blocked by the inactive Docker daemon and
  unavailable sudo access. Browser admin flows, beacon resolution, analytics
  visibility and physical BLE/multimedia acceptance remain unverified or
  require human acceptance. See
  `docs/testing/sprint-6-full-stack-acceptance-checklist.md`.
- JWT 4/4, backend 159/159, PostgreSQL 72/72, k6 metrics and Gitleaks
  false-positive evidence remain unchanged.
