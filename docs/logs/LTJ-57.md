# LTJ-57 — Kiểm tra tính toàn vẹn và hiệu năng Beacon Resolution

## 1. Thông tin công việc
- Sprint: 5
- Vai trò: M2 — Backend Developer
- Mã công việc: S5-M2-02 (LTJ-57)
- Nhánh Git: `feat/s5-m2-beacon-resolution-integrity`

## 2. Kiểm tra cấu trúc hiện tại

### 2.1. Các tệp mã nguồn đã có
- `AdminBeaconController.java`
- `BeaconController.java`
- `BeaconRequest.java`
- `BeaconResponse.java`
- `Beacon.java`
- `BeaconRepository.java`
- `BeaconService.java`

### 2.2. Các tệp kiểm thử đã có
- `BeaconControllerTest.java`
- `BeaconServiceTest.java`

### 2.3. Kiểm tra cấu trúc cơ sở dữ liệu
Tệp migration: `V3__beacon_management.sql`

Qua kiểm tra ban đầu, đã xác định các thành phần:
- Ràng buộc duy nhất: `uk_beacon_identity`.
- Ràng buộc phạm vi Major: `ck_beacon_major_range`.
- Ràng buộc phạm vi Minor: `ck_beacon_minor_range`.
- Khóa ngoại liên kết Artifact: `fk_beacon_artifact`.
- Chỉ mục trên `artifact_id`: `idx_beacon_artifact_id`.
- Khóa ngoại liên kết Beacon với VisitorInteraction: `fk_visitor_interaction_beacon`.
- Chỉ mục trên `visitor_interaction.beacon_id`: `idx_visitor_interaction_beacon_id`.

## 3. Kết quả kiểm tra ban đầu
- Đã xác định các tệp mã nguồn Beacon hiện có.
- Đã xác định các tệp kiểm thử liên quan.
- Đã xác định tên các ràng buộc và chỉ mục trong migration.
- Chưa xác minh đầy đủ logic xử lý định danh Beacon.
- Chưa xác minh tính toàn vẹn của liên kết Beacon–Artifact.
- Chưa kiểm tra hành vi của API phân giải Beacon.
- Chưa đánh giá hiệu năng truy vấn và khả năng xử lý đồng thời.
- Chưa thay đổi mã nguồn hoặc migration trong giai đoạn kiểm tra ban đầu.

## 4. Rà soát mã nguồn Beacon hiện có

### 4.1. Entity và Repository
- `Beacon` sử dụng ba trường `proximityUuid`, `major`, `minor` làm định danh.
- Entity khai báo `uk_beacon_identity` trên ba cột `proximity_uuid`, `major`, `minor`.
- `BeaconRepository` có phương thức tìm kiếm theo đầy đủ ba trường định danh.
- Repository có phương thức kiểm tra Beacon đang liên kết với Artifact.

### 4.2. Service
- Khi tạo và cập nhật Beacon, Service kiểm tra định danh đã tồn tại trước khi lưu.
- Khi gán Artifact, Service kiểm tra Artifact có tồn tại.
- Khi không cung cấp `artifactId`, Service cho phép Beacon không liên kết Artifact.
- Public resolution tìm Beacon theo UUID, Major và Minor, sau đó loại Beacon bị vô hiệu hóa.
- Chưa xác minh khả năng xử lý trùng định danh khi có nhiều request đồng thời.
- Chưa xác minh hành vi resolve đối với Beacon chưa liên kết Artifact.

### 4.3. Controller và DTO
- Public API hiện có endpoint `GET /api/beacons/resolve`.
- Major và Minor được kiểm tra trong khoảng từ 0 đến 65535.
- Các API quản trị Beacon được bảo vệ bằng `@PreAuthorize("hasRole('ADMIN')")`.
- `BeaconResponse` trả về thông tin Beacon, Artifact và Heritage Site nếu có liên kết.

### 4.4. Các nội dung cần kiểm tra tiếp
- Kiểm tra đầy đủ migration và các ràng buộc thực tế trong PostgreSQL.
- Kiểm tra test hiện có cho các trường hợp hợp lệ, không tồn tại, không hoạt động và trùng định danh.
- Kiểm tra hành vi khi Beacon chưa liên kết Artifact.
- Đánh giá truy vấn phát sinh khi tạo `BeaconResponse`.
- Kiểm tra xử lý đồng thời và tính nhất quán của dữ liệu.

Chưa thay đổi mã nguồn hoặc migration trong bước rà soát này.

## 5. Rà soát kiểm thử và migration

### 5.1. Kiểm thử Service hiện có
`BeaconServiceTest` đã bao phủ:
- Tạo Beacon thành công, chuẩn hóa tên và gán Artifact.
- Từ chối tạo Beacon có định danh trùng.
- Từ chối gán Artifact không tồn tại.
- Cho phép cập nhật và giữ nguyên định danh của chính Beacon.
- Từ chối resolve Beacon đã bị vô hiệu hóa.
- Resolve Beacon đang bật, kể cả khi chưa liên kết Artifact.
- Từ chối xóa Beacon không tồn tại.

### 5.2. Kiểm thử Controller hiện có
`BeaconControllerTest` đã bao phủ:
- Admin tạo, xem danh sách, cập nhật và xóa Beacon.
- Public resolve Beacon đang bật mà không cần đăng nhập.
- Public resolve trả về 404 với Beacon bị vô hiệu hóa hoặc không tồn tại.
- Từ chối tạo Beacon trùng định danh với HTTP 409.
- Từ chối Major vượt giới hạn với HTTP 400.
- Từ chối truy cập API quản trị đối với người chưa đăng nhập và role VISITOR.

### 5.3. Kiểm tra migration V3
- `uk_beacon_identity` bảo đảm duy nhất trên bộ ba `proximity_uuid`, `major`, `minor`.
- `ck_beacon_major_range` giới hạn Major từ 0 đến 65535.
- `ck_beacon_minor_range` giới hạn Minor từ 0 đến 65535.
- `fk_beacon_artifact` liên kết Beacon với Artifact.
- `idx_beacon_artifact_id` tạo chỉ mục trên `beacon.artifact_id`.
- `fk_visitor_interaction_beacon` liên kết VisitorInteraction với Beacon và sử dụng `ON DELETE SET NULL`.
- `idx_visitor_interaction_beacon_id` tạo chỉ mục trên `visitor_interaction.beacon_id`.

Ràng buộc duy nhất trên bộ ba định danh đã cung cấp chỉ mục phục vụ truy vấn theo đầy đủ ba trường. Chưa có bằng chứng cho thấy cần bổ sung chỉ mục khác.

### 5.4. Các nội dung chưa được kiểm thử hoặc xác minh
- Xử lý hai request tạo cùng định danh tại cùng thời điểm.
- Ánh xạ lỗi vi phạm unique constraint ở database thành HTTP response nhất quán.
- Public resolve với Beacon chưa liên kết Artifact.
- Public resolve khi UUID sai định dạng hoặc thiếu tham số.
- Kiểm tra giới hạn dưới và trên của cả Major và Minor.
- Kiểm thử tích hợp thực tế trên PostgreSQL.
- Đo số lượng truy vấn và đánh giá hiệu năng resolve.

Chưa thay đổi mã nguồn hoặc migration trong bước rà soát này.

## 6. Xác minh môi trường PostgreSQL Integration Test

### 6.1. Cấu hình chạy kiểm thử
- Đã xác định profile Maven `postgres-integration` sử dụng Maven Failsafe để chạy các tệp `*IT.java`.
- Các biến `POSTGRES_TEST_URL`, `POSTGRES_TEST_USERNAME`, `POSTGRES_TEST_PASSWORD` đã được thiết lập trên máy host.
- `application-postgres-test.yml` sử dụng PostgreSQL, bật Flyway và đặt `ddl-auto: validate`.
- Docker network sử dụng: `laptrinh-java_default`.
- Đã xác minh container tạm có thể kết nối đến `smart-heritage-db:5432/smart_heritage_test`.
- Dockerfile hiện tại chạy `mvn package`, không kích hoạt profile `postgres-integration`.

### 6.2. Trạng thái database kiểm thử
- Database: `smart_heritage_test`.
- PostgreSQL: 16.15.
- Flyway V1, V2 và V3 đều đã được áp dụng thành công.
- Các bảng hiện có: `artifact`, `beacon`, `flyway_schema_history`, `heritage_site`, `multimedia`, `role`, `user`, `visitor_interaction`.
- Dữ liệu hiện có: 1 role, 1 user, 1 heritage_site và 1 artifact.
- Các bản ghi hiện có thuộc fixture PostgreSQL Integration Test, với ID được truy vấn là 3.

### 6.3. Quyết định bảo vệ dữ liệu kiểm thử
- Chưa chạy `VisitorInteractionPostgresIT` vì phương thức `resetDatabase()` xóa dữ liệu trên nhiều bảng dùng chung.
- Không sử dụng thao tác xóa toàn bảng để chuẩn bị dữ liệu cho LTJ-57.
- Hướng kiểm thử tiếp theo: tạo fixture riêng, sử dụng định danh Beacon ngẫu nhiên và chỉ dọn dẹp các bản ghi do chính test tạo ra.
- Chưa thay đổi mã nguồn, migration hoặc dữ liệu hiện có trong database.

## 7. Đối chiếu schema Beacon trên PostgreSQL

### 7.1. Cấu trúc bảng
- `beacon_id` sử dụng sequence để sinh khóa chính.
- `proximity_uuid`, `major`, `minor`, `name` là các cột bắt buộc.
- `enabled` có giá trị mặc định `true`.
- `artifact_id` cho phép `NULL`, phù hợp với trường hợp Beacon chưa được liên kết Artifact.
- `artifact.site_id` là cột bắt buộc.
- `heritage_site.name` là cột bắt buộc.

### 7.2. Ràng buộc thực tế
Đã truy vấn trực tiếp `pg_constraint` trên PostgreSQL và xác nhận:
- `uk_beacon_identity`: UNIQUE trên `(proximity_uuid, major, minor)`.
- `ck_beacon_major_range`: Major từ 0 đến 65535.
- `ck_beacon_minor_range`: Minor từ 0 đến 65535.
- `fk_beacon_artifact`: khóa ngoại từ `beacon.artifact_id` đến `artifact.artifact_id`.
- `beacon_pkey`: khóa chính trên `beacon_id`.

Schema thực tế phù hợp với các ràng buộc đã khai báo trong migration V3. Chưa có thay đổi database hoặc migration.

## 8. Kiểm tra chỉ mục và kế hoạch truy vấn

### 8.1. Chỉ mục thực tế trên PostgreSQL
Đã truy vấn `pg_indexes` và xác nhận ba chỉ mục:
- `beacon_pkey`: B-tree trên `beacon_id`.
- `idx_beacon_artifact_id`: B-tree trên `artifact_id`.
- `uk_beacon_identity`: UNIQUE B-tree trên `(proximity_uuid, major, minor)`.

### 8.2. Kế hoạch truy vấn Public Resolution
Đã chạy `EXPLAIN` với truy vấn tìm Beacon theo UUID, Major, Minor và trạng thái enabled.
Kết quả:
- PostgreSQL sử dụng `Index Scan using uk_beacon_identity`.
- Ba trường định danh được đưa vào `Index Cond`.
- Điều kiện `enabled` được áp dụng dưới dạng `Filter`.

### 8.3. Đánh giá
- Chỉ mục UNIQUE hiện tại phục vụ đúng truy vấn resolve.
- Chưa có bằng chứng cần tạo thêm chỉ mục cho `enabled`.
- Chưa sửa migration hoặc cấu trúc database.
- Kết quả EXPLAIN mới xác nhận kế hoạch truy vấn trên database kiểm thử hiện tại; chưa phải benchmark dưới tải lớn.

## 9. Audit chiến lược PostgreSQL integration test
- Đã kiểm tra `BeaconControllerTest`: test hiện tại sử dụng profile `test` (H2), setup và teardown xóa toàn bộ dữ liệu Beacon, Artifact, HeritageSite và VisitorInteraction. Không dùng nguyên cách này cho PostgreSQL integration test.
- Đã kiểm tra `VisitorInteractionPostgresIT`: sử dụng profile `postgres-test`, nhưng `resetDatabase()` xóa dữ liệu trên nhiều bảng (`visitor_interaction`, `beacon`, `multimedia`, `artifact`, `heritage_site`, `user`, `role`). Không tái sử dụng phương thức reset này vì PostgreSQL test database đang có fixture sẵn.
- Đã xác minh quan hệ Entity:
  - `Artifact` bắt buộc có `HeritageSite`.
  - `Beacon` có thể không gắn `Artifact`.
- Chiến lược fixture cho test LTJ-57: tạo dữ liệu riêng bằng repository, sử dụng UUID ngẫu nhiên; lưu ID các bản ghi do test tạo và chỉ dọn các bản ghi đó theo thứ tự Beacon → Artifact → HeritageSite.
- Hành vi hiện tại cần bảo toàn và kiểm thử: Beacon enabled nhưng chưa gắn Artifact vẫn được public resolve; response có `artifactId = null`. Chưa thay đổi hành vi này khi chưa xác nhận API contract với M3.
- Trạng thái: đã hoàn tất kiểm tra cấu trúc test và xác định phương án cô lập dữ liệu; chưa tạo hoặc chạy PostgreSQL integration test mới.

## 10. Xác minh fixture PostgreSQL integration test
- Đã đối chiếu `HeritageSite` và `Artifact` entity với fixture trong `BeaconResolutionIntegrityIT`.
- `HeritageSite.name` là trường bắt buộc; fixture đã thiết lập.
- `Artifact.name` và `Artifact.heritageSite` là các trường bắt buộc; fixture đã thiết lập.
- Thứ tự cleanup được thiết kế theo quan hệ phụ thuộc: Beacon → Artifact → HeritageSite.
- Test sử dụng UUID ngẫu nhiên và chỉ xóa các bản ghi do chính test tạo; không gọi `deleteAll()` hoặc reset toàn bộ database.
- Chưa ghi nhận kết quả chạy test tại thời điểm cập nhật mục này.

## 11. PostgreSQL Integration Test — Beacon Resolution Integrity

### 11.1. Môi trường kiểm thử
- Đã chạy integration test bằng Docker image maven:3.9.6-eclipse-temurin-17.
- Profile: postgres-integration.
- Spring profile: postgres-test.
- Database: smart_heritage_test.
- PostgreSQL: 16.15.
- Flyway xác nhận 3 migrations hợp lệ và schema hiện tại ở version 3.
- Không cần chạy migration mới.

### 11.2. Integration test
- File: Backend/src/test/java/com/university/backend/integration/BeaconResolutionIntegrityIT.java.
- Kết quả: 4 tests, 0 failures, 0 errors, 0 skipped.
- Các trường hợp đã xác minh:
  - Public resolve trả đúng Beacon, Artifact và HeritageSite khi có mapping.
  - Beacon enabled không có Artifact mapping vẫn resolve thành công theo hành vi hiện tại.
  - Beacon disabled và Beacon không tồn tại đều trả HTTP 404.
  - PostgreSQL từ chối Beacon trùng bộ proximity_uuid, major, minor.

### 11.3. Xác minh unique constraint
- PostgreSQL trả SQLState 23505 khi tạo Beacon trùng identity.
- Constraint được xác nhận qua lỗi thực tế: uk_beacon_identity.
- Test bắt được DataIntegrityViolationException như mong đợi.
- Cảnh báo duplicate key xuất hiện trong log là kết quả dự kiến của test, không phải lỗi kiểm thử.

### 11.4. Kết quả chạy Maven
- Surefire: 134 tests, 0 failures, 0 errors, 0 skipped.
- Failsafe — BeaconResolutionIntegrityIT: 4 tests, 0 failures, 0 errors, 0 skipped.
- Kết quả cuối: BUILD SUCCESS, Maven exit code 0.

### 11.5. Phạm vi còn cần kiểm chứng
- Chưa kiểm thử đồng thời nhiều request tạo Beacon có cùng identity.
- Chưa kiểm thử đầy đủ input UUID, major, minor không hợp lệ và thiếu request parameter trên public resolve.
- Chưa xác minh riêng trường hợp cập nhật mapping Artifact trong lúc có request resolve đồng thời.
- Chưa thay đổi schema hoặc index; mọi thay đổi constraint cần phối hợp M1.

## 12. Mở rộng kiểm thử Public Beacon Resolution

### 12.1. Phát hiện vấn đề từ lần kiểm thử trước
- Lần chạy mở rộng ban đầu có 7 test, trong đó 2 test thất bại.
- `ConstraintViolationException` phát sinh khi Major hoặc Minor vượt giới hạn được xử lý bởi exception handler tổng quát, dẫn đến HTTP 500 thay vì HTTP 400.
- `MissingServletRequestParameterException` phát sinh khi thiếu tham số bắt buộc cũng bị xử lý thành HTTP 500.
- Nguyên nhân nằm ở việc `GlobalExceptionHandler` chưa có handler riêng cho hai loại exception trên.
- Không phát hiện vấn đề từ PostgreSQL, migration hoặc Beacon resolution service trong hai trường hợp này.

### 12.2. Điều chỉnh xử lý exception
File thay đổi: `backend/src/main/java/com/university/backend/exception/GlobalExceptionHandler.java`.

- Bổ sung handler cho `ConstraintViolationException`.
- Chuyển lỗi validation tham số thành HTTP 400 với response theo cấu trúc `ApiResponse`.
- Thông tin lỗi validation được trả về trong danh sách `errors`.
- Bổ sung handler cho `MissingServletRequestParameterException`.
- Khi thiếu tham số bắt buộc, API trả HTTP 400 và thông báo tên tham số bị thiếu.
- Giữ nguyên các handler hiện có, bao gồm xử lý lỗi không tìm thấy tài nguyên (404), xung đột dữ liệu (409), sai kiểu tham số và lỗi hệ thống (500).
- Không thay đổi Beacon Controller, Beacon Service, Entity, Repository hoặc migration trong lần điều chỉnh này.

### 12.3. Các trường hợp PostgreSQL integration test đã xác minh
File: `backend/src/test/java/com/university/backend/integration/BeaconResolutionIntegrityIT.java`.

Tổng cộng 7 test method, bao phủ các trường hợp:

- Public resolve trả đúng Beacon, Artifact và HeritageSite khi có mapping hợp lệ.
- Beacon enabled chưa liên kết Artifact vẫn resolve thành công theo hành vi hiện tại.
- Beacon disabled trả HTTP 404.
- Beacon không tồn tại trả HTTP 404.
- PostgreSQL từ chối Beacon trùng bộ UUID, Major và Minor bằng unique constraint.
- UUID sai định dạng trả HTTP 400.
- Thiếu các request parameter bắt buộc trả HTTP 400.
- Major và Minor nằm ngoài khoảng 0–65535 trả HTTP 400.

Lưu ý: các trường hợp thiếu tham số và giá trị ngoài giới hạn được kiểm tra trong các test method tương ứng; tổng số test method vẫn là 7.

### 12.4. Kết quả kiểm thử sau điều chỉnh
- Surefire: 134 tests, 0 failures, 0 errors, 0 skipped.
- Failsafe — `BeaconResolutionIntegrityIT`: 7 tests, 0 failures, 0 errors, 0 skipped.
- PostgreSQL: 16.15.
- Flyway xác thực thành công 3 migrations; schema ở version 3 và không cần migration mới.
- Kết quả Maven: `BUILD SUCCESS`.
- Exit code: 0.
- Log SQLState 23505 khi kiểm tra Beacon trùng identity là kết quả dự kiến, xác nhận PostgreSQL thực thi `uk_beacon_identity`; không phải lỗi test.

### 12.5. Đánh giá và phần còn lại
- Đã xác minh các trường hợp resolve hợp lệ, không tồn tại, disabled, chưa mapping Artifact và input không hợp lệ.
- Đã xác minh unique constraint ở PostgreSQL từ integration test thực tế.
- Đã khắc phục việc trả HTTP 500 không phù hợp đối với tham số thiếu và tham số vi phạm giới hạn.
- Chưa kiểm thử đồng thời nhiều request tạo Beacon có cùng identity.
- Chưa kiểm thử đồng thời giữa thao tác cập nhật Artifact mapping và public resolve.
- Chưa thực hiện benchmark tải lớn hoặc đo hiệu năng dưới tải đồng thời.
- Chưa có căn cứ để bổ sung index mới; kế hoạch truy vấn hiện tại đã sử dụng `uk_beacon_identity`.
- Chưa thay đổi schema hoặc migration.

## 13. Kiểm thử đồng thời tạo Beacon trên PostgreSQL

### 13.1. Phạm vi kiểm thử
- Mở rộng `BeaconResolutionIntegrityIT` với kiểm thử hai luồng đồng thời tạo Beacon có cùng bộ định danh `UUID + Major + Minor`.
- Hai luồng sử dụng cùng một UUID kiểm thử và cùng Major/Minor, nhưng thực hiện lời gọi `BeaconService.createBeacon()` độc lập.
- Kiểm tra số lượng bản ghi thực tế sau khi cả hai luồng hoàn tất.

### 13.2. Kết quả
- Chỉ một luồng tạo Beacon thành công.
- Luồng còn lại bị từ chối do trùng định danh.
- PostgreSQL thực thi unique constraint `uk_beacon_identity`, ghi nhận SQLState `23505` khi phát sinh xung đột.
- Kiểm tra dữ liệu sau thực thi xác nhận chỉ tồn tại một Beacon với bộ định danh được kiểm thử.

### 13.3. Kết quả chạy PostgreSQL Integration Test
- Test class: `BeaconResolutionIntegrityIT`.
- PostgreSQL: `16.15`.
- Flyway: xác thực thành công 3 migrations V1–V3; schema version 3.
- Tests run: 8.
- Failures: 0.
- Errors: 0.
- Skipped: 0.
- Maven: `BUILD SUCCESS`.
- Exit code: `0`.

### 13.4. Đánh giá
- Đã có bằng chứng kiểm thử PostgreSQL cho trường hợp hai yêu cầu tạo Beacon trùng định danh được thực hiện đồng thời.
- Unique constraint ở database bảo vệ tính duy nhất ngay cả khi kiểm tra trước khi lưu ở application layer không ngăn được race condition.
- Tại thời điểm ghi Section 13, chưa xác minh cập nhật Artifact mapping đồng thời với resolve; nội dung này đã được kiểm thử và cập nhật kết quả tại Section 14.

## 14. Kiểm thử đồng thời cập nhật Artifact mapping và resolve Beacon

### 14.1. Mục tiêu
- Kiểm tra tính nhất quán khi một Beacon được cập nhật Artifact mapping đồng thời với các request resolve.
- Không thay đổi Entity, Repository, Service hoặc database migration chỉ để phục vụ kiểm thử.

### 14.2. Thiết lập kiểm thử
- Tạo một HeritageSite và hai Artifact cùng thuộc HeritageSite đó.
- Tạo một Beacon ban đầu được mapping với Artifact thứ nhất.
- Sử dụng hai luồng thực thi đồng thời:
  - Luồng cập nhật: thay đổi mapping giữa hai Artifact trong 50 lần cập nhật.
  - Luồng resolve: thực hiện 100 lần gọi `BeaconService.resolveBeacon()`.

### 14.3. Điều kiện xác minh
- Artifact ID trả về phải thuộc một trong hai Artifact hợp lệ.
- `artifactName` phải tương ứng với `artifactId`.
- `siteId` và `siteName` phải nhất quán với HeritageSite của hai Artifact.
- Exception hoặc assertion failure trong các luồng phụ phải được truyền về test chính thông qua `Future.get()`.

### 14.4. Kết quả PostgreSQL integration test
- Test class: `BeaconResolutionIntegrityIT`.
- PostgreSQL: 16.15.
- Flyway: xác thực thành công 3 migrations, schema hiện tại ở version 3.
- Tổng số test: 9.
- Failures: 0.
- Errors: 0.
- Skipped: 0.
- Maven Failsafe: `BUILD SUCCESS`.
- Exit code: 0.

### 14.5. Đánh giá
- Kiểm thử đồng thời cập nhật Artifact mapping và resolve Beacon đã vượt qua.
- Không phát hiện kết quả resolve tham chiếu Artifact không hợp lệ hoặc dữ liệu Artifact/HeritageSite không nhất quán trong các lần kiểm thử.
- PostgreSQL tiếp tục thực thi unique constraint `uk_beacon_identity`; các lỗi SQLState 23505 xuất hiện trong hai test chủ động kiểm tra duplicate identity và được xử lý như kết quả mong đợi.
- Chưa có benchmark tải lớn; kết quả hiện tại xác minh tính nhất quán trong kịch bản kiểm thử đồng thời, không phải cam kết hiệu năng dưới tải production.


## 15. Xác minh hồi quy sau khi hoàn thiện Beacon Resolution Integrity

### 15.1. Phạm vi kiểm thử

Chạy kết hợp unit test và PostgreSQL integration test bằng Docker Maven:

- `BeaconControllerTest`
- `BeaconServiceTest`
- `BeaconResolutionIntegrityIT`

### 15.2. Kết quả

| Test suite | Tests | Failures | Errors | Skipped |
|---|---:|---:|---:|---:|
| BeaconControllerTest | 6 | 0 | 0 | 0 |
| BeaconServiceTest | 7 | 0 | 0 | 0 |
| BeaconResolutionIntegrityIT | 9 | 0 | 0 | 0 |
| **Tổng cộng** | **22** | **0** | **0** | **0** |

- PostgreSQL: 16.15.
- Flyway validated 3 migrations; schema version hiện tại là 3.
- Maven: `BUILD SUCCESS`.
- Exit code: `0`.

### 15.3. Đánh giá

Các unit test Beacon hiện có tiếp tục hoạt động sau những thay đổi xử lý lỗi request.
PostgreSQL integration test xác minh lại các trường hợp resolve, identity uniqueness
và xử lý đồng thời. Không có test thất bại, lỗi hoặc bị bỏ qua trong lần chạy này.

Các log SQLState `23505` xuất hiện ở những test chủ động tạo Beacon trùng identity,
phản ánh unique constraint `uk_beacon_identity` từ chối dữ liệu trùng như mong đợi;
không phải lỗi kiểm thử.

Kết quả này xác nhận 22 test thuộc ba test suite nêu trên đã vượt qua.
Không đại diện cho kết quả chạy toàn bộ test suite của dự án.
