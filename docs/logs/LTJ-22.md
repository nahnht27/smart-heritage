# Log: Branch LTJ-22

## Thông tin chung
- **Branch:** `LTJ-22`
- **Task:** Initialize Database Schema and Verify Mappings
- **Sprint:** M2 — Sprint 2: Database & Backend Data Foundation
- **Goal:** Khởi tạo và kiểm tra schema PostgreSQL từ các JPA Entity đã triển khai, xác nhận backend kết nối cơ sở dữ liệu và hoạt động ổn định.

## Các công việc đã hoàn thành
### 1. Khởi động backend và kiểm tra kết nối
- Khởi động môi trường bằng Docker Compose.
- Kiểm tra log khởi động của backend:
  - Xác nhận ứng dụng sử dụng **Spring Boot 3.2.5** và **Java 17**.
  - Xác nhận kết nối PostgreSQL thành công 
  - Xác nhận Spring Data JPA nhận diện Repository và ứng dụng khởi động thành công trên cổng `8080`.

### 2. Kiểm tra schema được tạo trong PostgreSQL
Sử dụng các truy vấn trên PostgreSQL để kiểm tra cấu trúc các bảng:
- `heritage_site`
- `artifact`
- `multimedia`
- Đối chiếu tên cột, kiểu dữ liệu, giá trị mặc định và khả năng cho phép `NULL`. Kết quả kiểm tra ghi nhận tổng cộng **15 cột thuộc 3 bảng**, phù hợp với các trường đã khai báo trong các Entity tương ứng.

### 3. Kiểm tra khóa chính và khóa ngoại
- Xác nhận khóa chính của các bảng lần lượt là `site_id`, `artifact_id` và `multimedia_id`.
- Xác nhận khóa ngoại `artifact.site_id` tham chiếu đến `heritage_site.site_id`.
- Xác nhận khóa ngoại `multimedia.artifact_id` tham chiếu đến `artifact.artifact_id`.
- Kiểm tra các ràng buộc `NOT NULL` trên các trường bắt buộc và khóa ngoại.

### 5. Chạy kiểm thử backend
Chạy bộ kiểm thử Maven trong môi trường Docker bằng lệnh: `docker run --rm -v "${PWD}:/app" -w /app maven:3.9.6-eclipse-temurin-17 mvn test`