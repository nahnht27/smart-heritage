# LTJ-44 — Content Discovery API

## 1. Mục tiêu
Bổ sung chức năng tìm kiếm, lọc, phân trang và sắp xếp cho Heritage Site và Artifact theo yêu cầu Sprint 4 – M2 Backend Content & Database.

## 2. Phạm vi thực hiện

### Heritage Site
- Bổ sung tìm kiếm theo `keyword` trên tên di sản.
- Hỗ trợ phân trang với `page`, `size`.
- Hỗ trợ sắp xếp theo `name`, `siteId`.
- Hỗ trợ chiều sắp xếp `asc`, `desc`.

### Artifact
- Bổ sung tìm kiếm theo `keyword` trên tên hiện vật.
- Hỗ trợ lọc theo `siteId`.
- Hỗ trợ phân trang với `page`, `size`.
- Hỗ trợ sắp xếp theo `name`, `artifactId`.
- Hỗ trợ chiều sắp xếp `asc`, `desc`.

## 3. Kỹ thuật triển khai
- Sử dụng Spring Data JPA `JpaSpecificationExecutor` và `Specification` để xây dựng điều kiện truy vấn.
- Sử dụng `Pageable`, `PageRequest` và `Page` cho phân trang.
- Chuẩn hóa từ khóa tìm kiếm bằng cách trim khoảng trắng và tìm kiếm không phân biệt chữ hoa, chữ thường.
- Kiểm tra tham số phân trang, giới hạn `size` tối đa 100 và whitelist trường sắp xếp.
- Validate `direction` cả khi không truyền `sortBy`.
- Dùng tie-breaker (`artifactId`/`siteId`) để thứ tự ổn định khi các bản ghi có cùng giá trị sắp xếp.
- Bổ sung DTO `PageResponse` để trả dữ liệu phân trang.

## 4. Tương thích ngược

- Giữ nguyên các endpoint CRUD và endpoint chi tiết hiện có.
- Khi không truyền `page` và `size`, endpoint danh sách tiếp tục trả về response dạng `ApiResponse<List<...>>`.
- Khi truyền `page` hoặc `size`, endpoint trả về `ApiResponse<PageResponse<...>>`.
- Giữ nguyên cấu trúc `ApiResponse<T>` và quyền truy cập hiện tại.
- Không thay đổi API Multimedia hoặc các module ngoài phạm vi LTJ-44.

## 5. Kiểm thử
Đã chạy bộ kiểm thử backend bằng Docker Maven với test profile:
- Toàn bộ backend: 133 tests, 0 failures, 0 errors, 0 skipped.
- Bao gồm Artifact và Heritage Site controller tests.

Các kiểm thử bổ sung bao gồm tìm kiếm keyword, phân trang, sắp xếp, thứ tự ổn định khi trùng khóa sắp xếp, `direction` không hợp lệ và giới hạn kích thước trang.

## 6. Tài liệu
API contract cho Content Discovery được cập nhật trong PR phụ thuộc LTJ-45 (`docs/integration/api-contract.md`), vì branch LTJ-45 đang stack trên LTJ-44. Branch LTJ-44 chỉ thêm implementation log này.
