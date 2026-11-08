# LTJ-45 – Multimedia Content Validation & Data Integrity

## 1. Thông tin
- **Task:** LTJ-45
- **Branch:** `LTJ-45-multimedia-integrity`
- **Commit:** `7e8fd29`
- **Status:** Implementation completed, tests passed.

## 2. Mục tiêu
Hoàn thiện validation dữ liệu Multimedia và đảm bảo tính toàn vẹn dữ liệu giữa Multimedia, Artifact và HeritageSite.
Đảm bảo các API hiện tại tương thích với API contract, không làm ảnh hưởng đến các chức năng đã triển khai ở Sprint trước.

## 3. Các nội dung đã thực hiện

### 3.1. Multimedia validation
- Kiểm tra `artifactId` không được null và phải là số dương.
- Kiểm tra `type` không được để trống và tối đa 20 ký tự.
- Kiểm tra `title` tối đa 255 ký tự; trường này không bắt buộc.
- Kiểm tra `url` không được để trống.
- Kiểm tra Artifact tồn tại trước khi tạo hoặc cập nhật Multimedia.
- Giữ nguyên kiểu dữ liệu String và cấu trúc entity hiện tại.

### 3.2. Data integrity
- Ngăn xóa Artifact khi còn Multimedia liên quan.
- Ngăn xóa Artifact khi còn VisitorInteraction liên quan.
- Ngăn xóa Artifact khi còn Beacon liên quan.
- Ngăn xóa HeritageSite khi còn Artifact liên quan.
- Không sử dụng cascade delete để tránh mất dữ liệu liên quan.
- Trả về HTTP 409 Conflict khi thao tác xóa vi phạm ràng buộc dữ liệu.

### 3.3. Error handling
- Validation lỗi trả về HTTP 400.
- Không tìm thấy tài nguyên trả về HTTP 404.
- Vi phạm tính toàn vẹn dữ liệu trả về HTTP 409.
- Không trả thông tin database nội bộ hoặc stack trace cho client.
- Giữ nguyên ApiResponse envelope.

### 3.4. Tests
Bổ sung kiểm thử cho các trường hợp:

- Không cho xóa Artifact có Multimedia liên quan.
- Không cho xóa HeritageSite có Artifact liên quan.
- Đảm bảo các bản ghi liên quan vẫn tồn tại sau thao tác xóa bị từ chối.

## 4. Kết quả kiểm thử
Chạy toàn bộ backend test suite bằng Docker Maven với Java 17:

Tests run: 128
Failures: 0
Errors: 0
Skipped: 0
BUILD SUCCESS