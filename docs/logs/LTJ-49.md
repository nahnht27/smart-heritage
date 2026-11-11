# Log: Branch LTJ-49

## Thông tin chung

- **Branch:** LTJ-49
- **Task:** Admin Content Management — End-to-End Completion
- **Sprint:** M4 — Sprint 4: End-to-End Integration & Core Business Features
- **Mục tiêu chính:** Hoàn thiện trải nghiệm quản trị nội dung di sản trên Admin Web, tích hợp đầy đủ với backend API thật từ M2 cho ba nhóm dữ liệu: Heritage Sites, Artifacts và Multimedia, bao gồm tìm kiếm (keyword search), phân trang (server-side pagination) và an toàn URL.

## Các công việc đã hoàn thành

### 1. Heritage Sites Management (`HeritageSitesPage.tsx`, `HeritageSitesPage.css`)

- Xây dựng giao diện quản lý Heritage Sites với đầy đủ các luồng: List, View Detail, Create, Edit, Delete.
- Tích hợp trực tiếp với các endpoint backend thật:
  - `GET /api/heritage-sites?keyword={keyword}&page={page}&size={size}` — tìm kiếm và phân trang
  - `GET /api/heritage-sites/{siteId}` — xem chi tiết
  - `POST /api/heritage-sites` — tạo mới (ADMIN)
  - `PUT /api/heritage-sites/{siteId}` — cập nhật (ADMIN)
  - `DELETE /api/heritage-sites/{siteId}` — xóa (ADMIN)
- **Tìm kiếm & Phân trang:**
  - Ô tìm kiếm theo tên (`keyword`), khớp với backend M2 hiện tại.
  - Phân trang server-side (`PageResponse<T>`) hiển thị `Showing page X of Y (N sites)` cùng nút `Previous` / `Next`.
  - Cơ chế **Dual Compatibility**: tự động tương thích và hỗ trợ cả `PageResponse<HeritageSite>` (từ backend M2 mới) lẫn fallback client-side phân trang/lọc nếu backend trả về `HeritageSite[]` cũ.
- Validation đầy đủ: tên bắt buộc, latitude trong [-90, 90], longitude trong [-180, 180].
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog trước khi xóa (`window.confirm`).
- Disable submit button và ngăn submit nhiều lần khi đang xử lý (`saving` flag).
- Modal detail có nút chuyển sang Edit trực tiếp.

### 2. Artifacts Management (`ArtifactsPage.tsx`, `ArtifactsPage.css`)

- Xây dựng giao diện quản lý Artifacts với đầy đủ các luồng: List, Search, Filter, Create, Edit, Delete.
- Tích hợp trực tiếp với các endpoint backend thật:
  - `GET /api/artifacts?siteId={siteId}&keyword={keyword}&page={page}&size={size}` — tìm kiếm, lọc di sản và phân trang
  - `GET /api/artifacts/{artifactId}` — tải chi tiết trước khi edit
  - `POST /api/artifacts` — tạo mới (ADMIN)
  - `PUT /api/artifacts/{artifactId}` — cập nhật (ADMIN)
  - `DELETE /api/artifacts/{artifactId}` — xóa (ADMIN)
- **Dropdown Heritage Site Filter:**
  - Thay thế ô nhập numeric ID bằng dynamic `<select>` dropdown tải danh sách di sản thực tế từ `GET /api/heritage-sites`.
  - Tự động đồng bộ và fallback về "All Heritage Sites" nếu di sản được chọn không còn tồn tại.
- **Tìm kiếm & Phân trang:**
  - Tích hợp query parameter `keyword`, `page`, `size` cùng với `siteId`.
  - Thanh điều hướng trang (`artifact-pagination`) với nút `Previous` / `Next`.
  - Cơ chế **Dual Compatibility**: xử lý mượt mà cả `PageResponse<Artifact>` lẫn fallback `Artifact[]`.
- Validation: tên bắt buộc, Heritage Site phải được chọn hợp lệ.
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog trước khi xóa; hiển thị rõ lỗi ràng buộc (như 409 Conflict khi hiện vật có đa phương tiện liên kết).
- Disable submit khi đang xử lý, disable khi Heritage Sites chưa load xong.

### 3. Multimedia Management (`MultimediaPage.tsx`, `MultimediaPage.css`)

- Xây dựng giao diện quản lý Multimedia với đầy đủ các luồng: List, Filter, Create, Edit, Delete.
- Tích hợp trực tiếp với các endpoint backend thật:
  - `GET /api/multimedia?artifactId={artifactId}` — lọc theo Artifact
  - `GET /api/multimedia/{multimediaId}` — tải chi tiết trước khi edit
  - `POST /api/multimedia` — tạo mới (ADMIN)
  - `PUT /api/multimedia/{multimediaId}` — cập nhật (ADMIN)
  - `DELETE /api/multimedia/{multimediaId}` — xóa (ADMIN)
- Filter theo Artifact qua dropdown lấy dữ liệu thật từ `GET /api/artifacts` (hỗ trợ cả Array và PageResponse).
- Filter theo media type (IMAGE / VIDEO / AUDIO) phía client.
- **Bảo mật URL & Liên kết ngoài:**
  - Hàm xác thực giao thức `isHttpUrl`: chỉ chấp nhận `http:` và `https:`, từ chối các scheme nguy hiểm như `javascript:` hoặc `data:`.
  - Liên kết URL mở ngoài được bảo vệ bằng `rel="noopener noreferrer"`.
  - Hiển thị văn bản an toàn không click được nếu URL không hợp lệ.
- Validation: Artifact bắt buộc, type bắt buộc (tối đa 20 ký tự), title tối đa 255 ký tự, URL bắt buộc và hợp lệ.
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog trước khi xóa.
- Disable submit khi đang xử lý hoặc danh sách Artifacts chưa sẵn sàng.

### 4. Xác thực và phân quyền

- Tất cả luồng write (Create/Edit/Delete) yêu cầu JWT Bearer token với role ADMIN.
- Token lưu trong `sessionStorage` — xóa tự động khi đóng tab.
- Khi nhận 401 từ bất kỳ API call nào: tự động đăng xuất và redirect về Login thông qua `authEvents`.
- `ProtectedRoute` trong `App.tsx` chặn truy cập nếu chưa xác thực hoặc không phải ADMIN.

### 5. Kiểm thử & Đảm bảo chất lượng

- Unit tests cho `HeritageSitesPage`: tìm kiếm theo tên, trạng thái không tìm thấy, phân trang và M2 `PageResponse` (3 tests).
- Unit tests cho `ArtifactsPage`: dropdown filter di sản, lọc theo siteId, tìm kiếm và phân trang M2 `PageResponse` (3 tests).
- Unit tests cho `MultimediaPage`: URL an toàn, từ chối scheme `javascript:`, từ chối `ftp:`, chấp nhận `https:` (4 tests).
- Toàn bộ test suite đạt **48/48 tests passed** sau khi đồng bộ `main`.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` đạt 0 errors.

## Kết quả đạt được

- Ba trang quản lý nội dung (Heritage Sites, Artifacts, Multimedia) hoạt động đầy đủ với backend API thật từ M2.
- Hỗ trợ toàn diện Content Discovery: tìm kiếm từ khóa, lọc di sản, và phân trang.
- Đảm bảo an toàn dữ liệu và bảo mật phiên quản trị viên.
