# LTJ-68 — S6-M2-02: Final Backend API Contract & Domain Integrity Audit

## 1. Mục tiêu

Rà soát API contract, phân quyền truy cập, xác thực JWT và tính toàn vẹn dữ liệu của backend Smart Heritage trước giai đoạn nghiệm thu cuối.

## 2. Phạm vi đã kiểm tra

- SecurityConfig và JwtAuthenticationFilter.
- JwtTokenProvider và CustomUserDetailsService.
- SecurityErrorHandler và GlobalExceptionHandler.
- HeritageSite, Artifact và Multimedia APIs.
- Admin Beacon APIs và Beacon Resolve.
- Visitor Interaction và Analytics APIs.
- Các controller integration tests và PostgreSQL integration tests.

## 3. Kết quả kiểm thử đã xác minh

### 3.1. Controller tests ban đầu

Kết quả lần chạy trước khi bổ sung JWT edge cases:

- Tests run: 100
- Failures: 0
- Errors: 0
- Skipped: 0
- BUILD SUCCESS
- Thời gian: 01:37 phút

### 3.2. PostgreSQL integration tests

Kết quả lần chạy trước:

- Tests run: 72
- Failures: 0
- Errors: 0
- Skipped: 0
- BUILD SUCCESS

Test sử dụng database `smart_heritage_test`, không phải database demo `smart_heritage`.

### 3.3. JWT edge cases và controller regression — Đã xác minh

Phát hiện lỗi: JWT còn hạn và có chữ ký hợp lệ nhưng tài khoản tương ứng đã bị xóa khỏi database. `JwtAuthenticationFilter` gọi `loadUserByUsername()` và để `UsernameNotFoundException` thoát khỏi filter.

Khắc phục:

- Bổ sung xử lý `UsernameNotFoundException` trong `JwtAuthenticationFilter`.
- Xóa `SecurityContext` khi tài khoản không còn tồn tại.
- Tiếp tục filter chain để Spring Security xử lý request theo trạng thái anonymous.
- Không thay đổi API contract hoặc database schema.

Kết quả AuthControllerTest:

- Tests run: 23
- Failures: 0
- Errors: 0
- Skipped: 0
- BUILD SUCCESS

Các trường hợp JWT đã kiểm tra:

- JWT hết hạn: PASS.
- JWT sai chữ ký: PASS.
- JWT sai định dạng: PASS.
- JWT hợp lệ nhưng user đã bị xóa: PASS, endpoint yêu cầu xác thực trả 401.
- Public endpoint với JWT không hợp lệ: PASS.

Kết quả chạy lại nhóm controller regression sau khi sửa filter:

- Tests run: 105
- Failures: 0
- Errors: 0
- Skipped: 0
- BUILD SUCCESS
- Thời gian: 01:27 phút

Lưu ý: Các lần chạy AuthControllerTest, controller regression và PostgreSQL integration là những lần chạy riêng biệt, không phải một lần chạy gộp.

## 4. Kết quả rà soát phân quyền

| Nhóm API | Quyền truy cập đã rà soát |
|---|---|
| GET Heritage Sites | Public |
| GET Artifacts | Public |
| GET Multimedia | Public |
| Ghi/xóa Heritage Sites | ADMIN |
| Ghi/xóa Artifacts | ADMIN |
| Ghi/xóa Multimedia | ADMIN |
| Admin Beacon CRUD | ADMIN |
| Beacon Resolve | Public |
| Visitor Interaction POST | Public |
| Analytics | ADMIN |

Các test đã kiểm tra visitor không được thực hiện thao tác quản trị; Beacon và Analytics có kiểm tra phản hồi 401 khi chưa xác thực và 403 với visitor.

## 5. Các điểm cần tiếp tục xác minh

### 5.1. JWT Authentication — Đã xác minh

Các trường hợp JWT tại mục 3.3 đã được kiểm thử thành công sau khi sửa `JwtAuthenticationFilter`.

### 5.2. Các mục còn tiếp tục xác minh

- API smoke test trên database demo `smart_heritage`.
- Đối chiếu API contract và domain integrity trên luồng Site → Artifact → Multimedia.
- Đối chiếu Beacon → Mapping → Resolve.

## 6. Đánh giá hiện tại

Các kết quả kiểm thử đã xác minh:

| Nhóm kiểm thử | Kết quả | Trạng thái |
|---|---:|---|
| Controller tests ban đầu | 100 tests, 0 failures, 0 errors | PASS |
| AuthControllerTest sau bổ sung JWT | 23 tests, 0 failures, 0 errors | PASS |
| Nhóm controller regression | 105 tests, 0 failures, 0 errors | PASS |
| PostgreSQL integration suite | 72 tests, 0 failures, 0 errors | PASS |

Đã khắc phục và kiểm thử thành công lỗi JWT khi tài khoản đã bị xóa. Nhóm controller regression không phát hiện lỗi sau thay đổi.

Chưa kết luận hoàn tất S6-M2-02. Cần hoàn thành API smoke test và xác minh các luồng dữ liệu trên database demo trước khi đóng audit và chuyển sang S6-M2-03.

## 7. Nguyên tắc thực hiện

- Không thay đổi API contract hoặc database schema nếu chưa có bằng chứng về lỗi và chưa thống nhất với các thành viên phụ trách liên quan.
- Không mở rộng phạm vi ngoài M2 Guide.
- Không ghi nhận công việc chưa chạy hoặc chưa xác minh là hoàn thành.
- Không đưa thay đổi thuộc mobile vào backend commit.