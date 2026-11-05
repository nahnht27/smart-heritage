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
