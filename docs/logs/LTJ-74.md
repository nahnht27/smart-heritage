# Log: Branch LTJ-74

## Thông tin chung

- **Branch:** `LTJ-74`
- **Task:** S6-M4-02 — Admin Management Workflows Acceptance
- **Sprint:** M4 — Sprint 6 (Final Integration, Acceptance & Release)
- **Mục tiêu:** Xác minh các Admin CRUD workflow ở tầng UI/request contract: Beacon, HeritageSite, Artifact, Multimedia, auth/session và xử lý lỗi HTTP.
- **Cập nhật audit:** Đã merge `origin/main` (`5989871`) vào branch bằng merge commit `5f16192`.

---

## Phạm vi và cách kiểm chứng

Các test trong log này là **component/request-behavior tests**: `frontend/src/services/apiClient.ts` và `beaconService.ts` được mock, nên test xác minh:

- UI render, filter, validation và trạng thái loading/error.
- Đúng method, URL và JSON payload của từng request CRUD.
- Refresh danh sách sau create/update/delete thành công.
- Hiển thị lỗi HTTP/network và retry mà không làm hỏng form.

Các test này **không phải** full-stack E2E: không chạy backend/MySQL thật, không đăng nhập bằng browser thật và không xác minh dữ liệu tồn tại sau reload. Live-backend/browser acceptance vẫn là bước riêng của M5.

---

## Kết quả kiểm thử tự động

### Full frontend suite — 128/128 passed

```
Test Files  15 passed (15)
     Tests  128 passed (128)
  Duration  10.84s
```

Lệnh đã chạy:

```bash
cd frontend
npm test -- --run
npx tsc -b
npm run lint
npm run build
```

- `npx tsc -b` → **0 errors**
- `npm run lint` → **0 errors**
- `npm run build` → **thành công** (Vite production build)
- `git diff --check` → **sạch**

Ghi chú: jsdom in cảnh báo không fail `Not implemented: navigation to another Document` trong full suite; không có test nào thất bại.

### BeaconsPage — 22 tests

Giữ nguyên bộ test hiện có, bao gồm render/filter, CRUD, artifact mapping và các nhánh lỗi 400/401/403/404/409/network. Đây là page có coverage sâu nhất và không cần thêm test trùng lặp.

### HeritageSitesPage — 9 tests

| Nhóm | Test case | Kết quả |
|------|-----------|---------|
| Filter | Lọc theo tên đúng backend contract | ✅ |
| Filter | No-match state và clear search | ✅ |
| Pagination | Tương thích `PageResponse` của M2 | ✅ |
| CRUD | Create đúng POST payload + refresh | ✅ |
| CRUD | Edit đúng PUT path/body + refresh | ✅ |
| CRUD | Delete: cancel không gọi API, confirm mới xóa + refresh | ✅ |
| Validation | Chặn tên/tọa độ không hợp lệ trước khi gọi API | ✅ |
| Error | Lỗi validation từ server giữ form mở, không reload | ✅ |
| Error | Network error khi load + retry thành công | ✅ |

### ArtifactsPage — 12 tests

| Nhóm | Test case | Kết quả |
|------|-----------|---------|
| Filter | Dropdown Heritage Site thay cho nhập ID | ✅ |
| Filter | Gửi `siteId` khi chọn site và bỏ khi chọn “All” | ✅ |
| Pagination | Search + `PageResponse` của M2 | ✅ |
| CRUD | Create với Heritage Site hợp lệ + refresh | ✅ |
| CRUD | Edit quan hệ artifact–site đúng PUT path/body | ✅ |
| CRUD | Delete: cancel/confirm + refresh | ✅ |
| Validation | Chặn create khi chưa chọn Heritage Site hợp lệ | ✅ |
| State | Disable create khi danh sách Heritage Site không tải được | ✅ |
| Error | HTTP 400/409 khi save hiển thị trong form đang mở | ✅ |
| Error | HTTP 409 khi delete hiển thị lỗi, không đổi list count | ✅ |
| Error | Network error khi load + retry thành công | ✅ |

### MultimediaPage — 13 tests

| Nhóm | Test case | Kết quả |
|------|-----------|---------|
| Security | Chỉ render `http(s)` URL thành link, scheme khác thành text | ✅ |
| Security | Reject `javascript:` và `ftp:` trước khi gọi API | ✅ |
| Create | Submit HTTPS URL hợp lệ | ✅ |
| CRUD | Create + refresh, title whitespace được chuẩn hóa thành `null` | ✅ |
| CRUD | Edit đúng PUT path/body và đổi artifact relationship | ✅ |
| CRUD | Delete: cancel/confirm + refresh | ✅ |
| Filter | Gửi `artifactId` query và lọc media type phía client | ✅ |
| Validation | Chặn create khi chưa chọn artifact | ✅ |
| State | Disable create khi Artifact API không trả option nào | ✅ |
| Error | HTTP 400/409 khi save hiển thị trong form đang mở | ✅ |
| Error | Network error khi load + retry thành công | ✅ |

### Auth/session coverage hiện có

Không thêm test auth trùng lặp trong từng page. Coverage toàn cục nằm ở:

- `frontend/src/__tests__/App.test.tsx` — route protection/redirect.
- `frontend/src/context/__tests__/AuthContext.test.tsx` — session lifecycle.
- `frontend/src/pages/__tests__/LoginPage.test.tsx` — login/logout flow.
- `frontend/src/services/__tests__/apiClient.test.ts` — 401/session handling.

---

## Acceptance Criteria — Trạng thái

### Auth & Route Protection
- [x] Login ADMIN và route protection được kiểm chứng bằng automated tests với API mock.
- [x] Logout xóa session và redirect `/login` được kiểm chứng ở `AuthContext`/`LoginPage` tests.
- [ ] Xác nhận lại bằng browser thật với backend đang chạy — **chưa thực hiện trong audit này**.

### Beacon CRUD
- [x] List/filter/render theo `/api/admin/beacons` được kiểm chứng bằng 22 component tests.
- [x] Create/edit/delete được kiểm chứng ở mức UI + request contract.
- [x] Conflict 409 và artifact mapping guard được kiểm chứng bằng automated tests.
- [ ] Live CRUD với MySQL thật — **chưa thực hiện trong audit này**.

### HeritageSite, Artifact, Multimedia CRUD
- [x] List, filter, pagination và empty/error states được kiểm chứng.
- [x] Create/edit/delete được kiểm chứng ở mức UI + request payload.
- [x] Validation phía client, lỗi 400/409 và network retry được kiểm chứng.
- [x] Multimedia chỉ chấp nhận `http://` và `https://`.
- [ ] Live CRUD và kiểm tra dữ liệu sau reload — **chưa thực hiện trong audit này**.

### Error Handling
- [x] 400 → validation/error message, form không crash.
- [x] 401 → xử lý session toàn cục (existing global tests).
- [x] 403 → permission error, không logout (BeaconsPage tests).
- [x] 404/409 → thông báo lỗi rõ ràng.
- [x] Network error → thông báo + retry.

---

## Điểm đáng chú ý

- **403 không logout:** `BeaconsPage.tsx` chỉ set `formError`/`setError`, không gọi `logout()`. Được bảo vệ bởi automated test.
- **Artifact mapping guard:** mapping hiện tại không bị xóa khi `/api/artifacts` chưa tải xong.
- **Beacon list không paginate:** `getAllBeacons()` gọi `/api/admin/beacons` và nhận flat array theo backend contract hiện tại.
- **Search/filter:** HeritageSite và Artifact filter phía server; Multimedia type filter phía client.
- **Artifact delete 409:** page hiển thị lỗi và giữ nguyên `totalElements`; bảng đang bị ẩn bởi error state cho đến khi retry. Test phản ánh đúng hành vi hiện tại, không tuyên bố row vẫn nhìn thấy.

---

## Các file liên quan

| File | Vai trò |
|------|---------|
| `frontend/src/pages/BeaconsPage.tsx` | Beacon Management UI |
| `frontend/src/services/beaconService.ts` | CRUD API calls (`/api/admin/beacons`) |
| `frontend/src/pages/__tests__/BeaconsPage.test.tsx` | 22 component tests |
| `frontend/src/pages/HeritageSitesPage.tsx` | HeritageSite Management |
| `frontend/src/pages/__tests__/HeritageSitesPage.test.tsx` | 9 component/request tests |
| `frontend/src/pages/ArtifactsPage.tsx` | Artifact Management |
| `frontend/src/pages/__tests__/ArtifactsPage.test.tsx` | 12 component/request tests |
| `frontend/src/pages/MultimediaPage.tsx` | Multimedia Management |
| `frontend/src/pages/__tests__/MultimediaPage.test.tsx` | 13 component/request tests |
| `frontend/src/pages/LoginPage.tsx` | Auth / Login |
| `frontend/src/context/AuthContext.tsx` | Session management |

---

## Kết quả đạt được

- **128/128 frontend tests passed**; TypeScript, lint và production build sạch.
- CRUD/validation/error behavior của bốn Admin page đã có automated evidence ở mức component + request contract.
- Không còn tuyên bố “end-to-end với backend thật” trong log này khi chưa có bằng chứng tương ứng.
- Điều kiện còn lại trước khi coi S6-M4-02 là live acceptance: chạy browser/backend thật và kiểm tra persistence sau reload (thuộc M5).
