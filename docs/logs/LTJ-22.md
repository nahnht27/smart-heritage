# Log: Branch LTJ-22

## Thông tin chung
- **Branch:** LTJ-22
- **Task:** Initialize Database Schema and Verify Mappings
- **Sprint:** M2 — Sprint 2: Database & Backend Data Foundation
- **Goal:** Khởi tạo schema PostgreSQL từ các JPA Entity đã triển khai, kiểm tra kết nối database và xác minh các ánh xạ dữ liệu của backend.

## Các công việc đã hoàn thành
### 1. Khởi chạy môi trường Docker
- Sử dụng Docker Compose hiện có tại thư mục gốc của dự án.
- Khởi động PostgreSQL và backend bằng lệnh: `docker compose up --build -d`
- Xác nhận container PostgreSQL hoạt động và backend được khởi động.

### 2. Kiểm tra kết nối PostgreSQL
- Kiểm tra log khởi động backend
- Xác nhận kết nối PostgreSQL thành công 
- Xác nhận Spring Data JPA nhận diện Repository và backend khởi động thành công trên cổng `8080`.

### 3. Kiểm tra schema các bảng cốt lõi
Sử dụng các truy vấn PostgreSQL để kiểm tra cấu trúc của 3 bảng:
- `heritage_site`
- `artifact`
- `multimedia`
Kết quả kiểm tra ghi nhận 15 cột, bao gồm tên cột, kiểu dữ liệu, giá trị mặc định và khả năng cho phép `NULL`. Cấu trúc ghi nhận phù hợp với các trường đã khai báo trong 3 JPA Entity tương ứng.

### 4. Xác minh khóa chính và khóa ngoại
- Xác nhận khóa chính của `heritage_site`, `artifact` và `multimedia` lần lượt là `site_id`, `artifact_id` và `multimedia_id`.
- Xác nhận khóa ngoại `artifact.site_id` tham chiếu đến `heritage_site.site_id`.
- Xác nhận khóa ngoại `multimedia.artifact_id` tham chiếu đến `artifact.artifact_id`.
- Kiểm tra các ràng buộc `NOT NULL` trên những trường bắt buộc.

### 5. Chạy kiểm thử backend
Chạy bộ kiểm thử Maven trong container backend theo cấu hình dự án: `docker compose exec backend mvn test`
Kết quả kiểm thử đã ghi nhận từ lần chạy Maven trước:
- Tổng số test: 19.
- Failures: 0.
- Errors: 0.
- Skipped: 0.
- Trạng thái: `BUILD SUCCESS`.

## Kết quả đạt được
- PostgreSQL và backend được khởi chạy bằng Docker Compose.
- Backend kết nối thành công với database `smart_heritage`.
- Schema của 3 bảng cốt lõi đã được kiểm tra.
- Các khóa chính, khóa ngoại và ràng buộc cơ bản đã được xác minh.
- Bộ kiểm thử Maven hiện có đạt `BUILD SUCCESS`, với 19 test và không có lỗi.
