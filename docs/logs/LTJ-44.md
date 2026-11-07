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
- Bổ sung DTO `PageResponse` để trả dữ liệu phân trang.

## 4. Tương thích ngược

- Giữ nguyên các endpoint CRUD và endpoint chi tiết hiện có.
- Khi không truyền `page` và `size`, endpoint danh sách tiếp tục trả về response dạng `ApiResponse<List<...>>`.
- Khi truyền `page` hoặc `size`, endpoint trả về `ApiResponse<PageResponse<...>>`.
- Giữ nguyên cấu trúc `ApiResponse<T>` và quyền truy cập hiện tại.
- Không thay đổi API Multimedia hoặc các module ngoài phạm vi LTJ-44.

## 5. Kiểm thử
Đã chạy bộ kiểm thử backend bằng Docker Maven với test profile:
- Artifact: 122 tests, 0 failures, 0 errors, 0 skipped.
- Heritage Site: 126 tests, 0 failures, 0 errors, 0 skipped.

Các kiểm thử bổ sung bao gồm tìm kiếm keyword, phân trang, sắp xếp và kiểm tra giới hạn kích thước trang.

## 6. Tài liệu
Cập nhật `docs/integration/api-contract.md` tại:
- Mục 2.3 — Heritage Site.
- Mục 2.4 — Artifact.
Bổ sung query parameters, cấu trúc phân trang và quy tắc tương thích ngược.
