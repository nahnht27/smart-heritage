# Log: Branch LTJ-60

## Thông tin chung

- **Branch:** `LTJ-60-admin-beacon-management`
- **Task:** S5-M4-01 — Admin Beacon Management
- **Sprint:** M4 — Sprint 5
- **Mục tiêu chính:** Xây dựng trang quản trị Beacon trên Admin Web, tích hợp với API Admin Beacon thật đã có từ Wave 4 (CRUD + ánh xạ Artifact), gồm validation theo đúng quy tắc backend, xử lý đầy đủ các lỗi HTTP, và không tạo thêm API hay response field mới ở frontend.

## Các công việc đã hoàn thành

### 1. Beacon Management Page (`BeaconsPage.tsx`, `BeaconsPage.css`)

- Xây dựng giao diện quản lý Beacon với đầy đủ các luồng: List, Create, Edit, Delete, Search/Filter, nhất quán với các trang Admin hiện có (cùng layout, route `/beacons` và `ProtectedRoute` trong `App.tsx`).
- Bảng danh sách hiển thị: Beacon Name, UUID (Proximity), Major / Minor, Mapped Artifact, Status, Actions.
- Tích hợp trực tiếp với các endpoint backend thật (qua `beaconService.ts`):
  - `GET /api/admin/beacons` — danh sách beacon
  - `GET /api/admin/beacons/{beaconId}` — tải chi tiết trước khi edit
  - `POST /api/admin/beacons` — tạo mới (ADMIN)
  - `PUT /api/admin/beacons/{beaconId}` — cập nhật (ADMIN)
  - `DELETE /api/admin/beacons/{beaconId}` — xóa (ADMIN)
- **Tìm kiếm & Lọc:**
  - Backend `GET /api/admin/beacons` không có query param lọc/tìm kiếm và không phân trang, nên search/filter được thực hiện phía client trên danh sách đầy đủ, không tạo param mới.
  - Ô tìm kiếm theo tên, UUID, Major, Minor và tên Artifact.
  - Lọc theo trạng thái (All / Active Only / Inactive Only) và theo ánh xạ (All / Mapped Only / Unassigned Only / từng Artifact cụ thể).
  - Empty state phân biệt "chưa có beacon" và "không có beacon khớp bộ lọc".
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog (`window.confirm`) trước khi xóa; disable nút khi đang xóa để tránh thao tác lặp.
- Disable submit và chặn submit nhiều lần khi đang lưu (`saving` flag).

### 2. Beacon Form & Validation

- Modal Create/Edit với các trường: name, UUID, Major, Minor, enabled, Artifact.
- Validation bám đúng `BeaconRequest` của backend, không thêm rule riêng:
  - Name: bắt buộc, tối đa 255 ký tự.
  - UUID: bắt buộc, đúng định dạng UUID (8-4-4-4-12 hex).
  - Major / Minor: bắt buộc, số nguyên trong khoảng 0–65535.
  - Artifact: tùy chọn (backend cho phép `artifactId` null), nếu chọn thì phải là số nguyên dương (`@Positive`).
- Các dữ liệu không hợp lệ bị chặn trước khi gọi API.

### 3. Artifact Mapping

- Lấy danh sách Artifact từ API hiện có `GET /api/artifacts`, hỗ trợ cả `Artifact[]` lẫn `PageResponse`. Không truyền `page/size` nên backend trả toàn bộ danh sách, tránh việc cắt bớt Artifact khi ánh xạ.
- Admin gán, đổi hoặc bỏ ánh xạ Artifact trong form; cột "Mapped Artifact" hiển thị ánh xạ hiện tại (tên Artifact).
- **Tham chiếu Artifact không khả dụng:** nếu Artifact của beacon đang sửa không có trong danh sách đã tải (tải lỗi hoặc không còn), form vẫn hiển thị và giữ đúng ánh xạ thật (`currentMappingMissing`) thay vì âm thầm xóa hoặc đổi mapping.
- Nếu tải Artifact lỗi: hiển thị thông báo kèm nút Retry riêng, không chặn các thao tác còn lại.
- Khi gặp 404 (beacon hoặc Artifact không còn tồn tại), refresh cả danh sách beacon lẫn danh sách Artifact để UI không giữ dữ liệu cũ.

### 4. Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| 409 (trùng UUID + Major + Minor) | Hiển thị message của backend ngay trong modal, giữ modal mở để sửa |
| 400 | Hiển thị message validation của backend trong modal |
| 401 | Không xử lý riêng ở trang; dùng cơ chế toàn cục `apiClient` → `authEvents` → đăng xuất và redirect Login |
| 403 | Hiển thị "không có quyền" (modal hoặc alert khi xóa); **không** đăng xuất vì `apiClient` chỉ xóa phiên khi gặp 401 |
| 404 | Hiển thị thông báo, tự refresh danh sách |
| Lỗi mạng | Hiển thị lỗi kết nối, giữ modal mở để thử lại |

- Không sửa `apiClient.ts`, `AuthContext` hay các trang Admin hiện có; trang mới tái sử dụng cơ chế sẵn có.

### 5. Kiểm thử & Đảm bảo chất lượng

- `BeaconsPage.test.tsx` (22 tests): render danh sách theo dữ liệu backend; lọc theo trạng thái và từ khóa; empty state; error + retry; validation form create; create thành công; hiển thị lỗi 409; edit; xác nhận và xóa; lỗi 400/403/mạng khi lưu; 404 khi update và khi delete (refresh danh sách); 403 khi delete và khi update; 401 khi lưu và khi tải danh sách không bị coi là lỗi quyền; tải đủ Artifact không dùng page size cố định; giữ mapping khi Artifact không có trong danh sách; đổi/bỏ mapping; lỗi tải Artifact kèm retry.
- `beaconService.test.ts` (8 tests): đúng endpoint và method cho getAll / getById / create / update / delete, truyền lỗi 409/404 từ backend, danh sách rỗng, response thiếu `data`.
- Toàn bộ test suite sau khi tích hợp `main` đạt **104/104 tests passed** (15 test files), gồm 30 test LTJ-60 (22 BeaconsPage + 8 beaconService), 58 test baseline và 16 test mới từ LTJ-61.
- `npx tsc -b`, `npm run lint`, `npm run build` đạt 0 errors.

## Kết quả đạt được

- Admin quản lý được Beacon end-to-end (xem, tạo, sửa, xóa) và ánh xạ Artifact trên giao diện nhất quán với các trang Admin khác.
- Validation khớp backend (UUID, Major/Minor 0–65535, Artifact tùy chọn), không có rule chỉ tồn tại ở frontend.
- Lỗi 401/403/404/409/400 và lỗi mạng được xử lý rõ ràng; 403 không làm mất phiên.
- Không dùng mock data trong code production và không tạo API hoặc response field mới.

## 6. Tích hợp `main` và kiểm tra cuối (2026-11-13)

- `origin/main` mới nhất được tích hợp: `bb7aff4`.
- Merge commit tích hợp: `d69b42a` (`Merge origin/main into LTJ-60-admin-beacon-management`).
- Không có conflict; toàn bộ thay đổi LTJ-60 được giữ nguyên.
- `npm test -- --run`: **104/104 PASS** (15 test files).
- `npx tsc -b`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- CI required checks được xác nhận trên PR #35 sau khi push.

### Giới hạn

- Không thay đổi API contract hoặc thêm endpoint backend.
- Kiểm thử E2E trình duyệt thủ công không nằm trong phạm vi; UI được xác nhận bằng component tests.
