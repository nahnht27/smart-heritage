# Log: Branch LTJ-18

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-18`
- **Tên Task**: Java Backend — Draft API Design
- **Mục tiêu chính**: Xác định và tài liệu hóa các API cần thiết cho Backend (Java Spring Boot) phục vụ Visitor App, bao gồm: Beacon, Visitor Interaction, Visit History và Favorite.

## Các công việc đã hoàn thành

1. **Thiết kế Draft API cho Java Backend**
   - **Tài liệu**: Tạo file `docs/design/08_draft_api_backend.md`.
   - **Nội dung bao gồm**:

     a. **Beacon API**
        - `GET /api/v1/artifacts/by-beacon?uuid=&major=&minor=` — Mobile tra cứu Artifact khi nhận tín hiệu iBeacon (yêu cầu UUID + Major + Minor).
        - CRUD Admin: `GET/POST/PUT/DELETE /api/v1/admin/beacons` — Quản lý đăng ký và cấu hình thiết bị Beacon.

     b. **Visitor Interaction API**
        - `POST /api/v1/visitor-interactions` — Bắt đầu tương tác (khi nhận beacon hoặc mở màn hình), trả về `interactionId`.
        - `PATCH /api/v1/visitor-interactions/{interactionId}/end` — Ghi nhận thời điểm kết thúc và `durationSeconds` để M5 tính toán thống kê Analytics.
        - Hỗ trợ `interactionType`: `BEACON_TRIGGER`, `MANUAL_VIEW`, `FAVORITE_ADD`, `FAVORITE_REMOVE`.
        - `GET /api/v1/admin/interactions` — Thống kê tương tác theo Artifact và khoảng thời gian (dành cho Admin).

     c. **Visit History API**
        - `GET /api/v1/me/history` — Lấy lịch sử các Artifact đã tiếp cận (có phân trang).
        - `DELETE /api/v1/me/history/{id}` — Xóa một mục trong lịch sử.
        - `DELETE /api/v1/me/history` — Xóa toàn bộ lịch sử.

     d. **Favorite API**
        - `GET /api/v1/me/favorites` — Lấy danh sách Artifact yêu thích (có phân trang).
        - `POST /api/v1/me/favorites` — Thêm Artifact vào danh sách yêu thích.
        - `DELETE /api/v1/me/favorites/{artifactId}` — Xóa Artifact khỏi danh sách yêu thích.

2. **Quy ước API chung**
   - Thống nhất prefix URL: `/api/v1/...` cho toàn bộ endpoint (đồng bộ cùng M2/M4/M5).
   - Xác thực bằng JWT Bearer Token.
   - Phân trang theo chuẩn Spring Pageable (`?page=0&size=20`).
   - Mã lỗi HTTP chuẩn (200, 201, 400, 401, 403, 404).
