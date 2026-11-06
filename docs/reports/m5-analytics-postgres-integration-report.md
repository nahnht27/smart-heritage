# M5 — Analytics & PostgreSQL Reliability Report

**Ngày:** 2026-11-07

**Branch:** `feat/m5-analytics-postgres-reliability` (tạo từ `origin/main` @ `a1063b3`)

**Phạm vi:** chuyển giao có chọn lọc phần M5 từ `origin/LTJ-50` sang Wave 3 hiện tại; bổ sung analytics timeseries/languages; đưa PostgreSQL integration tests vào Maven/CI; cập nhật tài liệu.

**Nguyên tắc:** không merge/rebase raw `LTJ-50`; không sửa trực tiếp `main`; không reset/rebase/force-push; không đụng database dev; không commit secret, `.env`, dump DB hay artifact benchmark.

---

## 1. Bối cảnh và mục tiêu

`origin/LTJ-50` có nhiều commit M5 giá trị nhưng được tạo từ base cũ `5b77c2d`, trước Wave 3. Branch hiện tại đang **13 ahead / 4 behind** `main` và không có PR. Vì vậy không thể merge nguyên branch: sẽ làm mất hoặc ghi đè các thay đổi Wave 3 về `visitorId`, `userId`, principal và idempotency.

Mục tiêu của wave này:

- Giữ Wave 3 làm source of truth.
- Chỉ port/adapt các phần M5 còn giá trị.
- Thêm hai API analytics mới: timeseries theo ngày và thống kê ngôn ngữ.
- Viết lại PostgreSQL integration tests cho đúng schema/contract hiện tại.
- Bắt CI thực sự chạy integration tests và fail nếu test không chạy hoặc fail.
- Ghi lại kết quả, rủi ro và cách tái lập.

---

## 2. Đối chiếu lịch sử `LTJ-50`

| Commit | Nội dung lịch sử | Hành động trên Wave 3 |
|---|---|---|
| `1964d06` | PostgreSQL test configuration | Giữ khái niệm; dùng `application-postgres-test.yml` hiện có |
| `2e42674`, `4cf0bb3`, `d3609e6`, `0c42ad7`, `a3344cd`, `d7f862b`, `1022e79`, `2b82aa6`, `2a234a4`, `18b72cd` | PostgreSQL integration tests | Viết lại thành `VisitorInteractionPostgresIT` với 22 test đúng Wave 3 |
| `d69b8f2` | Timeseries + language analytics APIs | Port/adapt DTO, repository, service, controller, tests |
| `bf33696` | Advanced analytics/integration tests | Chọn lọc; không copy raw test cũ |
| Historical report | `docs/testing/postgresql-integration-report.md` (19 tests) | Cập nhật thành báo cáo 22 tests của Wave 3 |

Không có file `application-postgres-test.yml` lịch sử cần port vì file này đã tồn tại trên `main` và đang dùng env `SPRING_DATASOURCE_*`.

---

## 3. Thay đổi implementation

### 3.1 API timeseries theo ngày

`GET /api/analytics/interactions/timeseries?from=...&to=...`

- Chỉ `ADMIN`.
- `from` và `to` bắt buộc; `from < to`; tối đa 90 ngày.
- Khoảng lọc `[from, to)`.
- Nhóm theo UTC calendar date.
- Response luôn có đủ mọi ngày trong khoảng; ngày không có dữ liệu trả `0`.
- Unique visitors dùng `COUNT(DISTINCT visitor_id)`.

DTO: `DailyInteractionResponse(date, totalInteractions, uniqueVisitors)`.

### 3.2 API thống kê ngôn ngữ

`GET /api/analytics/interactions/languages?from=...&to=...`

- Chỉ `ADMIN`.
- Cùng quy tắc range với timeseries.
- `languageCode` được trim; null/rỗng gom vào `UNKNOWN`.
- Sắp xếp giảm dần theo `interactionCount`, sau đó tăng dần theo `languageCode`.

DTO: `LanguageCountResponse(languageCode, interactionCount)`.

### 3.3 Repository và projection

- `VisitorInteractionRepository.findDailyInteractions(...)` dùng native PostgreSQL query.
- `VisitorInteractionRepository.countByLanguageInPeriod(...)` dùng JPQL aggregation.
- `DailyInteractionProjection` map kết quả native query.

Lỗi ban đầu: alias snake_case (`interaction_date`, `total_interactions`, `unique_visitors`) không map đúng vào interface projection, khiến count trả `0`. Đã sửa bằng alias camelCase có quote:

```sql
CAST(i.interacted_at AT TIME ZONE 'UTC' AS DATE) AS "interactionDate",
COUNT(*) AS "totalInteractions",
COUNT(DISTINCT i.visitor_id) AS "uniqueVisitors"
```

### 3.4 PostgreSQL integration suite

File mới: `backend/src/test/java/com/university/backend/integration/VisitorInteractionPostgresIT.java` (thay thế file cũ `VisitorInteractionPostgresIntegrationTest.java`).

22 test bao phủ:

- Schema Wave 3 + Flyway V2.
- Authenticated/anonymous persistence.
- Client `userId` bị bỏ qua; user lấy từ principal.
- Unknown/invalid artifact FK.
- Idempotency theo user/visitor.
- Concurrent duplicate.
- Duration và timestamp validation.
- Summary unique visitors theo `visitorId`.
- UTC timeseries, leap day, zero buckets.
- Language aggregation + `UNKNOWN`.
- ADMIN/VISITOR/anonymous authorization.
- Range validation.
- Transaction rollback.
- Performance baseline.

### 3.5 Maven profile

`backend/pom.xml` có profile `postgres-integration`:

- Failsafe chỉ chạy `**/*IT.java`.
- `failIfNoTests=true`.
- `POSTGRES_TEST_URL`, `POSTGRES_TEST_USERNAME`, `POSTGRES_TEST_PASSWORD` được map thành `SPRING_DATASOURCE_*` **chỉ cho Failsafe fork**.
- Unit tests H2 vẫn chạy bình thường, không bị env PostgreSQL ghi đè.

Điều này sửa lỗi ban đầu khi đặt `SPRING_DATASOURCE_URL` ở cấp job: toàn bộ Surefire unit tests cũng thấy biến này và cố kết nối PostgreSQL, gây `ApplicationContext failure`.

---

## 4. Kết quả kiểm chứng

### 4.1 Local

| Check | Kết quả | Chi tiết |
|---|---|---|
| Backend unit tests | **PASS** | 95 tests |
| PostgreSQL integration tests | **PASS** | 22 tests, 0 failures, 0 errors, 0 skipped |
| Full `verify` | **PASS** | `./mvnw -B -Ppostgres-integration verify` |
| Performance baseline | **PASS** | 200 interactions, combined analytics 22 ms (local) |
| `git diff --check` | **PASS** | Không lỗi whitespace |
| Docker test DB | **PASS** | PostgreSQL 16.13, `smart_heritage_test`, UTC |

Lệnh tái lập:

```bash
cd backend
POSTGRES_TEST_URL=jdbc:postgresql://localhost:55432/smart_heritage_test \
POSTGRES_TEST_USERNAME=<test-user> \
POSTGRES_TEST_PASSWORD=<test-password> \
./mvnw -B -Ppostgres-integration verify
```

### 4.2 CI

Job `postgres-integration` đã được cập nhật:

- Chạy `./mvnw -B -Ppostgres-integration verify`.
- Parse `target/failsafe-reports/TEST-*VisitorInteractionPostgresIT.xml`.
- Fail nếu không có report, test count `< 22`, hoặc có failures/errors/skipped.
- Upload cả Surefire và Failsafe reports.
- Không dùng `continue-on-error`, không `|| true`.

Kết quả CI thực tế: **PASS** trên PR #24, run `42261630401`; job `postgres-integration` pass sau 1m20s, report gate thấy 22 test với 0 failure/error/skip.

Run: https://github.com/nahnht27/smart-heritage/actions/runs/42261630401

---

## 5. Files chính

**Backend source**

- `backend/src/main/java/com/university/backend/dto/DailyInteractionResponse.java` (new)
- `backend/src/main/java/com/university/backend/dto/LanguageCountResponse.java` (new)
- `backend/src/main/java/com/university/backend/repository/DailyInteractionProjection.java` (new)
- `backend/src/main/java/com/university/backend/repository/VisitorInteractionRepository.java`
- `backend/src/main/java/com/university/backend/service/VisitorInteractionService.java`
- `backend/src/main/java/com/university/backend/controller/VisitorInteractionController.java`

**Tests / build**

- `backend/src/test/java/com/university/backend/service/VisitorInteractionServiceTest.java`
- `backend/src/test/java/com/university/backend/controller/VisitorInteractionControllerTest.java`
- `backend/src/test/java/com/university/backend/integration/VisitorInteractionPostgresIT.java`
- `backend/pom.xml`

**CI / docs**

- `.github/workflows/ci.yml`
- `docs/integration/api-contract.md`
- `docs/testing/postgresql-integration-report.md`
- `docs/reports/post-sprint4-hardening-report.md`
- `docs/reports/m5-analytics-postgres-integration-report.md` (new)
- `docs/development/ci-cd.md`

---

## 6. Rủi ro còn lại

1. **Performance baseline chỉ là local, single-run:** không đại diện production; chưa có `EXPLAIN ANALYZE` hay tải cao.
2. **Frontend chưa dùng timeseries/languages:** hai endpoint đã sẵn sàng nhưng Admin Dashboard hiện mới dùng summary; biểu đồ là việc của wave frontend tiếp theo.
3. **Mobile runtime E2E chưa chạy:** suite xác minh backend bằng MockMvc + PostgreSQL thật, không thay thế kiểm thử thiết bị.
4. **CI phụ thuộc dịch vụ PostgreSQL ephemeral:** nếu runner không cấp service/port, job fail đúng thiết kế; không có fallback H2 cho IT.
5. **Test count gate hard-code 22:** khi thêm test phải cập nhật ngưỡng; đây là chủ đích để tránh suite bị rỗng hoặc bị skip.
6. **Chưa có branch protection tự động:** cần maintainer bật required check `postgres-integration` trên GitHub.

---

## 7. Git Delivery

Branch: `feat/m5-analytics-postgres-reliability`

Base: `origin/main` @ `a1063b3`

Commit groups:

1. `test(backend): add PostgreSQL interaction integration coverage`
2. `feat(backend): add interaction timeseries analytics`
3. `feat(backend): add interaction language analytics`
4. `ci(backend): enforce PostgreSQL integration tests`
5. `docs: document M5 analytics and PostgreSQL verification`

PR: https://github.com/nahnht27/smart-heritage/pull/24

Không tự merge; chờ maintainer review/merge.
