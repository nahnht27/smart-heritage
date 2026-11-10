# LTJ-45 – Multimedia Content Validation & Data Integrity

## 1. Thông tin
- **Task:** LTJ-45
- **Branch:** `LTJ-45-multimedia-integrity`
- **PR:** #27
- **Status:** Implementation completed, tests passed.

## 2. Mục tiêu
Hoàn thiện validation dữ liệu Multimedia và đảm bảo tính toàn vẹn dữ liệu giữa Multimedia, Artifact và HeritageSite.
Đảm bảo các API hiện tại tương thích với API contract, không làm ảnh hưởng đến các chức năng đã triển khai ở Sprint trước.

## 3. Các nội dung đã thực hiện

### 3.1. Multimedia validation
- Xác nhận `MultimediaRequest` hiện có đã validation đầy đủ:
  - `artifactId` không được null và phải là số dương.
  - `type` không được để trống và tối đa 20 ký tự.
  - `title` tối đa 255 ký tự; trường này không bắt buộc.
  - `url` không được để trống.
- Giữ nguyên kiểu dữ liệu String và cấu trúc entity hiện tại.
- Không thay đổi contract hoặc hành vi validation đã có.

### 3.2. Data integrity
- Ngăn xóa Artifact khi còn Multimedia liên quan.
- Ngăn xóa Artifact khi còn VisitorInteraction liên quan.
- Ngăn xóa Artifact khi còn Beacon liên quan.
- Ngăn xóa HeritageSite khi còn Artifact liên quan.
- Không sử dụng cascade delete để tránh mất dữ liệu liên quan.
- Trả về HTTP 409 Conflict khi thao tác xóa vi phạm ràng buộc dữ liệu.
- Giữ ràng buộc khóa ngoại ở database làm lớp bảo vệ cuối cùng.

### 3.3. Error handling
- Validation lỗi trả về HTTP 400.
- Không tìm thấy tài nguyên trả về HTTP 404.
- Vi phạm tính toàn vẹn dữ liệu trả về HTTP 409.
- Không trả thông tin database nội bộ hoặc stack trace cho client.
- Giữ nguyên ApiResponse envelope.

### 3.4. Tests
Bổ sung kiểm thử cho các trường hợp:

- Không cho xóa Artifact có Multimedia liên quan.
- Không cho xóa Artifact có VisitorInteraction liên quan.
- Không cho xóa Artifact có Beacon liên quan.
- Không cho xóa HeritageSite có Artifact liên quan.
- Đảm bảo các bản ghi liên quan vẫn tồn tại sau thao tác xóa bị từ chối.

## 4. Kết quả kiểm thử
Chạy backend test suite bằng Docker Maven với Java 17:

Tests run: 130
Failures: 0
Errors: 0
Skipped: 0
BUILD SUCCESS

## 5. Tài liệu
Cập nhật `docs/integration/api-contract.md` với ràng buộc xóa dữ liệu của Artifact và HeritageSite.
