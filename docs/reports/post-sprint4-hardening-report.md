# Smart Heritage — Post Sprint 4 Hardening Report (Wave 1: Mobile Core Flow)

**Ngày:** 2026-11-05

**Branch:** `fix/mobile-core-flow` (tạo từ `origin/main` @ `b1bf41b`)

**Phạm vi:** AUDIT-001, AUDIT-006, AUDIT-007 (thumbnail only)
**Nguyên tắc:** không sửa main, không reset/rebase/force-push, không đụng `mobile/eslint.config.js` (untracked), không commit file ngoài scope.

---

## 1. Trạng thái Findings

| Finding | Trạng thái | Ghi chú |
|---|---|---|
| AUDIT-001 — Mobile login/register double `/api` | **FIXED** | URL composition tập trung; screen dùng `authApi`; token storage chuyển vào service |
| AUDIT-006 — Multimedia `IMAGE`/`image` mismatch | **FIXED** | Chuẩn hóa type tại `heritageApi` mapping; screen so sánh `IMAGE` |
| AUDIT-007 — Thiếu thumbnail thực tế | **PARTIALLY FIXED** | Thumbnail ảnh đã có cho home/list/detail; **audio/video player deferred** đúng phạm vi wave |
| AUDIT-007 (audio/video playback) | **DEFERRED** | Cần đánh giá Expo SDK 57 và dependency playback riêng |

---

## 2. Root Cause và Implementation

### 2.1 AUDIT-001 — Authentication endpoint composition

**Root cause**
- `mobile/src/services/api.ts` đặt base mặc định đã gồm `/api` (`http://...:8080/api`).
- `mobile/src/app/index.tsx` lại hard-code `'/api/auth/login'` và `'/api/auth/register'`.
- `apiRequest` nối chuỗi trực tiếp ⇒ URL thành `/api/api/auth/*`; backend rơi vào nhánh `anyRequest().authenticated()` và trả `401 Authentication is required`.

**Implementation**
- Thêm `buildApiUrl(endpoint, baseUrl?)` trong `mobile/src/services/api.ts`:
  - Giữ nguyên absolute URL (`http://`, `https://`).
  - Trim slash đầu/cuối.
  - Nếu base kết thúc bằng `/api` và endpoint bắt đầu bằng `api/` (hoặc `api`), bỏ prefix trùng ⇒ không bao giờ tạo `/api/api/...`.
  - Endpoint public như `heritage-sites` giữ nguyên hành vi.
- Thêm `mobile/src/services/authApi.ts`:
  - `AUTH_ENDPOINTS = { login: 'auth/login', register: 'auth/register' }`.
  - `authApi.login()` / `authApi.register()` dùng `apiClient`.
  - `login()` chỉ lưu token khi response `ok` và có `accessToken`.
- `mobile/src/app/index.tsx` chuyển sang `authApi.login()` / `authApi.register()`; bỏ hard-code URL và bỏ lưu token thủ công trong screen.
- Không thay đổi contract backend, không đổi ý nghĩa biến `EXPO_PUBLIC_API_BASE_URL` (vẫn gồm `/api`).

### 2.2 AUDIT-006 — Multimedia type normalization

**Root cause**
- Backend lưu `type` đúng như client gửi; Admin Web gửi `IMAGE` (canonical).
- Mobile `artifact_detail.tsx` lọc `m.type === 'image'` (lowercase) nên không bao giờ khớp.

**Implementation**
- `mobile/src/services/heritageApi.ts`:
  - Thêm `MultimediaType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'UNKNOWN'`.
  - Thêm `normalizeMultimediaType(type)` (trim + uppercase; unknown/null → `UNKNOWN`).
  - `mapMultimedia()` trả type đã chuẩn hóa; mọi screen dùng chung một giá trị.
- `mobile/src/app/artifact_detail.tsx` so sánh `m.type === 'IMAGE'`.
- Không thay đổi API contract/backend; dữ liệu lowercase cũ vẫn tương thích.

### 2.3 AUDIT-007 — Thumbnail thực tế

**Root cause**
- `ArtifactResponse` của backend không chứa multimedia/thumbnail.
- `heritageApi.mapArtifact()` luôn gán `imageUrl: null`; home/list truyền `uri: undefined` ⇒ không có ảnh.

**Implementation**
- `heritageApi.ts`:
  - `isUsableMediaUrl(url)` chỉ chấp nhận URL absolute `http(s)`.
  - `selectArtifactThumbnail(multimedia)` chọn ảnh `IMAGE` hợp lệ đầu tiên.
  - `getArtifactThumbnail(artifactId)` lấy multimedia rồi chọn thumbnail.
  - `getArtifactsWithThumbnailsBySite(siteId, limit?)` lấy danh sách artifact rồi enrich `imageUrl`; home dùng `limit = 3` để tránh gọi thừa.
- Thêm `mobile/src/components/remote-image.tsx`:
  - Không render `<Image>` nếu `uri` null/rỗng/không phải http(s).
  - Fallback placeholder khi ảnh lỗi (`onError`).
  - Không hardcode URL, không dùng mock.
- Áp dụng:
  - `home.tsx`: featured artifact thumbnail thật; hero site dùng placeholder (site không có image field).
  - `artifact_list.tsx`: thumbnail thật cho từng artifact.
  - `artifact_detail.tsx`: hero + gallery ảnh thật; bỏ ảnh lỗi khỏi danh sách.

**Deferred (đúng phạm vi):** audio/video player. Lý do: cần đánh giá `expo-audio`/`expo-video` hoặc thư viện ngoài, dev build, background playback và quyền; không thực hiện trong wave thumbnail.

---

## 3. Files Changed

### Commit 1 — Authentication
- `mobile/src/services/api.ts`
- `mobile/src/services/authApi.ts` (new)
- `mobile/src/services/__tests__/api.test.ts`
- `mobile/src/services/__tests__/authApi.test.ts` (new)
- `mobile/src/app/index.tsx`

### Commit 2 — Multimedia & thumbnail
- `mobile/src/services/heritageApi.ts`
- `mobile/src/services/__tests__/heritageApi.test.ts`
- `mobile/src/components/remote-image.tsx` (new)
- `mobile/src/app/home.tsx`
- `mobile/src/app/artifact_list.tsx`
- `mobile/src/app/artifact_detail.tsx`
- `docs/reports/post-sprint4-hardening-report.md` (new)

**Không thay đổi:** backend, frontend admin, Compose, CI, `mobile/eslint.config.js`.

---

## 4. Regression Tests

### 4.1 AUDIT-001
- `buildApiUrl` với base `http://localhost:8080/api` + `auth/login` ⇒ `http://localhost:8080/api/auth/login`.
- Legacy `/api/auth/login` + base `/api` ⇒ không thành `/api/api/...`.
- Base có trailing slash; Android emulator `10.0.2.2`; production `https://.../api`.
- Base không có `/api` + endpoint `/api/auth/register` ⇒ đúng một prefix.
- Public endpoint `heritage-sites` không đổi.
- Absolute URL (CDN) giữ nguyên.
- `authApi.login` gọi đúng `'auth/login'`, lưu token khi thành công, không lưu khi 401/timeout.
- `authApi.register` gọi đúng `'auth/register'`, không lưu token.
- Envelope error được truyền nguyên trạng.

### 4.2 AUDIT-006
- Mapping `IMAGE` → `IMAGE`.
- Mapping `image` → `IMAGE`.
- Mapping có khoảng trắng `' Image '` → `IMAGE`.
- `AUDIO` → `AUDIO`, `video` → `VIDEO`.
- `''`, `null`, `undefined`, `PANORAMA` → `UNKNOWN`.
- `selectArtifactThumbnail`: chọn ảnh IMAGE đầu tiên; bỏ qua AUDIO/VIDEO/UNKNOWN.
- Danh sách rỗng/null → `null`.
- URL không hợp lệ (`not-a-url`, relative, `ftp://`) bị loại.

### 4.3 AUDIT-007
- `getArtifactsWithThumbnailsBySite` lấy thumbnail thật cho artifact có ảnh, `null` cho artifact không có ảnh.
- `limit` chỉ lấy thumbnail cho số artifact cần thiết (home = 3).
- Danh sách multimedia rỗng → không có thumbnail, không lỗi.
- `isUsableMediaUrl` chấp nhận http/https; loại null/empty/relative/ftp.
- `RemoteImage` (logic) fallback khi URL null/invalid hoặc `onError`.

---

## 5. Kết quả Kiểm chứng

| Check | Kết quả | Chi tiết |
|---|---|---|
| Mobile Jest | **PASS** | 4 suites, **51 tests** (trước wave: 3 suites/18 tests) |
| Mobile TypeScript | **FAIL (pre-existing)** | Exit 2: `animated-icon.module.css` typings; `@/global.css` side-effect typings |
| Mobile ESLint | **FAIL (pre-existing)** | 1 error: `use-color-scheme.web.ts:11` `react-hooks/set-state-in-effect`; 1 warning: `clearErrors` unused |
| Frontend lint | **PASS** | Exit 0 (không bị ảnh hưởng) |
| Frontend build | **PASS** | `tsc -b && vite build`, 46 modules |
| Backend tests | **NOT RE-RUN** | Không có thay đổi backend; baseline audit 81/81 PASS |
| `git diff --check` | **PASS** | Không lỗi whitespace |
| API endpoint đúng | **PASS** | `POST /api/auth/login` (sai credentials) → 401 `Invalid username or password` |
| API double path | **PASS (bug path)** | `POST /api/api/auth/login` → 401 `Authentication is required` |
| Public content API | **PASS** | `GET /api/heritage-sites` → 200 |
| Mobile runtime integration | **NOT VERIFIED** | Không có emulator/thiết bị/credentials; không tuyên bố PASS |
| Authenticated smoke | **NOT VERIFIED** | Không ghi dữ liệu lên stack dev đang chạy |

**Kết luận test:** không có regression do wave này. Các lỗi TypeScript/ESLint còn lại là pre-existing, ngoài scope; không tắt/không nới lỏng cấu hình.

---

## 6. Rủi ro còn lại và Đề xuất

1. **N+1 request thumbnail:** mỗi artifact gọi `/api/multimedia?artifactId=...`. Đã giới hạn ở home (`limit=3`), nhưng danh sách artifact lớn vẫn tốn request. Đề xuất backend trả thumbnail trong `ArtifactResponse` hoặc endpoint batch ở wave sau.
2. **Thumbnail phụ thuộc dữ liệu multimedia:** artifact không có ảnh sẽ hiển thị placeholder; đúng hành vi mong muốn.
3. **Audio/video:** chưa phát được; cần wave riêng (AUDIT-007 phần 2).
4. **TypeScript/ESLint:** 2 lỗi TS + 1 lỗi ESLint pre-existing vẫn làm `tsc`/`lint` exit khác 0; cần xử lý ở wave hardening tiếp theo (không thuộc wave này).
5. **Runtime mobile:** chưa chạy trên emulator/thiết bị; cần E2E thủ công trước khi release.
6. **Base URL contract:** `EXPO_PUBLIC_API_BASE_URL` vẫn phải gồm `/api` (theo `.env.example`). Nếu một môi trường mới đặt base không có `/api`, endpoint auth sẽ thành `/auth/login` — cần giữ đúng tài liệu env.

---

## 7. Git Delivery

- Branch: `fix/mobile-core-flow`
- Base: `origin/main` @ `b1bf41b`
- Commit dự kiến:
  1. `fix(mobile): correct authentication endpoint composition`
  2. `fix(mobile): normalize multimedia types and thumbnails`
- Không merge; PR tạo sau khi push (nếu remote cho phép).
- Không stage `mobile/eslint.config.js`, `scripts/integration/__pycache__/`, hay audit report cũ.

---

# Wave 2 — Admin Authentication & Session Hardening

**Ngày:** 2026-11-05

**Branch:** `fix/admin-auth-session` (tạo từ `origin/main` @ `dd7c939`, merge PR #20)

**Phạm vi:** AUDIT-002, AUDIT-012, AUDIT-013 (Admin Web only)

## 8. Trạng thái Findings

| Finding | Trạng thái | Ghi chú |
|---|---|---|
| AUDIT-002 — JWT decode sai claim / mất phiên khi refresh | **FIXED** | Bỏ decode JWT làm identity; bootstrap bằng `GET /api/users/me`; Header chịu được username thiếu |
| AUDIT-012 — Logout không xóa token; token cũ khi login bị từ chối | **FIXED** | Sidebar/Header dùng AuthContext logout; login chỉ persist token sau khi xác minh ADMIN; mọi login attempt xóa session cũ trước đó |
| AUDIT-013 — Không xử lý 401/token hết hạn toàn cục | **FIXED (client-side)** | 401 authenticated request → clear token + reset session; 403/network không logout; không thêm refresh/revoke vì backend không có endpoint |
| AUDIT-013 (refresh/revoke token) | **DEFERRED** | Backend hiện chỉ có login/register; không tự tạo frontend refresh flow theo đúng scope |
| AUDIT-019 — Admin Web không có test | **FIXED (auth scope)** | Thêm Vitest + RTL; 33 regression tests cho auth lifecycle |

## 9. Root Cause và Implementation

### 9.1 AUDIT-002 — Session bootstrap từ profile thật

**Root cause**
- Backend JWT chỉ phát `sub` (username) và `role` (`JwtTokenProvider.generateToken`).
- Frontend cũ giải mã JWT và đọc `userId`, `username`, `email`, `preferredLanguageId` — các claim không tồn tại.
- Khi `role` đọc được nhưng `username` undefined, `Header` gọi `username.charAt(0)` ⇒ crash. Khi base64url không decode được bằng `atob`, user thành `null` ⇒ mất phiên sau refresh.

**Implementation**
- Xóa hoàn toàn `getCurrentUser()`/JWT payload decode khỏi `authService.ts`.
- Thêm `mapUserResponse()` và `isAdminRole()`; profile được lấy từ endpoint authenticated `GET /api/users/me`.
- `AuthProvider` bootstrap:
  1. Đọc token từ `sessionStorage`.
  2. Không có token → `unauthenticated`.
  3. Có token → `GET /api/users/me` (Authorization do `apiClient` tự gắn).
  4. Profile ADMIN → `authenticated`; profile VISITOR/role khác → clear token/session, `unauthenticated` + access denied.
  5. HTTP 401 → clear session; network error/timeout → `error` + giữ token + retry.
- Thêm trạng thái `loading`/`error` vào `AuthContext`; `ProtectedRoute` hiển thị “Restoring your session…” thay vì redirect khi đang bootstrap.
- `Header` dùng `displayName = user?.username?.trim() || 'Administrator'` và avatar initial an toàn.
- Không thay đổi backend vì `/api/users/me` đã trả đúng `UserResponse` gồm `userId`, `username`, `email`, `role`, `preferredLanguageId`.

### 9.2 AUDIT-012 — Login/Logout lifecycle

**Root cause**
- `Sidebar` chỉ `navigate('/login')`, không gọi `logout()`.
- `authService.login()` lưu token ngay sau khi backend trả về, trước khi `LoginPage` kiểm tra role ADMIN; login VISITOR để lại token.
- Token cũ có thể còn khi login mới thất bại/bị từ chối.

**Implementation**
- `authService.login()` chỉ trả `LoginResponse`, **không** persist token.
- `LoginPage` xóa session cũ (`clearAuth()`) trước mỗi login attempt; chỉ gọi `setAuth()` sau khi `isAdminRole()` đạt; VISITOR nhận thông báo access denied và không có token.
- `AuthProvider.handleLogin()` kiểm tra ADMIN lần nữa trước khi `authStorage.setToken()` (defense in depth).
- `Sidebar` và `Header` đều gọi `AuthContext.logout()` rồi `navigate('/login')`; logout xóa `sessionStorage` và reset state trong bộ nhớ.
- Refresh sau logout không còn token để bootstrap.

### 9.3 AUDIT-013 — Global 401/403/network handling

**Implementation**
- `apiClient` phát hiện HTTP 401 trên request authenticated (có token) và:
  - Chỉ xử lý nếu token trong storage vẫn là token của request (tránh request cũ xóa token mới).
  - Xóa token, phát `authEvents.emitUnauthorized()` tới `AuthProvider`.
  - Bỏ qua `/api/auth/*` để 401 do sai username/password chỉ hiển thị lỗi đăng nhập, không redirect loop.
- `AuthProvider` subscribe event 401 và reset session + hiển thị “Your session has expired. Please sign in again.”; `ProtectedRoute` dùng `Navigate replace` nên không tạo nhiều redirect.
- HTTP 403: giữ nguyên session, chỉ throw `ApiError` để trang hiển thị access denied.
- Network error (`fetch` reject): `ApiError(status 0)`, **không** xóa token; bootstrap chuyển `error` + retry.
- Token expiration: backend không có refresh-token endpoint nên không thêm refresh/revoke; dùng 401 của backend làm nguồn xác định invalid/expired. Không dùng JWT decode cho identity/role.
- Không tạo circular dependency: `apiClient → authEvents/authStorage`; `AuthContext → authService/apiClient/authEvents` một chiều.

## 10. Files Changed (Wave 2)

**Source**
- `frontend/src/services/authService.ts`
- `frontend/src/services/apiClient.ts`
- `frontend/src/services/authEvents.ts` (new)
- `frontend/src/context/AuthContext.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/pages/LoginPage.tsx`

**Test / tooling**
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/src/test/setup.ts` (new)
- `frontend/src/__tests__/App.test.tsx` (new)
- `frontend/src/components/layout/__tests__/Header.test.tsx` (new)
- `frontend/src/components/layout/__tests__/Sidebar.test.tsx` (new)
- `frontend/src/context/__tests__/AuthContext.test.tsx` (new)
- `frontend/src/pages/__tests__/LoginPage.test.tsx` (new)
- `frontend/src/services/__tests__/apiClient.test.ts` (new)
- `frontend/src/services/__tests__/authService.test.ts` (new)

**CI**
- `.github/workflows/ci.yml` — thêm `npm test` vào `frontend-checks` (required, không `continue-on-error`, không `|| true`).

**Không thay đổi:** backend, mobile, Compose, `mobile/eslint.config.js`, `scripts/integration/__pycache__/`.

## 11. Regression Tests

Bộ test dùng Vitest 5 + React Testing Library + jsdom, chạy qua `npm test`.

**Auth bootstrap**
1. Không token → `unauthenticated`, không gọi `/users/me`.
2. Token + profile ADMIN → `authenticated`.
3. Token + profile VISITOR → clear token/session + access denied.
4. Token expired/invalid → 401 → clear session.
5. Network error → `error`, giữ token, có retry.
6. Profile thiếu `username` → Header không crash, hiển thị fallback.

**Login**
7. ADMIN login → session + token được lưu.
8. VISITOR login → không lưu token/session.
9. Wrong credentials → lỗi `Invalid username or password`, không redirect.
10. Login lại sau logout → dùng token mới, không reuse token cũ.
11. Login VISITOR khi còn token cũ → token cũ bị xóa, không giữ admin session.

**Logout**
12. Sidebar gọi `logout()` của AuthContext.
13. Logout xóa storage + in-memory session.
14. Refresh sau logout không khôi phục phiên.

**Global API errors**
15. Authenticated 401 → clear session + emit unauthorized.
16. Login 401 → chỉ lỗi credentials, không global logout/redirect loop.
17. HTTP 403 → không clear session.
18. Network error → không clear session.
19. Request cũ trả 401 không xóa token mới (race protection).

**Protected routes**
20. Bootstrap loading → không redirect nhầm.
21. Unauthenticated → login.
22. Non-ADMIN → không vào admin routes.
23. ADMIN → vào dashboard.

## 12. Kết quả Kiểm chứng Wave 2

| Check | Kết quả | Chi tiết |
|---|---|---|
| Frontend tests | **PASS** | 7 test files, **33 tests** |
| Frontend lint | **PASS** | `eslint .`, exit 0 |
| Frontend build | **PASS** | `tsc -b && vite build`, 47 modules |
| Backend `AuthControllerTest` | **PASS** | 18/18 tests (H2 container; không thay đổi backend) |
| `GET /api/users/me` không token | **PASS** | HTTP 401, envelope `success=false` |
| Login sai credentials | **PASS** | HTTP 401, `Invalid username or password` |
| Public content API | **PASS** | `GET /api/heritage-sites` → 200 |
| `git diff --check` | **PASS** | Không lỗi whitespace |
| Admin login thật trên browser | **NOT VERIFIED** | Không có credentials/browser automation |
| Refresh trang sau login thật | **NOT VERIFIED** | Phụ thuộc browser + backend thật |
| Logout/expiry/403 E2E trên UI | **NOT VERIFIED** | Unit tests dùng mock fetch, không thay thế E2E |
| CI trên PR #21 | **PASS** | `frontend-checks`, `backend-test`, `docker-build`, `integration-smoke`, `mobile-tests` pass; `mobile-static-analysis` (advisory) fail do nợ cũ của mobile, không do Wave 2 |

## 13. Rủi ro còn lại

- **Chưa E2E browser với backend thật:** không có credentials và browser automation; các test hiện tại xác minh logic client, không xác minh tích hợp UI–backend.
- **Không có refresh/revoke token:** đúng hiện trạng backend; token hết hạn chỉ được phát hiện khi API trả 401. Muốn refresh/revoke cần thay đổi backend (ngoài scope).
- **Role thay đổi giữa phiên:** nếu backend đổi quyền của user sau bootstrap, client chỉ cập nhật khi gọi lại `/users/me` hoặc đăng nhập lại; backend vẫn là nguồn kiểm soát cuối cùng.
- **Network error lúc bootstrap:** admin UI chuyển sang trạng thái lỗi + retry thay vì vào app; đây là hành vi có chủ đích để không coi network error là token invalid.
- **sessionStorage:** vẫn giữ nguyên chiến lược hiện tại (mất khi đóng tab); rủi ro XSS token theft không thay đổi trong wave này.
- **Package audit:** `npm install` báo vulnerabilities hiện hữu; không chạy `npm audit fix --force` để tránh nâng cấp ngoài scope.

## 14. Git Delivery Wave 2

- Branch: `fix/admin-auth-session`
- Base: `origin/main` @ `dd7c939` (PR #20 đã merge)
- Commits dự kiến:
  1. `fix(frontend): restore admin session from authenticated profile`
  2. `fix(frontend): handle logout and unauthorized sessions`
  3. `test(frontend): cover admin authentication lifecycle`
- Push branch và tạo PR về `main`; không tự merge.

---

# Wave 3 — M5 Analytics & PostgreSQL Reliability

**Ngày:** 2026-11-07

**Branch:** `feat/m5-analytics-postgres-reliability` (tạo từ `origin/main` @ `a1063b3`)

**Phạm vi:** port có chọn lọc M5 từ `origin/LTJ-50`; thêm analytics timeseries/languages; đưa PostgreSQL integration suite vào Maven/CI; cập nhật tài liệu.

**Nguyên tắc:** không merge/rebase raw `LTJ-50`, không sửa trực tiếp `main`, không reset/rebase/force-push, không đụng database dev, không commit secret hay artifact benchmark.

## 15. Trạng thái hạng mục

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Port analytics timeseries từ `LTJ-50` | **DONE** | Adapt theo Wave 3; UTC date buckets, zero-fill, `[from, to)` |
| Port language analytics từ `LTJ-50` | **DONE** | Trim + bucket `UNKNOWN`; sort count desc, code asc |
| PostgreSQL integration suite | **DONE** | 22 tests, schema Wave 3 + Flyway V2 |
| Maven Failsafe profile | **DONE** | Chỉ chạy `**/*IT.java`; env DB chỉ truyền cho Failsafe |
| CI integration gate | **DONE** | Parse Failsafe XML; fail nếu `< 22` test hoặc có failure/error/skip |
| API contract docs | **DONE** | Thêm 2 endpoint + checklist |
| PostgreSQL test report | **DONE** | Cập nhật báo cáo 22 tests |
| Frontend charts cho timeseries/languages | **DEFERRED** | Ngoài scope backend wave này |
| Production-scale performance/EXPLAIN | **DEFERRED** | Chỉ có baseline local |

## 16. Root cause và implementation chính

### 16.1 Không merge raw `LTJ-50`

`LTJ-50` được tạo từ base cũ `5b77c2d`, trước Wave 3. Merge raw sẽ ghi đè các thay đổi quan trọng:

- `visitorId` UUID và `userId` nullable.
- User identity lấy từ JWT principal, không tin `userId` client gửi.
- Idempotency theo username + `eventId`, cho phép `visitorId` thay đổi sau reinstall.
- Unique visitors tính theo `visitorId`.

Vì vậy chỉ port/adapt phần M5 còn giá trị và viết lại test theo contract hiện tại.

### 16.2 Analytics timeseries/languages

- `VisitorInteractionRepository.findDailyInteractions` dùng native PostgreSQL query, nhóm theo `CAST(interacted_at AT TIME ZONE 'UTC' AS DATE)`.
- `countByLanguageInPeriod` dùng JPQL aggregation.
- Service zero-fill mọi ngày UTC trong range; ngày cuối là `to - 1ns`.
- Language null/rỗng được chuẩn hóa thành `UNKNOWN`.

### 16.3 Sửa lỗi projection native query

Alias snake_case không map vào interface projection, làm count trả `0`. Đã đổi sang alias camelCase có quote:

```sql
AS "interactionDate",
AS "totalInteractions",
AS "uniqueVisitors"
```

Sau fix, toàn bộ 22 integration tests pass.

### 16.4 Tách env PostgreSQL khỏi unit tests

Lần chạy đầu đặt `SPRING_DATASOURCE_URL` ở cấp job, khiến Surefire unit tests H2 cũng thấy biến này và cố kết nối PostgreSQL, gây `ApplicationContext failure`.

Giải pháp:

- CI/local dùng `POSTGRES_TEST_URL`, `POSTGRES_TEST_USERNAME`, `POSTGRES_TEST_PASSWORD`.
- Failsafe map các biến này thành `SPRING_DATASOURCE_*` **chỉ cho fork integration tests**.
- Surefire H2 không còn bị ảnh hưởng.

## 17. Files changed

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

## 18. Kết quả kiểm chứng

| Check | Kết quả | Chi tiết |
|---|---|---|
| Backend unit tests | **PASS** | 95 tests |
| PostgreSQL integration tests | **PASS** | 22 tests, 0 failures/errors/skipped |
| Full `verify` | **PASS** | `./mvnw -B -Ppostgres-integration verify` |
| Performance baseline | **PASS** | 200 interactions, combined analytics 22 ms (local) |
| `git diff --check` | **PASS** | Không lỗi whitespace |
| CI PostgreSQL gate | **PASS** | PR #24, run `42261630401`; job `postgres-integration` pass 1m20s |

Chi tiết đầy đủ: [`docs/testing/postgresql-integration-report.md`](../testing/postgresql-integration-report.md) và [`docs/reports/m5-analytics-postgres-integration-report.md`](./m5-analytics-postgres-integration-report.md).

## 19. Rủi ro còn lại

1. Performance baseline chỉ là local, single-run; chưa có tải cao/`EXPLAIN ANALYZE`.
2. Admin Dashboard chưa dùng hai endpoint mới; cần wave frontend riêng cho biểu đồ.
3. Chưa chạy mobile runtime E2E trên thiết bị/emulator.
4. CI phụ thuộc PostgreSQL ephemeral; không fallback H2 cho integration tests.
5. Test-count gate hard-code 22; phải cập nhật khi thêm test.
6. Branch protection cần maintainer bật required check `postgres-integration`.

## 20. Git Delivery Wave 3

- Branch: `feat/m5-analytics-postgres-reliability`
- Base: `origin/main` @ `a1063b3`
- Commit groups:
  1. `test(backend): add PostgreSQL interaction integration coverage`
  2. `feat(backend): add interaction timeseries analytics`
  3. `feat(backend): add interaction language analytics`
  4. `ci(backend): enforce PostgreSQL integration tests`
  5. `docs: document M5 analytics and PostgreSQL verification`
- PR: https://github.com/nahnht27/smart-heritage/pull/24
- Không tự merge; chờ maintainer review/merge.
