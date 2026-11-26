# LTJ-68 — S6-M2-02: Kiểm tra hợp đồng API và tính toàn vẹn Backend

## 1. Mục tiêu

Rà soát hợp đồng API, phân quyền, xác thực JWT và tính toàn vẹn dữ liệu Backend Smart Heritage trước giai đoạn nghiệm thu.

## 2. Phạm vi

- Security: `SecurityConfig`, `JwtAuthenticationFilter`, `JwtTokenProvider`, `CustomUserDetailsService`.
- Xử lý lỗi: `SecurityErrorHandler`, `GlobalExceptionHandler`.
- Content API: HeritageSite, Artifact, Multimedia.
- Beacon API: quản lý Beacon và Beacon Resolve.
- Visitor Interaction và Analytics.
- Controller tests và PostgreSQL integration tests.

## 3. Kết quả đã xác minh

### 3.1. Xác thực và phân quyền

- Khắc phục lỗi JWT hợp lệ nhưng tài khoản đã bị xóa khỏi cơ sở dữ liệu.
- JWT hết hạn, sai chữ ký, sai định dạng hoặc không còn tài khoản đều được xử lý đúng.
- API công khai vẫn hoạt động khi nhận JWT không hợp lệ.
- Các thao tác quản trị yêu cầu quyền ADMIN; VISITOR không được phép thực hiện.
- Các API Beacon và Analytics được kiểm tra với trường hợp chưa xác thực (401) và không đủ quyền (403).

### 3.2. Kiểm thử API Content

| Thành phần | Số test | Kết quả |
|---|---:|---|
| HeritageSite | 19 | PASS |
| Artifact | 26 | PASS |
| Multimedia | 20 | PASS |

Các nội dung đã kiểm chứng:

- Validation dữ liệu đầu vào theo DTO và hợp đồng API.
- Tài nguyên không tồn tại trả HTTP 404.
- Xóa Site có Artifact liên quan trả HTTP 409 và giữ nguyên dữ liệu.
- Xóa Artifact có Multimedia, VisitorInteraction hoặc Beacon liên quan trả HTTP 409 và giữ nguyên dữ liệu.
- Cập nhật thất bại không làm thay đổi dữ liệu hiện có.
- Các chức năng tìm kiếm, phân trang, sắp xếp và phân quyền vượt qua kiểm thử tương ứng.

### 3.3. Kiểm thử Beacon

| Nhóm kiểm thử | Số test | Kết quả |
|---|---:|---|
| BeaconControllerTest và BeaconResolveValidationTest | 28 | PASS |

Các nội dung đã kiểm chứng:

- Resolve Beacon đang bật nhưng chưa liên kết Artifact.
- Cập nhật, thay đổi và gỡ Artifact mapping.
- Resolve phản ánh mapping mới; thông tin Artifact/Site trả về `null` khi chưa liên kết.
- Cập nhật Beacon trùng bộ `(uuid, major, minor)` trả HTTP 409.
- Dữ liệu của các Beacon hiện có được giữ nguyên khi cập nhật trùng định danh.

### 3.4. Visitor Interaction và PostgreSQL

- Kiểm thử Controller ban đầu: 100 tests, PASS.
- Kiểm thử hồi quy Controller sau thay đổi JWT: 105 tests, PASS.
- `AuthControllerTest`: 23 tests, PASS.
- PostgreSQL integration tests: 72 tests, PASS.
- Kiểm thử xóa Beacon và bảo toàn Interaction: 1 test, PASS.

Các kiểm thử PostgreSQL sử dụng cơ sở dữ liệu riêng `smart_heritage_test`.

Đã xác minh khi xóa Beacon:
- VisitorInteraction liên quan vẫn được giữ lại.
- `visitor_interaction.beacon_id` chuyển thành `NULL`.
- `visitor_interaction.artifact_id` không thay đổi.

- Bổ sung kiểm thử Controller cho BEACON_TRIGGER:
  - Beacon không tồn tại: API trả HTTP 404.
  - Beacon chưa được gán Artifact: API trả HTTP 400.
  - Xác nhận không tạo VisitorInteraction khi dữ liệu Beacon không hợp lệ.
- Kết quả `VisitorInteractionControllerTest`: 20 tests,
  0 failures, 0 errors, 0 skipped; BUILD SUCCESS.
- Thời điểm hoàn thành: 2026-11-26T19:40:52Z.

### 3.5. Kiểm tra dữ liệu demo

| Nội dung | Kết quả |
|---|---|
| HeritageSite | 4 bản ghi |
| Artifact | 20 bản ghi |
| Multimedia | 20 bản ghi |
| Beacon | 4 bản ghi, đều đang bật và có Artifact mapping |
| Artifact tham chiếu Site không tồn tại | 0 |
| Multimedia tham chiếu Artifact không tồn tại | 0 |

Beacon Resolve trả thông tin liên kết với UUID hợp lệ và HTTP 404 với UUID không tồn tại.

*Các kết quả trên chỉ xác nhận dữ liệu và trường hợp đã kiểm tra, không đại diện cho toàn bộ kịch bản nghiệm thu.*

## 4. Tổng hợp kiểm thử

| Nhóm kiểm thử | Số test | Kết quả |
|---|---:|---|
| Controller ban đầu | 100 | PASS |
| AuthControllerTest | 23 | PASS |
| Controller regression sau JWT | 105 | PASS |
| PostgreSQL integration | 72 | PASS |
| Beacon PostgreSQL delete | 1 | PASS |
| HeritageSiteControllerTest | 19 | PASS |
| ArtifactControllerTest | 26 | PASS |
| MultimediaControllerTest | 20 | PASS |
| BeaconControllerTest và BeaconResolveValidationTest | 28 | PASS |
| VisitorInteractionServiceTest | 20 | PASS |
| VisitorInteractionControllerTest | 20 | PASS |
| GlobalExceptionHandlerTest | 3 | PASS |
| Combined regression | 98 | PASS |

**Các lần chạy kiểm thử bổ sung:**

- `VisitorInteractionServiceTest`: 20 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26 19:20:24).
- `VisitorInteractionControllerTest`: 20 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26 19:40:52).
- `GlobalExceptionHandlerTest`: 3 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26 19:00:11).
- Combined regression gồm `AuthControllerTest`, `PublicContentAccessTest`, `BeaconControllerTest`, `ArtifactControllerTest`, `HeritageSiteControllerTest`, `MultimediaControllerTest`, `VisitorInteractionControllerTest` và `GlobalExceptionHandlerTest`: 98 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26 19:04:08).

Các kết quả trên là những lần chạy riêng biệt. Không cộng số lượng test giữa các lần chạy để tạo thành tổng số test duy nhất.

**Phạm vi bằng chứng:** Các lần chạy xác nhận những nhóm chức năng được kiểm tra tại thời điểm tương ứng. Chưa xem đây là bằng chứng hoàn tất toàn bộ acceptance test S6-M2-03.

## 5. Công việc còn lại

- Đối chiếu đầy đủ hợp đồng API với implementation và phản hồi thực tế.
- Rà soát nhất quán các mã lỗi HTTP, cấu trúc response và validation.
- Hoàn thiện đối chiếu luồng HeritageSite → Artifact → Multimedia.
- Kiểm tra bổ sung các trạng thái Beacon, đặc biệt Beacon bị vô hiệu hóa và các trường hợp Resolve tương ứng.
- Tổng hợp lỗi còn tồn tại và bằng chứng nghiệm thu.

## 6. Trạng thái

**Chưa hoàn tất S6-M2-02.**

Đã có kết quả kiểm thử đạt đối với JWT, phân quyền, Content API, Beacon và một số ràng buộc PostgreSQL. Tuy nhiên, việc đối chiếu toàn bộ hợp đồng API và hoàn thiện các kịch bản còn lại vẫn đang thực hiện.

Chỉ kết luận hoàn thành sau khi các nội dung còn lại được kiểm chứng và có bằng chứng tương ứng.

## 7. Nguyên tắc thực hiện

- Không thay đổi API hoặc database schema khi chưa có bằng chứng và thống nhất.
- Không mở rộng ngoài phạm vi M2.
- Chỉ ghi nhận kết quả đã thực hiện và xác minh.
- Không đưa thay đổi Mobile vào commit Backend.
- Kiểm thử có thao tác xóa dữ liệu phải sử dụng database kiểm thử riêng.
- Cập nhật log theo từng phần công việc đã xác minh.

### Bổ sung — Kiểm thử hồi quy xác thực, phân quyền và API

- Chạy nhóm test: `AuthControllerTest`, `PublicContentAccessTest`, `BeaconControllerTest`, `ArtifactControllerTest`, `HeritageSiteControllerTest`, `MultimediaControllerTest`, `VisitorInteractionControllerTest`, `GlobalExceptionHandlerTest`.
- Kết quả: **98 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS**.
- Riêng `MultimediaControllerTest`: 20 tests, không có lỗi.
- Kết quả xác nhận nhóm API được kiểm tra hoạt động đồng thời sau các thay đổi gần đây.

**Phạm vi bằng chứng:** kiểm thử hồi quy xác thực JWT, quyền truy cập, Content, Beacon, Visitor Interaction và xử lý ngoại lệ. Chưa xem đây là bằng chứng hoàn tất toàn bộ acceptance test S6-M2-03.

### Bổ sung — Kiểm tra API Response Envelope cho 403

- Cập nhật `VisitorInteractionControllerTest.summary_shouldRequireAdminRole()`.
- Bổ sung assertion cho response 403:
  - `success = false`
  - `message` là chuỗi
  - `data = null`
  - `timestamp` là chuỗi
  - `path = /api/analytics/interactions/summary`
  - `errors = null`
- Kết quả: `VisitorInteractionControllerTest` — 20 tests, 0 failures, 0 errors, 0 skipped.
- Build: `BUILD SUCCESS`.
- Thời điểm: `2026-11-26T20:12:09Z`.

### Bổ sung — Đối chiếu API Response Envelope

Đã bổ sung assertion kiểm tra cấu trúc response theo hợp đồng API.

**Các trường hợp kiểm tra qua MockMvc:**
- Success 201: đủ sáu trường, `path` đúng và `errors = null`.
- Unauthorized 401: đủ sáu trường, `path` đúng, `data = null`, `errors = null`.
- Forbidden 403: đủ sáu trường, `path` đúng, `data = null`, `errors = null`.
- Bad Request 400: đủ sáu trường; `path = /api/auth/register`, `errors` là mảng.
- Not Found 404: đủ sáu trường; `path = /api/artifacts/999999`.
- Conflict 409: đủ sáu trường; `path = /api/auth/register`.

**Kết quả kiểm thử:**
- `VisitorInteractionControllerTest`: 20 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26T20:12:09Z).
- `AuthControllerTest` và `ArtifactControllerTest`: tổng 49 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26T20:17:32Z).
- `GlobalExceptionHandlerTest`: 3 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS (2026-11-26T20:23:18Z).

**Kiểm tra HTTP 500:**
- Bổ sung assertion cho response của `GlobalExceptionHandler` khi gặp constraint không được nhận diện.
- Đã xác minh đủ sáu trường của `ApiResponse`, bao gồm thông báo lỗi chung và request path.
- Phạm vi: unit test gọi trực tiếp handler; chưa xác minh HTTP 500 qua MockMvc.

**Phạm vi bằng chứng:** Các kết quả trên xác nhận những trường hợp đã kiểm tra, không đại diện cho toàn bộ acceptance test S6-M2-03.

### Kiểm tra API Multimedia — Đã xác minh

**Kiểm thử:** `MultimediaControllerTest`

- Tổng số kiểm thử: 23
- Số kiểm thử thất bại: 0
- Số kiểm thử gặp lỗi: 0
- Số kiểm thử bị bỏ qua: 0
- Kết quả: `BUILD SUCCESS`

**Các trường hợp kiểm thử được bổ sung:**

- ADMIN tạo Multimedia thành công (HTTP 201), đồng thời kiểm tra các trường dữ liệu trong response.
- Người dùng chưa đăng nhập không được phép tạo Multimedia (HTTP 401), đồng thời kiểm tra đầy đủ sáu trường của `ApiResponse`.
- ADMIN xóa Multimedia không tồn tại nhận HTTP 404, đồng thời kiểm tra đầy đủ sáu trường của response.

**Kết luận kiểm tra:** Toàn bộ kiểm thử của Multimedia Controller đều thành công. Không cần chỉnh sửa Controller, Service hoặc Repository để bổ sung các trường hợp kiểm thử trên.

**Phạm vi xác minh:** Kết quả này chỉ xác nhận bộ kiểm thử Multimedia Controller. Chưa đủ cơ sở để kết luận hoàn thành toàn bộ S6-M2-02 hoặc nghiệm thu S6-M2-03.

### Kiểm thử Artifact API — Đã xác minh

- Lớp kiểm thử: `ArtifactControllerTest`
- Tổng số test: 28
- Thành công: 28
- Thất bại: 0
- Lỗi: 0
- Bỏ qua: 0
- Kết quả: `BUILD SUCCESS`

Các trường hợp bổ sung:
- ADMIN tạo Artifact thành công; kiểm tra dữ liệu trả về và cấu trúc đủ 6 trường `ApiResponse`.
- Người dùng chưa đăng nhập tạo Artifact bị từ chối với HTTP 401; kiểm tra cấu trúc đủ 6 trường `ApiResponse`.
