# Sprint 4 — Integration Test Report (M1 / LTJ-39)

**Ngày kiểm thử:** 2026-11-04
**Branch:** `LTJ-39` (tạo từ `origin/main`)
**Base commit:** `96e53db` (origin/main) + Task 1 commit `1bb0f60`
**Người thực hiện:** M1 — Backend & Integration Lead

> Mọi kết quả dưới đây là kết quả **thực sự chạy** trên môi trường được ghi rõ.
> Các mục không thể chạy được đánh dấu `NOT EXECUTED`, `BLOCKED` hoặc `PENDING`,
> không được tính là PASS.

---

## 1. Test environment

| Thành phần | Giá trị |
|------------|---------|
| OS | Linux (Ubuntu 24.04, kernel của máy dev) |
| Docker Engine | 29.1.3 |
| Docker Compose | `docker-compose` 1.29.2 (legacy). Plugin `docker compose` v2 **không có** trên máy |
| Node.js / npm | v24.15.0 / 11.12.1 |
| Python | 3.12.3 |
| Java / Maven trên host | **Không có** → backend tests chạy trong image `maven:3.9.6-eclipse-temurin-17` |
| Database | PostgreSQL 16 (container `postgres:16-alpine`) |
| Backend | Spring Boot 3.2.5, Java 17 (container) |

Tài liệu dùng chuẩn **Compose V2** (`docker compose`). Máy kiểm thử không có
plugin V2 nên lần chạy thực tế dùng lệnh legacy `docker-compose` tương đương;
trên máy có V2 chỉ cần thay `docker-compose` → `docker compose`.

```bash
docker compose config

# mvn test (chạy trong Docker vì host không có Java/Maven)
docker run --rm -v "$PWD/backend":/app -v maven_repo:/root/.m2 \
  -w /app maven:3.9.6-eclipse-temurin-17 mvn -B test
```

---

## 2. Integration test strategy

| Cấp độ | Nội dung | Công cụ |
|--------|----------|---------|
| Level 1 — Automated | Backend JUnit, Mobile Jest, Mobile TypeScript/ESLint, Frontend ESLint/Vite build | Maven, Jest, tsc, eslint, vite |
| Level 2 — API integration | Smoke test gọi backend thật + PostgreSQL thật | `scripts/integration/smoke-test.py` (Python stdlib, không thêm dependency) |
| Level 3 — Manual cross-module | Checklist UI Mobile + Admin Web + Authorization | `docs/testing/sprint-4-e2e-checklist.md` |

Không tạo framework test mới; tận dụng JUnit/Jest/ESLint hiện có và một script
Python stdlib cho API.

---

## 3. Backend test results

Lệnh:

```bash
docker run --rm -v "$PWD/backend":/app -v maven_repo:/root/.m2 \
  -w /app maven:3.9.6-eclipse-temurin-17 mvn -B test
```

**Kết quả: BUILD SUCCESS — 81 tests, 0 failures, 0 errors, 0 skipped.**

| Test class | Tests |
|------------|-------|
| `AuthControllerTest` | 18 |
| `ArtifactControllerTest` | 13 |
| `MultimediaControllerTest` | 14 |
| `HeritageSiteControllerTest` | 9 |
| `VisitorInteractionControllerTest` | 8 |
| `VisitorInteractionServiceTest` | 6 |
| `CorsIntegrationTest` | 6 |
| `PublicContentAccessTest` (mới, Task 1) | 4 |
| `GlobalExceptionHandlerTest` | 2 |
| `BackendApplicationTests` | 1 |

Ngoài ra `docker compose build backend` chạy `mvn package` (gồm test) và
**BUILD SUCCESS**.

---

## 4. Mobile test results

| Check | Lệnh | Kết quả |
|-------|------|---------|
| Jest | `npm test -- --runInBand` | **PASS** — 3 suites, 18 tests |
| TypeScript | `npx tsc --noEmit` | **FAIL** — 2 lỗi có sẵn (xem §12) |
| ESLint | `npm run lint` | **FAIL** — 1 error có sẵn + 5 warnings (xem §12) |

Jest bao gồm test mới `src/services/__tests__/api.test.ts` (4 test) xác minh
`apiRequest` unwrap đúng envelope `ApiResponse<T>`.

---

## 5. Frontend test results

| Check | Lệnh | Kết quả |
|-------|------|---------|
| ESLint | `npm run lint` | **PASS** (exit 0) |
| Production build | `npm run build` (`tsc -b && vite build`) | **PASS** — 46 modules, build ~0.3s |

---

## 6. API smoke test results

Script: `scripts/integration/smoke-test.py`
Backend + PostgreSQL chạy bằng Docker Compose; base URL `http://localhost:8080/api`.

### Lần chạy public (không credentials)

**17 passed, 0 failed, 8 skipped** (exit 0). Các mục authenticated được SKIP đúng
theo thiết kế.

### Lần chạy đầy đủ (VISITOR + ADMIN + artifact test + interaction write + concurrent duplicate)

**50 passed, 0 failed, 0 skipped** (exit 0).

| Scenario | Kết quả |
|----------|---------|
| A — Health (`GET /api/health`) | PASS — 200, `status=UP` |
| B — Public content (sites/artifacts/multimedia) | PASS — 200, envelope, `data` là list |
| C — Auth invalid + valid | PASS — 401 với sai credentials; JWT nhận được (không in token) |
| D — `GET /api/users/me` | PASS — 200 với visitor; 401 không token |
| E1 — Sequential duplicate | PASS — lần đầu 201; gửi lại cùng `eventId` sau khi request đầu hoàn tất → **bắt buộc 200**, cùng `interactionId`, `totalInteractions` không đổi |
| E2 — Concurrent duplicate (opt-in) | PASS — 3 request đồng thời: đúng một 201, các request còn lại 200/409; tất cả response thành công cùng `interactionId`; tổng tăng đúng 1 |
| F — Analytics authorization | PASS — anonymous 401, VISITOR 403, ADMIN 200 |
| G — Analytics data + filter | PASS — số liệu phản ánh event vừa ghi; `from` thiếu `to` → 400 |

Ghi chú dữ liệu test: script dùng tài khoản test `smoke_visitor` /
`smoke_admin` và một site/artifact test trên **volume Docker local dùng riêng cho
kiểm thử**. Script không tạo user; chỉ ghi interaction khi
`ENABLE_INTERACTION_WRITE=true`. Scenario E2 (concurrent) chỉ chạy khi bật thêm
`ENABLE_CONCURRENT_DUPLICATE=true` và ghi thêm đúng một record.

---

## 7. PostgreSQL verification

```bash
docker exec smart-heritage-db psql -U postgres -d smart_heritage \
  -c "SELECT COUNT(*) FROM heritage_site;" \
  -c "SELECT COUNT(*) FROM artifact;" \
  -c "SELECT COUNT(*) FROM visitor_interaction;"
```

Kết quả sau các lần smoke (tính đến lượt QA cuối): `heritage_site=1`,
`artifact=1`, `visitor_interaction=5` (tất cả `VIEW`, từ các lần chạy test).
Điều này xác nhận:

- Backend kết nối đúng PostgreSQL qua hostname `postgres` trong Compose network.
- Interaction được persist thật xuống PostgreSQL.
- Sequential duplicate `eventId` **không** tạo thêm record (tổng analytics không
  đổi sau request thứ hai).
- Concurrent duplicate chỉ tạo **một** record dù nhiều request đồng thời (tổng
  tăng đúng 1).

---

## 8. Mobile E2E results

**NOT EXECUTED** — môi trường headless không có Android Emulator/iOS Simulator
hay thiết bị thật. Không tuyên bố PASS cho luồng UI Mobile.

Đã xác minh ở mức code/test:

- `apiRequest` unwrap envelope đúng (Jest).
- Heritage/interaction service map đúng field backend (Jest).
- Cấu hình `EXPO_PUBLIC_API_BASE_URL` theo platform (Android `10.0.2.2`,
  iOS/Web `localhost`, thiết bị thật dùng IP LAN).
- TypeScript/lint còn lỗi có sẵn (§12), không phải regression của Task 1/2.

Checklist thủ công: `docs/testing/sprint-4-e2e-checklist.md` (đánh dấu PENDING).

---

## 9. Admin Web E2E results

**NOT EXECUTED** — không chạy trình duyệt tương tác trong môi trường này.
Admin Web build/lint PASS; API login/authorization/CRUD được xác minh ở tầng API
qua smoke test (login VISITOR/ADMIN, analytics 200/403/401).

Checklist thủ công: `docs/testing/sprint-4-e2e-checklist.md` (đánh dấu PENDING).

---

## 10. Authorization checks

| Trường hợp | Kết quả thực tế |
|------------|-----------------|
| Anonymous `GET /api/health` | 200 |
| Anonymous `GET /api/heritage-sites` / `artifacts` / `multimedia` | 200 (đã sửa — trước đây 401) |
| Anonymous `GET /api/users/me` | 401 |
| Anonymous `POST /api/heritage-sites` | 401 |
| Anonymous analytics | 401 |
| VISITOR `GET /api/users/me` | 200 |
| VISITOR analytics | 403 |
| ADMIN analytics | 200 |
| ADMIN tạo site/artifact | 201 |

---

## 11. Failed / skipped tests

| Mục | Trạng thái | Lý do |
|-----|-----------|-------|
| Mobile TypeScript | FAIL (pre-existing) | Thiếu type declaration cho `*.module.css` và `@/global.css` |
| Mobile ESLint | FAIL (pre-existing) | `react-hooks/set-state-in-effect` trong `use-color-scheme.web.ts` |
| Mobile UI E2E | NOT EXECUTED | Không có emulator/simulator |
| Admin Web UI E2E | NOT EXECUTED | Không có browser tương tác |
| Authenticated smoke (public-only run) | SKIPPED | Không truyền credentials — đúng thiết kế |
| Interaction write (mặc định) | SKIPPED | Cần opt-in `ENABLE_INTERACTION_WRITE=true` |
| Concurrent duplicate (mặc định) | SKIPPED | Cần opt-in `ENABLE_CONCURRENT_DUPLICATE=true` |

---

## 12. Existing issues (không phải regression của Sprint 4)

1. **Mobile TypeScript** — `src/components/animated-icon.web.tsx:5` không tìm thấy
   `./animated-icon.module.css`; `src/constants/theme.ts:6` không có type cho
   side-effect import `@/global.css`. Có từ trước, ngoài phạm vi M1.
2. **Mobile ESLint** — `src/hooks/use-color-scheme.web.ts:11` báo
   `react-hooks/set-state-in-effect`. Có từ trước, ngoài phạm vi M1.
3. **`mobile/eslint.config.js` đang untracked** trên máy dev. File này cần cho
   `expo lint`; không được đưa vào commit M1 vì không thuộc thay đổi của task.
4. **Docker Compose legacy (1.29.2) + Docker 29** — lệnh `up` khi container
   backend đã tồn tại và image thay đổi có thể lỗi
   `KeyError: 'ContainerConfig'`. Đây là lỗi công cụ, không phải lỗi cấu hình.
   Workaround đã dùng: `docker rm -f smart-heritage-backend` rồi
   `docker-compose up -d`. Khuyến nghị dùng Compose V2 (`docker compose`).
5. **Chưa có seed ADMIN/content** — DB mới chỉ có role `VISITOR` khi đăng ký.
   Smoke test ADMIN cần cấp role qua SQL/seed (đã làm thủ công trên DB test).

---

## 13. New bugs found and fixed

1. **Public content GET bị 401** — `SecurityConfig` chỉ permit `/api/health` và
   `/api/auth/**`; mọi request khác (kể cả GET nội dung) bị `.anyRequest().authenticated()`.
   Trái với contract M2 (“GET công khai”) và làm Mobile không tải được nội dung.
   **Fix:** permit `GET` cho `/api/heritage-sites/**`, `/api/artifacts/**`,
   `/api/multimedia/**`; write vẫn bảo vệ bằng `@PreAuthorize("hasRole('ADMIN')")`.
   Thêm `PublicContentAccessTest`.

2. **Mobile `apiRequest` không unwrap `ApiResponse<T>`** — trả về nguyên envelope
   khiến `heritageApi` gọi `.map()` trên object và profile `/users/me` hỏng.
   **Fix:** `mobile/src/services/api.ts` unwrap `data` khi phát hiện envelope;
   thêm `api.test.ts`.

3. **Analytics summary 500 trên PostgreSQL** — JPQL dùng
   `(:from is null or ...)`; PostgreSQL không xác định được kiểu của tham số NULL,
   trong khi H2 (test) chấp nhận. **Fix:** bỏ điều kiện `is null` khỏi 4 query;
   service dùng bound cụ thể (`Instant.EPOCH` / năm 9999) cho trường hợp không lọc
   và vẫn trả `from`/`to` gốc (null) trong response. Thêm regression test.

---

## 14. Release gate

### Backend gate

- [x] Maven tests pass (81/81)
- [x] Database health check pass
- [x] API Health pass
- [x] Public API tests pass
- [x] JWT authentication pass
- [x] ADMIN/VISITOR authorization pass
- [x] Visitor Interaction persistence pass
- [x] Analytics API pass (đã sửa lỗi PostgreSQL)

### Mobile gate

- [x] Jest tests pass (18/18)
- [!] TypeScript: 2 lỗi **pre-existing** (báo cáo, không phải regression)
- [!] ESLint: 1 error **pre-existing** (báo cáo, không phải regression)
- [~] API connection: xác minh qua service test + envelope test; chưa chạy app thật
- [ ] Visitor browsing flow trên UI — PENDING (không có emulator)
- [ ] Interaction logging trên UI — PENDING

### Admin Web gate

- [x] TypeScript check pass (trong `npm run build`)
- [x] Lint pass
- [x] Production build pass
- [x] Login/authorization pass ở tầng API
- [x] Content CRUD pass ở tầng API (tạo site/artifact trong smoke setup)
- [ ] Analytics dashboard UI — PENDING (không có browser)
- [ ] Logout UI — PENDING

### Integration gate

- [x] Docker Compose services healthy (backend + postgres)
- [x] Backend kết nối PostgreSQL
- [x] Không có API contract mismatch trong các luồng đã test
- [x] Không có credentials/secrets thật trong Git (chỉ dev fallback + placeholder)
- [x] Không có blocking regression
- [x] Test results và known issues được ghi nhận

### Quyết định

**Backend/API/Frontend: READY.** **Mobile UI/Admin UI manual E2E: PENDING** do
hạn chế môi trường (không có emulator/browser tương tác). Không có blocker kỹ
thuật nào ở tầng API. Trước khi merge/release chính thức, team cần chạy checklist
E2E thủ công trên máy có emulator/browser.

---

## 15. Cách tái chạy

```bash
# 1. Stack (Compose V2; dùng `docker-compose` nếu máy chỉ có bản legacy)
docker compose up -d --build
docker compose ps
curl http://localhost:8080/api/health

# 2. Backend tests
docker run --rm -v "$PWD/backend":/app -v maven_repo:/root/.m2 \
  -w /app maven:3.9.6-eclipse-temurin-17 mvn -B test

# 3. Frontend
(cd frontend && npm ci && npm run lint && npm run build)

# 4. Mobile
(cd mobile && npm ci && npm test && npx tsc --noEmit && npm run lint)

# 5. API smoke (public)
python3 scripts/integration/smoke-test.py

# 6. API smoke (đầy đủ — cần credentials + artifact + opt-in write)
TEST_VISITOR_USERNAME=... TEST_VISITOR_PASSWORD=... \
TEST_ADMIN_USERNAME=... TEST_ADMIN_PASSWORD=... \
TEST_ARTIFACT_ID=... ENABLE_INTERACTION_WRITE=true \
ENABLE_CONCURRENT_DUPLICATE=true \
python3 scripts/integration/smoke-test.py
```
