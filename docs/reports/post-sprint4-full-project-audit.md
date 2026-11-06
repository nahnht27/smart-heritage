# Smart Heritage — Full Project Audit (Post Sprint 4)

**Ngày audit:** 2026-11-05  
**Phạm vi:** toàn bộ repository `smart-heritage` (backend, admin web, mobile, infra, CI, docs)  
**Baseline:** `origin/main` @ `b1bf41b` (merge PR #19); local `M1-sprint4-task4-deployment` @ `818095b` — tree giống hệt `origin/main`.  
**Tính chất:** read-only. Không sửa code, không đổi dependency, không commit/push/PR. Thay đổi duy nhất là file báo cáo này.

---

## 1. Executive Summary

| Khu vực | Trạng thái | Nhận định ngắn |
|---|---|---|
| Backend API | **Tốt** | 81/81 test pass; phân quyền, envelope, idempotency, analytics cơ bản hoạt động |
| Admin Web | **Một phần** | Login/CRUD site–artifact–multimedia hoạt động; dashboard tĩnh, 3 module chỉ là placeholder |
| Mobile Visitor | **Một phần, có blocker** | Đọc nội dung công khai hoạt động; login/register hỏng, interaction không được gửi, không có iBeacon |
| Hạ tầng / Deploy | **Khá tốt, có rủi ro** | Compose production hợp lệ, healthcheck, non-root backend; thiếu migration DB, backup chưa tự động |
| Testing / CI | **Một phần** | CI chạy test/build; mobile typecheck/lint fail (advisory); smoke CI chỉ kiểm tra public |
| Bảo mật | **Trung bình** | Không lộ secret thật; thiếu rate limit, CSP/HSTS, refresh/revoke token |

**Kết luận:** Backend/API đủ ổn để tiếp tục phát triển và demo ở tầng API. **Chưa đủ điều kiện coi là hoàn thành phạm vi sản phẩm** vì luồng visitor cốt lõi (iBeacon, ghi interaction, hiển thị multimedia) và một số module admin còn thiếu/hỏng. Trước khi release cần xử lý 5 finding P1 và chạy E2E thủ công trên emulator/browser.

---

## 2. Phạm vi, Phương pháp và Quy ước

### 2.1 Phương pháp
- Đọc code, tài liệu, cấu hình, script; đối chiếu yêu cầu (`docs/requirements/`) với implementation.
- Chạy kiểm chứng thực tế khi môi trường cho phép: test backend (qua Docker vì host không có JDK), lint/build frontend, Jest/tsc/lint mobile, validate Compose, smoke test public.
- Với mỗi finding: nêu bằng chứng `file:line`, kịch bản tái hiện, mức độ, hướng xử lý.
- Không tuyên bố PASS cho phần không chạy được; ghi rõ `NOT VERIFIED`.

### 2.2 Quy ước mức độ
| Mức | Ý nghĩa |
|---|---|
| **P0** | Sự cố bảo mật đang bị khai thác, mất dữ liệu, hoặc sập toàn hệ thống production |
| **P1** | Chức năng cốt lõi hỏng/không dùng được, hoặc rủi ro cao cho dữ liệu production |
| **P2** | Thiếu/sai đáng kể, có workaround, ảnh hưởng trải nghiệm hoặc vận hành |
| **P3** | Nợ kỹ thuật, hygiene, cải thiện không khẩn cấp |

### 2.3 Ràng buộc
- Không chạy thao tác ghi dữ liệu (register, interaction write, CRUD) trên stack dev đang chạy.
- Không chạy `docker compose down -v` vì có thể xóa volume `java-subject_postgres_data` đang tồn tại.
- Không in token/secret/PII trong báo cáo.

---

## 3. Baseline, Môi trường và Trạng thái Git

| Hạng mục | Giá trị |
|---|---|
| Nhánh local | `M1-sprint4-task4-deployment` |
| Local HEAD | `818095b` |
| `origin/main` | `b1bf41b` (merge PR #19) |
| Quan hệ | Local chậm đúng 1 commit merge; `git diff --stat origin/main...HEAD` rỗng ⇒ nội dung làm việc trùng `origin/main` |
| PR đã merge | #17, #18, #19 |
| Untracked (có từ trước) | `mobile/eslint.config.js`, `scripts/integration/__pycache__/` |
| `git diff --check` | Sạch |
| Host | Linux, Node v24.15.0, npm 11.12.1, Python 3.12.3, Docker 29.1.3 |
| Java/Maven trên host | **Không có** (`java`, `javac`, `mvn` đều không tồn tại) |
| Docker Compose | Plugin v2 **không có**; chỉ có legacy `docker-compose` 1.29.2. Audit dùng binary Compose v2 tải tạm vào `/tmp/opencode` |
| Backend test runtime | Container `maven:3.9-eclipse-temurin-17`, H2 in-memory |

**Ghi chú:** legacy `docker-compose` 1.29.2 không đọc được `name:` cấp cao nhất của `docker-compose.production.yml`. Đây là giới hạn công cụ, **không phải lỗi cấu hình**; với Compose v2 file hợp lệ (đã kiểm chứng).

---

## 4. Kết quả Kiểm chứng Thực tế

### 4.1 Tổng hợp
| Check | Lệnh | Kết quả |
|---|---|---|
| Backend tests | `mvn -B test` (container, H2) | **PASS — 81 tests, 0 failure, 0 error, 0 skipped** |
| Frontend lint | `npm run lint` | **PASS — exit 0** |
| Frontend production build | `npm run build` (`tsc -b && vite build`) | **PASS — 46 modules** |
| Mobile Jest | `npx jest --ci --runInBand` | **PASS — 3 suites, 18 tests** |
| Mobile TypeScript | `npx tsc --noEmit` | **FAIL — exit 2, 2 lỗi** |
| Mobile ESLint | `npm run lint` (`expo lint`) | **FAIL — exit 1, 1 error + 5 warnings** |
| Compose dev | `docker-compose.yml config -q` | **PASS**, có warning `version` obsolete |
| Compose production | Compose v2 + `.env.production.example config -q` | **PASS** |
| Public API smoke | `smoke-test.py` trên stack local có sẵn | **17 passed, 0 failed, 8 skipped** |
| Health | `GET /api/health` | **PASS — `status=UP`** |
| GitHub Actions versions | GitHub API tags | **Hợp lệ** (`checkout@v7`, `setup-java@v6`, `setup-node@v7`, `upload-artifact@v7`) |

### 4.2 Lỗi mobile TypeScript (đã tái hiện)
```text
src/components/animated-icon.web.tsx(5,21): error TS2307:
  Cannot find module './animated-icon.module.css' or its corresponding type declarations.
src/constants/theme.ts(6,8): error TS2882:
  Cannot find module or type declarations for side-effect import of '@/global.css'.
```
Nguyên nhân gốc: `mobile/expo-env.d.ts` đang bị gitignore và không tồn tại trong checkout; repo cũng không có khai báo type cho `*.module.css`.

### 4.3 Lỗi mobile ESLint (đã tái hiện)
```text
src/hooks/use-color-scheme.web.ts:11:5
  error  Calling setState synchronously within an effect
         react-hooks/set-state-in-effect
```
Kèm 5 warning `no-unused-vars` ở `artifact_list.tsx`, `home.tsx`, `index.tsx`.

### 4.4 Smoke test
- Chạy trên stack local **đang tồn tại** (`smart-heritage-backend`, `smart-heritage-db` healthy). Audit không khởi động lại, không ghi dữ liệu.
- 17 public check pass; 8 check authenticated/interaction/analytics-admin bị **SKIP** vì không có credentials.
- Hệ quả: CI và lần chạy này **không xác minh** luồng login hợp lệ, ghi interaction, phân quyền VISITOR/ADMIN, analytics có dữ liệu.

### 4.5 Bằng chứng lỗi double `/api` của mobile (kiểm chứng sống)
| Request | Kết quả |
|---|---|
| `POST /api/auth/login` (sai credentials) | `401` + `"Invalid username or password"` |
| `POST /api/api/auth/login` (đúng như mobile đang gọi) | `401` + `"Authentication is required to access this resource"` |

Điều này chứng minh request mobile rơi vào nhánh `anyRequest().authenticated()` chứ không tới `AuthController`.

---

## 5. Kiến trúc và Sức khỏe Repository

### 5.1 Điểm tốt
- Backend Spring Boot 3.2.5 / Java 17, package rõ ràng (`controller`, `service`, `repository`, `dto`, `security`, `exception`).
- Envelope `ApiResponse<T>` thống nhất; `GlobalExceptionHandler` map lỗi validation/404/409/401/403 tương đối đầy đủ.
- Bảo mật cơ bản đúng hướng: stateless JWT, BCrypt, CSRF tắt đúng cho API stateless, public chỉ `GET` nội dung, ghi nội dung yêu cầu ADMIN.
- Frontend không lưu token vào `localStorage`; dùng `sessionStorage`, giảm rủi ro token tồn tại lâu.
- Docker: backend chạy non-root (`UID 10001`); production compose không publish PostgreSQL, có healthcheck và log rotation.
- Có lockfile cho frontend/mobile, Maven wrapper tự tải distribution, tài liệu deployment/testing khá đầy đủ.
- Không phát hiện secret thật trong Git; chỉ có placeholder và dev fallback được ghi chú rõ.

### 5.2 Vấn đề repository hygiene
- **AUDIT-018 (P2):** `mobile/eslint.config.js` là file untracked nhưng cần cho `expo lint`. Clean clone không có file này ⇒ lint không tái lập được; CI hiện chỉ coi mobile lint là advisory.
- **AUDIT-030 (P3):** `scripts/integration/__pycache__/` untracked và `.gitignore` không có `__pycache__/`.
- `docs/reports/` chưa tồn tại trước audit; báo cáo này tạo mới thư mục.

---

## 6. Functional Gaps — Mobile Visitor App

### AUDIT-001 (P1) — Login/Register mobile gọi sai URL do double `/api`
- **Bằng chứng:** `mobile/src/services/api.ts:18-26` đặt base mặc định `http://...:8080/api`; `mobile/src/services/api.ts:49-51` nối thẳng endpoint; `mobile/src/app/index.tsx:106` gọi `'/api/auth/login'`, `:145` gọi `'/api/auth/register'`.
- **Kết quả:** URL thực tế `http://.../api/api/auth/login` → `401 Authentication is required` (đã kiểm chứng sống).
- **Ảnh hưởng:** Không thể đăng nhập/đăng ký trên mobile; kéo theo không thể ghi interaction (API yêu cầu auth).
- **Hướng xử lý:** Bỏ prefix `/api` ở 2 call (`'/auth/login'`, `'/auth/register'`) hoặc đổi base về origin không có `/api`; thêm test cho URL composition.

### AUDIT-003 (P1) — iBeacon/BLE hoàn toàn chưa triển khai
- **Bằng chứng:** `mobile/package.json` không có bất kỳ dependency beacon/BLE/Bluetooth; `mobile/src/app/home.tsx:161-172` hiển thị “iBeacon / BLE: Chưa tích hợp”; không có service quét beacon.
- **Đối chiếu yêu cầu:** `docs/requirements/02_functional_requirements.md` FR-V04, FR-S01–S04; `03_non_functional_requirements.md` NFR-P01, NFR-R01.
- **Ảnh hưởng:** Mất tính năng định danh cốt lõi của sản phẩm (“iBeacon-based smart tourism”).
- **Hướng xử lý:** Tích hợp BLE/iBeacon (Expo dev build + native module), debounce theo vùng phủ, ánh xạ beacon → artifact, ghi interaction `BEACON_TRIGGER`.

### AUDIT-004 (P1) — Interaction không được UI nào gọi
- **Bằng chứng:** `grep` toàn `mobile/src` cho thấy `recordInteraction` chỉ xuất hiện trong `interactionApi.ts` và test; không có screen nào gọi.
- **Ảnh hưởng:** Backend có API + analytics nhưng dữ liệu thực tế gần như rỗng; checklist E2E mục “interaction event được gửi” không thể pass.
- **Hướng xử lý:** Gọi `recordInteraction` khi mở artifact detail (`VIEW`), phát audio (`AUDIO_PLAY`), quét beacon (`SCAN`); sinh `eventId` UUID ổn định cho retry; xử lý lỗi không chặn UI.

### AUDIT-006 (P2) — Ảnh multimedia không hiển thị do so sánh sai hoa/thường
- **Bằng chứng:** `mobile/src/app/artifact_detail.tsx:84` lọc `m.type === 'image'`; `mobile/src/services/heritageApi.ts:99-107` giữ nguyên `m.type`; admin web tạo mặc định `'IMAGE'` (`frontend/src/pages/MultimediaPage.tsx:31-36,374-376`).
- **Ảnh hưởng:** Với dữ liệu chuẩn `IMAGE`, hero image và danh sách ảnh luôn rỗng.
- **Hướng xử lý:** Chuẩn hóa `type.toUpperCase() === 'IMAGE'` ở mobile (hoặc normalize ở backend) và thêm test mapping.

### AUDIT-007 (P2) — Mobile không có ảnh đại diện; không phát AUDIO/VIDEO
- **Bằng chứng:** `mobile/src/services/heritageApi.ts:87-97` luôn gán `imageUrl: null`; `home.tsx:141-145` và `:251` truyền `uri: undefined`; `artifact_list.tsx:105` dùng `art.imageUrl` (luôn null). Không có dependency/component audio/video (`grep` không thấy `expo-av`, player).
- **Ảnh hưởng:** Danh sách/home không có hình; multimedia `AUDIO`/`VIDEO` không dùng được dù checklist yêu cầu phát audio.
- **Hướng xử lý:** Lấy multimedia đầu tiên làm thumbnail; thêm player và trạng thái loading/error.

### AUDIT-008 (P2) — Favorite/History dùng mock data
- **Bằng chứng:** `mobile/src/app/favorite.tsx:4,15-18,43-46` import và render `MOCK_FAVORITES`, `MOCK_VISIT_HISTORY`.
- **Ảnh hưởng:** Người dùng thấy dữ liệu giả; không có API favorite/history ở backend.
- **Hướng xử lý:** Thiết kế API + persistence, hoặc ẩn module cho tới khi có; không hiển thị mock trong build production.

### AUDIT-009 (P2) — Map và Feedback là placeholder
- **Bằng chứng:** `mobile/src/app/map.tsx:6-12` chỉ có text tĩnh; `mobile/src/app/feedback.tsx:16` `alert('Feedback submitted!')` nhưng không gửi gì.
- **Ảnh hưởng:** Hai mục menu không có chức năng; feedback không được lưu.
- **Hướng xử lý:** Nối API/feedback persistence hoặc gắn nhãn “coming soon” rõ ràng.

### AUDIT-025 (P2) — Contract interaction/anonymous chưa được giải quyết
- **Bằng chứng:** `VisitorInteraction` yêu cầu `user_id` non-null (`entity/VisitorInteraction.java:24-26`); API yêu cầu auth (`SecurityConfig.java:54`); trong khi contract đề xuất `visitorId`, `userId` có thể null (`docs/requirements/visitor-interaction-data-contract.md:13-14,99-101`). Backend cũng không lưu `beaconId`, `visitorId`, `beaconMinor`.
- **Ảnh hưởng:** Không hỗ trợ khách vãng lai; analytics “unique visitor” đang đếm theo user đăng nhập, không theo visitorId.
- **Hướng xử lý:** Chốt contract (anonymous hay bắt buộc login), bổ sung cột nếu cần, cập nhật tài liệu và test.

---

## 7. Functional Gaps — Admin Web

### AUDIT-002 (P1) — JWT decode sai claim ⇒ mất phiên/crash sau khi refresh
- **Bằng chứng:**
  - Backend chỉ phát `sub` (username) và `role`: `backend/.../security/JwtTokenProvider.java:24-28`.
  - Frontend decode và đọc `userId`, `username`, `email`, `preferredLanguageId`: `frontend/src/services/authService.ts:106-127`.
  - `Header` gọi `user.username.charAt(0)`: `frontend/src/components/layout/Header.tsx:55`.
  - `ProtectedRoute` chỉ chặn nếu `user.role` không phải ADMIN: `frontend/src/App.tsx:21`; token được giữ trong `sessionStorage` (`authStorage.ts:12-29`).
- **Kịch bản:** Login thành công (user lấy từ response) → refresh tab → `getCurrentUser()` decode token. Nếu `atob` chạy được, `role` có nhưng `username` undefined ⇒ `Header` throw `TypeError`; nếu payload base64url có ký tự `-`/`_` khiến `atob` throw ⇒ `user = null` ⇒ bị đẩy về `/login`. Cả hai đều làm phiên admin không bền.
- **Hướng xử lý:** Không suy ra user từ JWT; lưu user response hoặc gọi `GET /api/users/me` khi khởi động. Nếu vẫn decode, dùng base64url decode + kiểm tra `exp`, và chỉ đọc claim backend thực phát.

### AUDIT-010 (P2) — Dashboard admin là dữ liệu tĩnh
- **Bằng chứng:** `frontend/src/pages/DashboardPage.tsx:37-62` hard-code `—`/“No data available”; không gọi `/api/analytics/interactions/summary`.
- **Ảnh hưởng:** Admin không thấy analytics dù backend đã có; checklist E2E “số liệu dashboard khớp API” không thể pass.
- **Hướng xử lý:** Gọi analytics API, hiển thị total interactions/unique visitors/popular artifacts, xử lý 401/403 và empty state.

### AUDIT-011 (P2) — Beacons/Translations/Feedback chỉ là placeholder, backend cũng chưa có
- **Bằng chứng:** `frontend/src/config/navigation.ts:29-43` khai báo 3 mục; `App.tsx:41-51` render `PlaceholderPage`. Backend chỉ có 7 controller (`Auth`, `User`, `HeritageSite`, `Artifact`, `Multimedia`, `VisitorInteraction`, `Health`), không có entity/controller cho beacon, feedback, translation.
- **Đối chiếu yêu cầu:** FR-A04/A05 (quản lý beacon), scope quản lý feedback/analytics.
- **Hướng xử lý:** Ưu tiên beacon management (gắn với iBeacon); feedback/translation lên roadmap rõ ràng hoặc ẩn khỏi nav.

### AUDIT-012 (P2) — Logout ở Sidebar không xóa token; token cũ còn khi login bị từ chối
- **Bằng chứng:** `frontend/src/components/layout/Sidebar.tsx:107-109` chỉ `navigate('/login')`, không gọi `logout()`. `LoginPage.tsx:54-70`: `login()` đã lưu token trước khi kiểm tra role; nếu role không phải ADMIN, hàm return mà không xóa token.
- **Ảnh hưởng:** Người dùng tưởng đã logout nhưng token vẫn trong `sessionStorage`; reload có thể vào lại (nếu role hợp lệ) hoặc để lại trạng thái bẩn.
- **Hướng xử lý:** Sidebar dùng `useAuth().logout()`; chỉ persist token sau khi kiểm tra role/`setAuth`, hoặc xóa token trong nhánh từ chối.

### AUDIT-013 (P2) — Không xử lý 401/token hết hạn toàn cục; không có refresh/revoke
- **Bằng chứng:** `frontend/src/services/apiClient.ts:66-72` chỉ throw `ApiError`; không redirect/clear token. `isAuthenticated()` chỉ kiểm tra tồn tại token (`authService.ts:98-100`), không kiểm tra `exp`.
- **Ảnh hưởng:** Token 24h hết hạn giữa phiên ⇒ thao tác lỗi rải rác; người dùng phải tự đăng nhập lại; không có cơ chế thu hồi token.
- **Hướng xử lý:** Interceptor 401 → clear + redirect; thêm refresh token hoặc access token ngắn hạn; kiểm tra `exp` khi bootstrap.

---

## 8. Backend — Correctness và Data Integrity

### AUDIT-005 (P1) — `ddl-auto: update` và không có migration
- **Bằng chứng:** `backend/src/main/resources/application.yml:14-16` đặt `ddl-auto: update`; không tồn tại Flyway/Liquibase (không có dependency, không có thư mục migration). Production compose không override (`docker-compose.production.yml:46-52`).
- **Ảnh hưởng:** Schema production tự thay đổi ngoài kiểm soát; khó rollback, dễ drift giữa môi trường; rủi ro mất/khó tương thích dữ liệu khi entity đổi.
- **Hướng xử lý:** Thêm Flyway/Liquibase, baseline schema hiện tại; đặt `ddl-auto: validate` ở production; migration chạy có kiểm soát trong pipeline.

### Điểm tốt đã xác minh
- 81/81 test pass, gồm controller/service/security/exception.
- Idempotency `eventId` tuần tự hoạt động (trả 200 + cùng `interactionId`).
- Concurrent duplicate được DB unique constraint chặn; `GlobalExceptionHandler` map `DataIntegrityViolationException` → 409 (`GlobalExceptionHandler.java:68-80`).
- Duration được tính khi có `endedAt` (`VisitorInteraction.java:114-118`), service set `startedAt` trước `endedAt` (`VisitorInteractionService.java:97-98`).
- Analytics có giới hạn range 90 ngày và yêu cầu ADMIN (`VisitorInteractionController.java:23,47-68`).
- Public GET cho site/artifact/multimedia đúng contract; write vẫn bảo vệ (`SecurityConfig.java:45-55`).

### AUDIT-014 (P2) — Không có pagination
- **Bằng chứng:** `HeritageSiteController.java:27-30`, `ArtifactController.java:26-30`, `MultimediaController.java:26-30` trả `List` toàn bộ; không có `Pageable`.
- **Ảnh hưởng:** Khi dữ liệu tăng (yêu cầu NFR hàng nghìn artifact), response lớn, chậm, tốn bộ nhớ.
- **Hướng xử lý:** Thêm `page/size/sort`, trả metadata; giữ tương thích với client hiện tại.

### AUDIT-026 (P3) — Concurrent duplicate trả 409 thay vì 200 idempotent
- **Bằng chứng:** `VisitorInteractionService.java:53-61` find-then-save; request thua race nhận `DataIntegrityViolationException` → 409, không trả record hiện có.
- **Ảnh hưởng:** Client retry có thể thấy 409 dù event đã được ghi; không sai dữ liệu nhưng không nhất quán idempotency.
- **Hướng xử lý:** Bắt constraint violation rồi `findByEventId` và trả 200 nếu cùng user.

### AUDIT-027 (P3) — Chưa validate quan hệ thời gian của `interactedAt`
- **Bằng chứng:** `VisitorInteractionService.java:104-109` chỉ kiểm tra `endedAt >= startedAt`.
- **Ảnh hưởng:** Có thể ghi event với `interactedAt` ngoài khoảng, làm sai analytics theo kỳ.
- **Hướng xử lý:** Validate `startedAt <= interactedAt <= endedAt` (nếu có) và chặn thời gian tương lai bất thường.

---

## 9. Security và Secrets

### Điểm tốt
- Không có secret thật trong Git; `.env.production.example` chỉ chứa `CHANGE_ME`.
- Production compose bắt buộc `POSTGRES_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` (`docker-compose.production.yml:20-22,47-52`).
- Backend dùng BCrypt (`SecurityConfig.java:80-81`), JWT stateless, không lưu session server.
- Backend container chạy user không đặc quyền (`backend/Dockerfile:26-37`).
- Admin web dùng `sessionStorage`, không phải `localStorage` (`frontend/src/services/authStorage.ts:8-12`).
- Nginx tắt `server_tokens`, có `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (`frontend/nginx/default.conf:8,14-16`).

### AUDIT-015 (P2) — Không có rate limit/lockout cho đăng nhập
- **Bằng chứng:** Không có dependency/throttling trong backend; `AuthController` gọi thẳng `AuthService.login`.
- **Ảnh hưởng:** Brute force mật khẩu; registration công khai có thể bị spam.
- **Hướng xử lý:** Rate limit theo IP/username, lockout tạm thời, CAPTCHA hoặc delay tăng dần.

### AUDIT-017 (P2) — `show-sql` bật và `open-in-view` mặc định ở mọi môi trường
- **Bằng chứng:** `application.yml:17` `show-sql: true`; không có profile production override; log cảnh báo `spring.jpa.open-in-view is enabled by default` trong test.
- **Ảnh hưởng:** Log production nhiều, có thể lộ dữ liệu/không hiệu quả; open-in-view giữ connection lâu hơn cần thiết.
- **Hướng xử lý:** Tắt `show-sql`/`format_sql` ở production; đặt `open-in-view: false`; cấu hình theo profile.

### AUDIT-023 (P2) — Thiếu CSP/HSTS; frontend container chạy root
- **Bằng chứng:** `frontend/nginx/default.conf` không có `Content-Security-Policy`/`Strict-Transport-Security`; `frontend/Dockerfile:20` dùng `nginx:1.27-alpine` mặc định (master process root).
- **Ảnh hưởng:** XSS khó bị chặn hơn; container compromise có quyền cao hơn cần thiết. HSTS phụ thuộc TLS proxy bên ngoài (đã ghi chú trong docs).
- **Hướng xử lý:** Thêm CSP phù hợp (không dùng inline script), HSTS ở TLS proxy; chạy nginx unprivileged hoặc giảm capability.

### AUDIT-035 (P3) — Dev secret fallback có thể bị dùng nhầm ngoài dev
- **Bằng chứng:** `application.yml:29-32` và `docker-compose.yml:35` có fallback secret cố định; tài liệu ghi rõ chỉ dùng dev.
- **Ảnh hưởng:** Nếu chạy backend trực tiếp ở production mà quên `JWT_SECRET`, hệ thống vẫn khởi động với secret công khai.
- **Hướng xử lý:** Fail-fast khi `JWT_SECRET` không được set ngoài profile dev; thêm kiểm tra startup.

---

## 10. Testing và CI/CD

### AUDIT-018 (P2) — Mobile typecheck/lint fail trên clean checkout
- Đã tái hiện: `tsc` exit 2, ESLint exit 1 (mục 4.2/4.3).
- `mobile/eslint.config.js` untracked; `expo-env.d.ts` bị gitignore.
- CI đánh dấu job này `continue-on-error: true` (`.github/workflows/ci.yml:119-148`), nên lỗi không chặn merge.
- **Hướng xử lý:** Commit cấu hình ESLint và khai báo type CSS (`*.module.css`, side-effect CSS) hoặc dùng `expo customize` để sinh `expo-env.d.ts` ổn định; chuyển tsc/lint thành required sau khi xanh.

### AUDIT-019 (P2) — Admin web không có unit/integration test
- **Bằng chứng:** `frontend/package.json` không có script `test`; CI chỉ chạy lint + build.
- **Ảnh hưởng:** Các lỗi logic như AUDIT-002/AUDIT-012 không bị phát hiện.
- **Hướng xử lý:** Thêm Vitest/RTL cho auth, ProtectedRoute, CRUD pages; ưu tiên auth storage/JWT handling.

### AUDIT-020 (P2) — CI không kiểm tra luồng authenticated/interaction
- **Bằng chứng:** `ci.yml:187-190` chạy smoke không credentials → chỉ 17 public check; các check VISITOR/ADMIN/interaction bị skip.
- **Ảnh hưởng:** Regression ở login hợp lệ, phân quyền, ghi interaction, analytics có thể lọt qua CI.
- **Hướng xử lý:** Seed user/artifact trong CI (ephemeral), chạy smoke với `ENABLE_INTERACTION_WRITE=true`; dùng DB tạm và teardown.

### AUDIT-021 (P2) — Mobile test mock tầng API nên không bắt lỗi URL
- **Bằng chứng:** `mobile/src/services/__tests__/*.test.ts` mock `apiClient`/`fetch`; không có test cho `API_BASE_URL` + endpoint composition.
- **Ảnh hưởng:** Lỗi double `/api` (AUDIT-001) vẫn pass toàn bộ 18 test.
- **Hướng xử lý:** Thêm test cho URL builder và một smoke test gọi backend thật (tùy môi trường).

### Điểm tốt
- CI có 5 job: backend test, frontend lint/build, mobile Jest, mobile static analysis (advisory), docker build, integration smoke.
- Actions dùng phiên bản major hợp lệ (đã đối chiếu GitHub API).
- Backend build image chạy `mvn package` (bao gồm test) — `backend/Dockerfile:14`.
- Có tài liệu test strategy, baseline, báo cáo Sprint 4 và checklist E2E.

### AUDIT-024 (P2) — Tài liệu mô tả “READY” chưa phản ánh đầy đủ gap
- **Bằng chứng:** `docs/testing/sprint-4-integration-test-report.md:301-304` kết luận Backend/API/Frontend READY, Mobile/Admin UI PENDING; nhưng cùng lúc dashboard tĩnh, 3 module admin placeholder, iBeacon/interaction chưa nối, và mobile auth hỏng.
- **Ảnh hưởng:** Stakeholder có thể hiểu nhầm mức hoàn thiện.
- **Hướng xử lý:** Cập nhật báo cáo theo ma trận “requirement → status”, phân biệt rõ “API ready” và “product feature ready”.

---

## 11. Deployment và Vận hành

### Điểm tốt
- `docker-compose.production.yml` tách project name, DB chỉ trong network nội bộ, không publish 5432, backend/frontend có healthcheck, restart policy, log rotation (`:13-99`).
- Frontend Nginx proxy `/api/` tới backend nội bộ, SPA fallback đúng (`frontend/nginx/default.conf:27-51`).
- Health endpoint nhẹ (`/api/health`), backend Dockerfile có `HEALTHCHECK`.
- Có script backup/restore PostgreSQL (`scripts/deployment/backup-postgres.sh`, `restore-postgres.sh`) và tài liệu.
- `.env.production.example` hướng dẫn tạo secret mạnh, bind loopback mặc định.

### AUDIT-022 (P2) — Backup chưa được tự động hóa
- **Bằng chứng:** Chỉ có script thủ công; compose không có service cron/backup; tài liệu mô tả quy trình chạy tay.
- **Ảnh hưởng:** RTO/RPO phụ thuộc người vận hành; dễ quên backup.
- **Hướng xử lý:** Cron/systemd timer hoặc sidecar; retention policy; định kỳ diễn tập restore.

### AUDIT-029 (P3) — `version: "3.8"` obsolete trong dev compose
- **Bằng chứng:** `docker-compose.yml:1`; Compose v2 cảnh báo “the attribute `version` is obsolete”.
- **Hướng xử lý:** Xóa dòng `version`.

### AUDIT-034 (P3) — Không đặt resource limits/requests
- **Bằng chứng:** Production compose không có `deploy.resources`/`mem_limit`/`cpus`.
- **Ảnh hưởng:** Một container có thể chiếm tài nguyên host; khó dự báo dung lượng.
- **Hướng xử lý:** Đặt limit phù hợp cho postgres/backend/frontend.

### AUDIT-033 (P3) — Thiếu logging/metrics tập trung
- **Bằng chứng:** Chỉ log JSON file với rotation; không có Prometheus/OTel/health metrics.
- **Ảnh hưởng:** Khó điều tra sự cố, không có cảnh báo chủ động.
- **Hướng xử lý:** Thêm actuator metrics hoặc OTel, log aggregation, alert cơ bản.

### AUDIT-032 (P3) — Không có API versioning
- **Bằng chứng:** Toàn bộ endpoint dưới `/api/...`, không có `/api/v1`.
- **Ảnh hưởng:** Khó tiến hóa contract khi mobile/admin lệch phiên bản.
- **Hướng xử lý:** Version hóa hoặc duy trì compatibility policy rõ ràng.

---

## 12. Nợ Kỹ thuật, Unverified và Thứ tự Ưu tiên

### 12.1 Nợ kỹ thuật/hygiene khác
- **AUDIT-028 (P3):** Branding mobile còn `app_temp`/`apptemp` (`mobile/app.json:3-8`, `mobile/package.json:2`).
- **AUDIT-031 (P3):** Thông báo lỗi backend trộn tiếng Việt/Anh (ví dụ `GlobalExceptionHandler.java:77`).
- Không có seed ADMIN: đăng ký chỉ tạo VISITOR (`AuthService.register`), admin phải cấp role thủ công bằng SQL — rủi ro vận hành khi deploy mới (**AUDIT-016, P2**).
- Không có soft-delete/audit trail cho thao tác admin (P3).
- Không có `spring.jpa.open-in-view: false` (đã gộp vào AUDIT-017).

### 12.2 NOT VERIFIED (không đủ môi trường/không được phép chạy)
| Hạng mục | Lý do |
|---|---|
| Mobile UI E2E trên emulator/thiết bị | Không có Android Emulator/iOS Simulator |
| Admin Web UI E2E trên browser | Không chạy browser tương tác |
| Authenticated smoke (VISITOR/ADMIN/interaction/analytics) | Không có credentials; không ghi dữ liệu vào stack dev |
| Backup/restore drill | Không chạy thao tác restore để tránh ảnh hưởng dữ liệu |
| HTTPS/TLS, external reverse proxy, HSTS | Phụ thuộc môi trường deploy thật |
| Multi-instance/HA, load test | Ngoài phạm vi môi trường |
| iBeacon hardware detection | Không có thiết bị BLE |
| Hành vi mạng thật trên thiết bị (`10.0.2.2`, LAN IP) | Không có thiết bị |
| Production deploy thực tế | Chỉ validate cấu hình, không deploy |

### 12.3 Bảng ưu tiên

| Priority | Finding | Module | Impact | Recommended action |
|---|---|---|---|---|
| P1 | AUDIT-001 | Mobile | Login/register gọi `/api/api/...` → 401, không đăng nhập được | Sửa endpoint auth hoặc base URL; thêm test URL |
| P1 | AUDIT-002 | Admin Web | Refresh tab làm mất phiên/crash do decode JWT sai claim | Lưu user từ response hoặc gọi `/users/me`; decode base64url + exp |
| P1 | AUDIT-003 | Mobile | Không có iBeacon/BLE — mất tính năng cốt lõi | Tích hợp BLE/iBeacon + dev build, debounce, mapping beacon→artifact |
| P1 | AUDIT-004 | Mobile | Interaction không được gửi từ UI | Gọi `recordInteraction` ở view/audio/scan; UUID retry |
| P1 | AUDIT-005 | Backend/DB | `ddl-auto: update`, không migration — rủi ro schema production | Thêm Flyway/Liquibase, `validate` ở prod |
| P2 | AUDIT-006 | Mobile | Ảnh không hiển thị do `'image'` vs `'IMAGE'` | So sánh case-insensitive/normalize backend |
| P2 | AUDIT-007 | Mobile | Không có thumbnail; không phát AUDIO/VIDEO | Lấy multimedia thumbnail; thêm player |
| P2 | AUDIT-008 | Mobile | Favorite/History là mock | API + persistence hoặc ẩn module |
| P2 | AUDIT-009 | Mobile | Map/Feedback placeholder, feedback không lưu | Nối API hoặc gắn nhãn rõ |
| P2 | AUDIT-010 | Admin Web | Dashboard tĩnh, không dùng analytics API | Gọi summary API, hiển thị số liệu/empty state |
| P2 | AUDIT-011 | Admin/Backend | Beacons/Translations/Feedback chỉ placeholder | Ưu tiên beacon management; roadmap module còn lại |
| P2 | AUDIT-012 | Admin Web | Sidebar logout không xóa token; token cũ khi role bị từ chối | Dùng `logout()`; chỉ lưu token sau khi hợp lệ |
| P2 | AUDIT-013 | Admin Web | Không xử lý 401/exp; không refresh/revoke token | Interceptor 401; refresh/access token ngắn hạn |
| P2 | AUDIT-014 | Backend | List endpoint không pagination | Thêm page/size/sort + metadata |
| P2 | AUDIT-015 | Backend | Không rate limit/lockout đăng nhập | Throttling, lockout, giám sát |
| P2 | AUDIT-016 | Ops | Không có seed/bootstrap ADMIN | Seed idempotent hoặc CLI cấp role |
| P2 | AUDIT-017 | Backend | `show-sql` + open-in-view ở production | Tắt theo profile; `open-in-view: false` |
| P2 | AUDIT-018 | Mobile/CI | tsc/lint fail, ESLint config untracked | Commit config + type declarations; required gate |
| P2 | AUDIT-019 | Admin Web | Không có test | Vitest/RTL cho auth và CRUD |
| P2 | AUDIT-020 | CI | Smoke CI chỉ public, bỏ qua auth/interaction | Seed ephemeral + chạy full smoke |
| P2 | AUDIT-021 | Mobile | Test mock API không bắt lỗi URL | Test URL builder + integration smoke |
| P2 | AUDIT-022 | Ops | Backup thủ công | Cron/timer + retention + restore drill |
| P2 | AUDIT-023 | Security | Thiếu CSP/HSTS; nginx root | Thêm CSP/HSTS; nginx unprivileged |
| P2 | AUDIT-024 | Docs | Báo cáo “READY” chưa phản ánh gap | Ma trận requirement → status |
| P2 | AUDIT-025 | Backend/Contract | Anonymous/visitorId/beaconId chưa chốt | Chốt contract, schema, analytics |
| P3 | AUDIT-026 | Backend | Concurrent duplicate trả 409 thay vì 200 | Catch constraint → trả record hiện có |
| P3 | AUDIT-027 | Backend | `interactedAt` chưa validate khoảng | Validate thời gian |
| P3 | AUDIT-028 | Mobile | Branding `app_temp` | Đổi name/slug/scheme |
| P3 | AUDIT-029 | Infra | `version` obsolete | Xóa khỏi compose dev |
| P3 | AUDIT-030 | Repo | `__pycache__` không ignore | Thêm `.gitignore` |
| P3 | AUDIT-031 | Backend | Lỗi trộn ngôn ngữ | Thống nhất i18n |
| P3 | AUDIT-032 | Backend | Không API versioning | Version hoặc compatibility policy |
| P3 | AUDIT-033 | Ops | Thiếu metrics/log tập trung | OTel/Prometheus + alert |
| P3 | AUDIT-034 | Infra | Không resource limits | Đặt limit/request |
| P3 | AUDIT-035 | Security | Dev JWT fallback có thể dùng nhầm prod | Fail-fast ngoài profile dev |

### 12.4 Thứ tự xử lý đề xuất
1. **Tuần 1 — Unblock visitor:** AUDIT-001, AUDIT-004, AUDIT-006, AUDIT-007.
2. **Tuần 1 — Ổn định admin:** AUDIT-002, AUDIT-012, AUDIT-013.
3. **Tuần 2 — An toàn dữ liệu production:** AUDIT-005 (migrations), AUDIT-017, AUDIT-035.
4. **Tuần 2–3 — Hoàn thiện phạm vi:** AUDIT-003 (iBeacon), AUDIT-010, AUDIT-011.
5. **Tuần 3 — Chất lượng & vận hành:** AUDIT-014 đến AUDIT-023.
6. **Sau đó — Nợ kỹ thuật P3:** AUDIT-026 đến AUDIT-035.

---

## 13. Wave 3 Remediation Addendum (2026-11-06)

Addendum này ghi lại các finding đã được xử lý sau thời điểm audit gốc; nội dung audit phía trên giữ nguyên tính lịch sử.

| Finding | Trạng thái | Thay đổi chính |
|---|---|---|
| AUDIT-004 (P1) | **Đã xử lý** | Mobile ghi `VIEW` thật khi màn hình chi tiết hiện vật tải thành công (`mobile/src/app/artifact_detail.tsx`), mỗi lượt xem một `eventId` UUID; lỗi ghi không chặn nội dung. |
| AUDIT-005 (P1) | **Đã xử lý** | Thêm Flyway `V1` baseline + `V2` anonymous/visitor; `ddl-auto: validate`; integration test chạy trên PostgreSQL 16 cho cả DB trống và DB cũ được baseline. |
| AUDIT-010 (P2) | **Đã xử lý** | Admin Dashboard gọi `/api/analytics/interactions/summary`, có chọn kỳ báo cáo, loading/error/empty state và chống request trùng trong StrictMode. |
| AUDIT-025 (P2) | **Đã xử lý** | `visitor_id` bắt buộc, `user_id` nullable; identity ẩn danh dùng `visitorId`, identity đăng nhập lấy từ principal; bỏ qua `userId` do client gửi; analytics đếm `distinct visitor_id`. |
| AUDIT-018 (P2) | **Một phần** | Frontend lint/build nay là gate CI và pass; mobile tsc/lint vẫn còn nợ cũ và tiếp tục advisory. |

Kiểm chứng lại ngày 2026-11-06:

- Backend H2: **90 tests, 0 failure, 0 error, 3 skipped** (3 test PostgreSQL được skip khi không có `SPRING_DATASOURCE_URL`).
- PostgreSQL integration: **3/3 pass** trên DB trống và trên schema hiện có được baseline ở V1.
- Frontend: **38 tests pass**, lint pass, production build pass.
- Mobile: **54 tests pass**; `tsc`/ESLint vẫn còn lỗi nền cũ (2 lỗi tsc, 1 lỗi ESLint) như audit gốc.

---

## Phụ lục — Lệnh tái chạy audit

```bash
# Backend tests (host không có JDK)
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/backend":/workspace -v "$HOME/.m2":/tmp/.m2 \
  -w /workspace maven:3.9-eclipse-temurin-17 \
  mvn -B -Dmaven.repo.local=/tmp/.m2 test

# Frontend
(cd frontend && npm run lint && npm run build)

# Mobile
(cd mobile && npx jest --ci --runInBand && npx tsc --noEmit && npm run lint)

# Compose (cần Compose v2)
docker compose -f docker-compose.yml config -q
docker compose -f docker-compose.production.yml \
  --env-file .env.production.example config -q

# Public smoke (không ghi dữ liệu)
API_BASE_URL=http://localhost:8080/api python3 scripts/integration/smoke-test.py
```

**Không chạy** `docker compose down -v` trên stack dev hiện có nếu chưa xác nhận volume không chứa dữ liệu cần giữ.
