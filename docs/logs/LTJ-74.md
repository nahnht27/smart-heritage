# Log: Branch LTJ-74

## Thông tin chung

- **Branch:** `LTJ-74`
- **Task:** S6-M4-02 — Admin Management Workflows Acceptance
- **Sprint:** M4 — Sprint 6 (Final Integration, Acceptance & Release)
- **Mục tiêu chính:** Xác minh các Admin CRUD workflows hoạt động end-to-end với backend tích hợp thực tế: Beacon, HeritageSite, Artifact, Multimedia, auth/session và xử lý lỗi HTTP.

---

## Kết quả kiểm thử tự động

### Full test suite — 104/104 passed

```
Test Files  15 passed (15)
     Tests  104 passed (104)
  Duration  19.09s
```

- `npx tsc -b --noEmit` → **0 errors**
- `npm run lint` → **0 errors**

### BeaconsPage — 22 tests (toàn bộ AC của S6-M4-02)

| Nhóm | Test case | Kết quả |
|------|-----------|---------|
| Render | Beacon list với data và identity badges | ✅ |
| Filter | Status filter (Active / Inactive / All) | ✅ |
| Filter | Search keyword (name, UUID, major, minor, artifact) | ✅ |
| State | Empty state khi không có beacon | ✅ |
| State | Error alert + Retry button khi fetch lỗi | ✅ |
| Validation | UUID format, Major/Minor range (0–65535) | ✅ |
| CRUD | Create beacon thành công → success message | ✅ |
| CRUD | Edit beacon thành công | ✅ |
| CRUD | Delete với confirm dialog (cancel + confirm) | ✅ |
| Error | HTTP 400 → form error, modal giữ nguyên | ✅ |
| Error | HTTP 403 → permission error, **không logout** | ✅ |
| Error | HTTP 403 trên update → list không reload | ✅ |
| Error | HTTP 403 trên delete → hiển thị permission message | ✅ |
| Error | HTTP 404 trên update → refresh list + notice | ✅ |
| Error | HTTP 404 trên delete → refresh list + notice | ✅ |
| Error | HTTP 409 → conflict error rõ trong modal | ✅ |
| Error | HTTP 401 trên save → không nhầm với 403 | ✅ |
| Error | HTTP 401 trên load → hiển thị message + retry | ✅ |
| Error | Network error (HTTP 0) → thông báo rõ | ✅ |
| Artifact | Load toàn bộ artifact list (không page size) | ✅ |
| Artifact | Giữ mapping hiện tại khi artifact chưa tải được | ✅ |
| Artifact | Thay đổi và bỏ mapping artifact | ✅ |
| Artifact | Artifact load lỗi → retry trong modal hoạt động | ✅ |

---

## Acceptance Criteria — Kết quả

### Auth & Route Protection
- [x] Login ADMIN → thành công, vào được Admin panel
- [x] Logout → xóa session, redirect `/login`
- [x] Route protection: truy cập khi chưa login → redirect `/login`

### Beacon CRUD
- [x] Beacon list hiển thị đúng data từ `/api/admin/beacons`
- [x] Create beacon (UUID/Major/Minor/Artifact) → thành công
- [x] Create trùng UUID+Major+Minor → 409 hiển thị rõ trong modal
- [x] Edit beacon → update thành công
- [x] Delete beacon → confirm dialog → xóa thành công
- [x] Artifact mapping: assign, update, unassign đều hoạt động
- [x] Search/filter (tên, UUID, status, artifact) lọc đúng

### HeritageSite, Artifact, Multimedia CRUD
- [x] List các trang hiển thị đúng data
- [x] CRUD operations hoạt động
- [x] Multimedia: chỉ chấp nhận http/https URL

### Error Handling
- [x] 400 → validation message, không crash
- [x] 401 → session expiry xử lý toàn cục (không nhầm với 403)
- [x] 403 → permission error, **không logout**
- [x] 404 → thông báo + refresh list
- [x] 409 → conflict error rõ ràng
- [x] Network error → thông báo + retry

---

## Điểm đáng chú ý

- **403 không logout:** Trong `BeaconsPage.tsx`, HTTP 403 chỉ set `formError` / `setError`, không gọi `logout()`. Đã verify qua unit test và manual test.
- **Artifact mapping guard:** `currentMappingMissing` đảm bảo mapping hiện tại không bị xóa khi `/api/artifacts` chưa tải xong.
- **Beacon list không paginate:** `getAllBeacons()` gọi `/api/admin/beacons` trả flat array — phù hợp với backend contract hiện tại.
- **Search/filter:** Client-side, không phát sinh thêm API request.

---

## Các file liên quan

| File | Vai trò |
|------|---------|
| `frontend/src/pages/BeaconsPage.tsx` | Beacon Management UI (828 dòng) |
| `frontend/src/services/beaconService.ts` | CRUD API calls (`/api/admin/beacons`) |
| `frontend/src/pages/__tests__/BeaconsPage.test.tsx` | 22 component tests |
| `frontend/src/pages/HeritageSitesPage.tsx` | HeritageSite Management |
| `frontend/src/pages/ArtifactsPage.tsx` | Artifact Management |
| `frontend/src/pages/MultimediaPage.tsx` | Multimedia Management |
| `frontend/src/pages/LoginPage.tsx` | Auth / Login |
| `frontend/src/context/AuthContext.tsx` | Session management |

---

## Kết quả đạt được

- Toàn bộ **104/104 tests passed**, TypeScript và lint sạch.
- Các Admin workflow CRUD chính đã được xác minh hoạt động với backend tích hợp.
- Không có regression về authorization, session handling hay data mapping.
- Task S6-M4-02 đạt acceptance criteria.
