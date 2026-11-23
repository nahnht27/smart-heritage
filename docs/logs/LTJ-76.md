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
