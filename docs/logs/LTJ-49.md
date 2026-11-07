# Log: Branch LTJ-49

## Thông tin chung

- **Branch:** LTJ-49
- **Task:** Admin Content Management — End-to-End Completion
- **Sprint:** M4 — Sprint 4: End-to-End Integration & Core Business Features
- **Mục tiêu chính:** Hoàn thiện trải nghiệm quản trị nội dung di sản trên Admin Web, tích hợp đầy đủ với backend API thật từ M2 cho ba nhóm dữ liệu: Heritage Sites, Artifacts và Multimedia.

## Các công việc đã hoàn thành

### 1. Heritage Sites Management (`HeritageSitesPage.tsx`)

- Xây dựng giao diện quản lý Heritage Sites với đầy đủ các luồng: List, View Detail, Create, Edit, Delete.
- Tích hợp trực tiếp với các endpoint backend thật:
  - `GET /api/heritage-sites` — tải danh sách
  - `GET /api/heritage-sites/{siteId}` — xem chi tiết
  - `POST /api/heritage-sites` — tạo mới (ADMIN)
  - `PUT /api/heritage-sites/{siteId}` — cập nhật (ADMIN)
  - `DELETE /api/heritage-sites/{siteId}` — xóa (ADMIN)
- Validation đầy đủ: tên bắt buộc, latitude trong [-90, 90], longitude trong [-180, 180].
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog trước khi xóa (`window.confirm`).
- Disable submit button và ngăn submit nhiều lần khi đang xử lý (`saving` flag).
- Modal detail có nút chuyển sang Edit trực tiếp.

### 2. Artifacts Management (`ArtifactsPage.tsx`)

- Xây dựng giao diện quản lý Artifacts với đầy đủ các luồng: List, Search, Filter, Create, Edit, Delete.
- Tích hợp trực tiếp với các endpoint backend thật:
  - `GET /api/artifacts` — tải danh sách toàn bộ
  - `GET /api/artifacts?siteId={siteId}` — lọc theo Heritage Site
  - `GET /api/artifacts/{artifactId}` — tải chi tiết trước khi edit
  - `POST /api/artifacts` — tạo mới (ADMIN)
  - `PUT /api/artifacts/{artifactId}` — cập nhật (ADMIN)
  - `DELETE /api/artifacts/{artifactId}` — xóa (ADMIN)
- Tính năng search theo tên artifact (client-side filter).
- Filter theo Heritage Site ID kèm validation đầu vào.
- Dropdown chọn Heritage Site trong form lấy dữ liệu thật từ `GET /api/heritage-sites`.
- Validation: tên bắt buộc, Heritage Site phải được chọn hợp lệ.
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog trước khi xóa.
- Disable submit khi đang xử lý, disable khi Heritage Sites chưa load xong.

### 3. Multimedia Management (`MultimediaPage.tsx`)

- Xây dựng giao diện quản lý Multimedia với đầy đủ các luồng: List, Filter, Create, Edit, Delete.
- Tích hợp trực tiếp với các endpoint backend thật:
  - `GET /api/multimedia` — tải danh sách
  - `GET /api/multimedia?artifactId={artifactId}` — lọc theo Artifact
  - `GET /api/multimedia/{multimediaId}` — tải chi tiết trước khi edit
  - `POST /api/multimedia` — tạo mới (ADMIN)
  - `PUT /api/multimedia/{multimediaId}` — cập nhật (ADMIN)
  - `DELETE /api/multimedia/{multimediaId}` — xóa (ADMIN)
- Filter theo Artifact qua dropdown lấy dữ liệu thật từ `GET /api/artifacts`.
- Filter theo media type (IMAGE / VIDEO / AUDIO) phía client.
- Validation: Artifact bắt buộc, type bắt buộc (tối đa 20 ký tự), title tối đa 255 ký tự, URL bắt buộc và hợp lệ (`type="url"`).
- Xử lý trạng thái loading, error (kèm Retry), empty state, success notification.
- Confirmation dialog trước khi xóa.
- Disable submit khi đang xử lý hoặc danh sách Artifacts chưa sẵn sàng.

### 4. Xác thực và phân quyền

- Tất cả luồng write (Create/Edit/Delete) yêu cầu JWT Bearer token với role ADMIN.
- Token lưu trong `sessionStorage` — xóa tự động khi đóng tab.
- Khi nhận 401 từ bất kỳ API call nào: tự động đăng xuất và redirect về Login thông qua `authEvents`.
- `ProtectedRoute` trong `App.tsx` chặn truy cập nếu chưa xác thực hoặc không phải ADMIN.

### 5. Không sử dụng mock data

- Tất cả dữ liệu lấy từ backend API thật.
- Không có hardcode data, không có placeholder giả lập trong các luồng quản trị chính.

## Kết quả đạt được

- Ba trang quản lý nội dung (Heritage Sites, Artifacts, Multimedia) hoạt động đầy đủ với backend API thật.
- Quan hệ dữ liệu đúng: Heritage Site → Artifact → Multimedia.
- Toàn bộ CRUD hoạt động ổn định, có validation và xử lý lỗi từ backend.
- Giao diện nhất quán về UX: loading state, error state, empty state, success notification, confirmation dialog.
- Authorization được duy trì xuyên suốt — chỉ ADMIN mới thực hiện được các thao tác write.

## Ghi chú

- Search Heritage Sites và pagination chưa triển khai do backend (M2) hiện tại chưa hỗ trợ query parameter tương ứng. Sẽ cập nhật khi M2 bổ sung.
- Filter Artifacts theo site dùng text input nhập Site ID thay vì dropdown do đây là filter trực tiếp trên API query param.
