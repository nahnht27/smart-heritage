# LTJ-56 — Tối ưu truy vấn Artifact và Multimedia

## 1. Thông tin công việc
- Sprint: 5
- Vai trò: M2 — Backend Developer
- Mã công việc: S5-M2-01 (LTJ-56)
- Nhánh Git: `feat/s5-m2-artifact-query-optimization`
- Ngày cập nhật: 12/11/2026

## 2. Kết quả kiểm tra mã nguồn

### 2.1. Artifact API
Đã kiểm tra các thành phần:
- `ArtifactController`
- `ArtifactService`
- `ArtifactRepository`
- `ArtifactSpecification`
- `ArtifactResponse`
- `Artifact`
- `HeritageSite`

Kết quả:
- API lấy danh sách Artifact không có tham số phân trang vẫn trả về `ApiResponse<List<ArtifactResponse>>`.
- API có tham số phân trang vẫn trả về `ApiResponse<PageResponse<ArtifactResponse>>`.
- Các bộ lọc hiện có gồm `siteId` và `keyword`.
- Logic sắp xếp, phân trang và kiểm tra tham số hiện tại cần được giữ nguyên.
- `ArtifactResponse` gồm các trường: `artifactId`, `siteId`, `siteName`, `name`, `description`.

### 2.2. Quan hệ giữa các Entity
- `Artifact` có quan hệ ManyToOne với `HeritageSite`, sử dụng `FetchType.LAZY`.
- `Multimedia` có quan hệ ManyToOne một chiều với `Artifact`, sử dụng `FetchType.LAZY`.
- `Artifact` hiện không khai báo danh sách Multimedia.
- Multimedia được truy xuất thông qua API riêng.
- API lấy thông tin Artifact không cần tải các bản ghi Multimedia nếu không sử dụng.

### 2.3. Vị trí phát sinh truy vấn bổ sung
Trong `ArtifactResponse.fromEntity()`, quá trình ánh xạ dữ liệu truy cập:
`artifact.getHeritageSite().getName()`.

Do quan hệ `Artifact.heritageSite` sử dụng `FetchType.LAZY`, khi truy vấn danh sách Artifact, Hibernate phát sinh các câu SELECT riêng để tải `HeritageSite` trong quá trình ánh xạ response.

Kết quả đo SQL baseline trên PostgreSQL:
- Không phân trang: 1 câu SELECT Artifact và 3 câu SELECT HeritageSite, tổng cộng 4 câu SQL cho 24 Artifact.
- Có phân trang: 1 câu SELECT Artifact, 1 câu COUNT và 3 câu SELECT HeritageSite, tổng cộng 5 câu SQL.
- Số truy vấn tải HeritageSite là 3, tương ứng 3 HeritageSite được tham chiếu trong fixture, không phải 24 truy vấn cho 24 Artifact.
- Không ghi nhận Multimedia entity load trong các truy vấn Artifact được kiểm thử.

Kết luận: Đã xác nhận truy vấn bổ sung do tải lazy quan hệ `Artifact.heritageSite`. Chưa có bằng chứng Multimedia gây N+1 trong API Artifact được kiểm thử.

## 3. Kiểm tra môi trường PostgreSQL
Đã xác nhận:
- Database kiểm thử: `smart_heritage_test`.
- Flyway đã chạy đến migration V3.
- Spring Boot đã khởi động thành công với cấu hình PostgreSQL kiểm thử.
- Hibernate đã kiểm tra schema thành công.
- Cấu hình sử dụng: `application-postgres-test.yml`.
- `ddl-auto` đang sử dụng giá trị `validate`.
- Maven Failsafe phiên bản `3.2.5`.
- Profile kiểm thử: `postgres-integration`.
- Failsafe nhận các lớp kiểm thử có tên kết thúc bằng `IT.java`.

## 4. Kiểm tra khóa ngoại và nguyên tắc tạo dữ liệu kiểm thử
Đã xác nhận các quan hệ khóa ngoại:
- `artifact.site_id` tham chiếu `heritage_site.site_id`.
- `multimedia.artifact_id` tham chiếu `artifact.artifact_id`.
- `beacon.artifact_id` tham chiếu `artifact.artifact_id`.
- `visitor_interaction.artifact_id` tham chiếu `artifact.artifact_id`.

Các khóa ngoại được kiểm tra đều có quy tắc `NO ACTION`.

Nguyên tắc kiểm thử:
- Chỉ tạo dữ liệu riêng phục vụ LTJ-56.
- Chỉ xóa những bản ghi do chính bài kiểm thử tạo ra.
- Xóa theo thứ tự Multimedia → Artifact → HeritageSite.
- Không sử dụng `TRUNCATE`.
- Không xóa dữ liệu Beacon hoặc VisitorInteraction không thuộc fixture của bài kiểm thử.

## 5. Lưu ý về các bài kiểm thử hiện có
`VisitorInteractionPostgresIT` gọi `resetDatabase()` trong `@BeforeEach`.
Phương thức này xóa dữ liệu trên các bảng dùng chung, bao gồm:
- `visitor_interaction`
- `beacon`
- `multimedia`
- `artifact`
- `heritage_site`
- `user`
- `role`
Không chạy toàn bộ các PostgreSQL integration test trên database dùng chung khi chưa kiểm soát được thao tác xóa dữ liệu.
Kiểm thử riêng của task LTJ-56 được chạy bằng Maven Failsafe với tham số:
`-Dit.test=ArtifactQueryOptimizationIT`
Bài kiểm thử ArtifactQueryOptimizationIT sử dụng fixture riêng và chỉ dọn các bản ghi do chính bài kiểm thử tạo ra

## 6. Tiến độ thực hiện
- [x] Kiểm tra các truy vấn SELECT bổ sung do tải lazy quan hệ Artifact - HeritageSite bằng SQL thực tế.
- [x] Triển khai EntityGraph cho truy vấn Artifact có và không có phân trang.
- [x] Đo và so sánh số lượng câu SQL trước và sau tối ưu.
- [x] Kiểm tra response List/PageResponse, lọc keyword, sắp xếp và phân trang trong ArtifactQueryOptimizationIT.
- [x] Kiểm tra trường hợp Artifact không có Multimedia, có một Multimedia và có nhiều Multimedia.
- [x] Kiểm tra nhiều Artifact cùng tham chiếu HeritageSite, phân trang và kết quả rỗng.
- [x] Chạy ArtifactQueryOptimizationIT trên PostgreSQL.
- [x] Chạy bộ kiểm thử Surefire hiện có: 134 tests, 0 failures, 0 errors, 0 skipped.
- [x] Kiểm tra bộ lọc siteId bằng PostgreSQL integration test.
- [x] Kiểm tra trạng thái Git và `git diff --check`.
- [x] Hoàn thiện rà soát cuối cùng và báo cáo kết quả LTJ-56.

## 7. Kiểm tra chi tiết Entity và cách đo baseline
Đã kiểm tra trực tiếp mã nguồn:
- `Artifact` tham chiếu `HeritageSite` bằng `ManyToOne` và `FetchType.LAZY`.
- `Multimedia` tham chiếu `Artifact` bằng `ManyToOne` và `FetchType.LAZY`.
- `Artifact` không có thuộc tính collection Multimedia.
- `ArtifactResponse.fromEntity()` đọc `siteId` và `siteName` từ `HeritageSite`.

Nhận định phục vụ thiết kế bài đo:
- Truy vấn danh sách Artifact có thể phát sinh SELECT bổ sung khi truy cập HeritageSite.
- Số truy vấn bổ sung cần được đo với nhiều HeritageSite khác nhau.
- Cần có trường hợp nhiều Artifact cùng tham chiếu một HeritageSite để kiểm tra ảnh hưởng của persistence context.
- Cần kiểm tra cả trường hợp Artifact không có Multimedia, có một Multimedia và có nhiều Multimedia.
- Không được kết luận N+1 chỉ dựa trên số lượng Artifact; phải căn cứ số câu SQL đo được.

Đã xác nhận phương án tạo fixture:
- Tạo HeritageSite, Artifact và Multimedia bằng `JdbcTemplate`.
- Lưu lại các ID do bài kiểm thử tạo.
- Chỉ dọn Multimedia, Artifact và HeritageSite thuộc fixture của LTJ-56.
- Không sử dụng phương thức `resetDatabase()` của `VisitorInteractionPostgresIT`.
Đã có số liệu baseline tại Mục 9. Chưa xác nhận N+1 và chưa thay đổi mã nguồn nghiệp vụ.

## 8. Biên dịch kiểm thử tích hợp
- Đã tạo file `backend/src/test/java/com/university/backend/integration/ArtifactQueryOptimizationIT.java`.
- Phát hiện file kiểm thử có ký tự UTF-8 BOM ở đầu file, khiến Maven báo lỗi `illegal character: '\ufeff'`.
- Đã chuẩn hóa file sang UTF-8 không BOM.
- Đã chạy `mvn -DskipTests test-compile` bằng Docker Maven 3.9.6 với Java 17.
- Kết quả: `BUILD SUCCESS`; biên dịch thành công 15 file test.
- Đã chạy kiểm thử tích hợp PostgreSQL riêng cho ArtifactQueryOptimizationIT; kết quả và số liệu baseline được ghi tại Mục 9.

## 9. Đo baseline truy vấn trên PostgreSQL
- Đã chạy `ArtifactQueryOptimizationIT` bằng Docker Maven 3.9.6, Java 17, với profile `postgres-integration` và Spring profile `postgres-test`.
- Cơ sở dữ liệu kiểm thử: PostgreSQL 16.15, `smart_heritage_test`.
- Flyway xác thực thành công 3 migrations; schema đã ở phiên bản 3 và không cần migration bổ sung.
- Kết quả: 3 kiểm thử chạy, 0 failures, 0 errors, 0 skipped; `BUILD SUCCESS`.

### Số liệu trước tối ưu
| Trường hợp | SQL statements | Entity loads |
|---|---:|---|
| Danh sách không phân trang, 24 Artifact | 4 | HeritageSite: 3; Multimedia: 0 |
| Danh sách phân trang, 10/24 Artifact | 5 | Multimedia: 0 |
| Danh sách không có kết quả | 1 | Chưa ghi nhận riêng |

### Nhận xét
- Hai trường hợp danh sách đều không phát sinh Multimedia entity load. Chưa có bằng chứng về N+1 do tải Multimedia trong các API Artifact được kiểm thử.
- Trường hợp không phân trang ghi nhận 3 HeritageSite entity loads cho 24 Artifact. Cần kiểm tra SQL thực tế để xác định chi phí truy vấn quan hệ Artifact - HeritageSite.
- Trường hợp phân trang ghi nhận 5 SQL statements. Cần phân tích từng câu SQL trước khi quyết định phương án tối ưu.
- Đây là baseline trước tối ưu, chưa phải kết quả chứng minh cải thiện hiệu năng.

## 10. Xác nhận lại baseline PostgreSQL và trạng thái SQL logging
- Database: `smart_heritage_test`, PostgreSQL 16.15.
- Flyway đã validate thành công 3 migrations; schema hiện tại ở version 3.
- Integration test `ArtifactQueryOptimizationIT`: 3 tests, 0 failures, 0 errors, 0 skipped.
- Kết quả build: `BUILD SUCCESS`.
- Baseline xác nhận lại:
  - Unpaged: 4 SQL statements; 3 HeritageSite entity loads; 0 Multimedia entity loads.
  - Paged: 5 SQL statements; 0 Multimedia entity loads.
  - Empty result: 1 SQL statement.
- Chưa xác nhận có N+1; chưa thay đổi code nghiệp vụ.
- SQL logger chưa hiển thị nội dung câu SQL trong output lần chạy này. Cần bật trực tiếp `spring.jpa.show-sql` để thu thập SQL trước khi kết luận nguyên nhân và chọn giải pháp tối ưu.

## 11. Phân tích SQL baseline và xác định truy vấn tải quan hệ
- Database: `smart_heritage_test`, PostgreSQL 16.15.
- Integration test: `ArtifactQueryOptimizationIT`.
- Kết quả: 3 tests, 0 failures, 0 errors, 0 skipped; `BUILD SUCCESS`.
- Đã bật `spring.jpa.show-sql=true` và thu được SQL thực tế.

### SQL không phân trang
- 1 câu SQL lấy danh sách Artifact.
- 3 câu SQL riêng để tải `HeritageSite` theo `site_id`.
- Tổng cộng: 4 câu SQL.
- Fixture có 24 Artifact và 3 HeritageSite được tham chiếu.

### SQL phân trang
- 1 câu SQL lấy danh sách Artifact.
- 1 câu SQL đếm tổng số Artifact.
- 3 câu SQL riêng để tải `HeritageSite`.
- Tổng cộng: 5 câu SQL; kết quả trả về 10/24 Artifact.

### Kết luận từ số liệu
- Đã xác định truy vấn phụ phát sinh do tải lazy quan hệ `Artifact.heritageSite` khi ánh xạ `ArtifactResponse.fromEntity()`.
- Số lần tải `HeritageSite` trong fixture là 3, tương ứng 3 site được tham chiếu; chưa phải 24 truy vấn cho 24 Artifact.
- Không có truy vấn tải entity Multimedia trong hai trường hợp danh sách Artifact: `Multimedia entity loads = 0`.
- Chưa có bằng chứng Multimedia gây N+1 trong API danh sách Artifact.
- Hướng tối ưu đang xem xét: tải quan hệ to-one `heritageSite` cùng truy vấn Artifact bằng `EntityGraph` hoặc giải pháp tương đương; không tải collection Multimedia.
- Chưa sửa code nghiệp vụ và chưa có số liệu sau tối ưu.

## 12. Áp dụng EntityGraph và kiểm tra lần chạy Maven
- Đã cập nhật `ArtifactRepository`:
  - Bổ sung `@EntityGraph(attributePaths = "heritageSite")` cho truy vấn `findAll(Specification, Sort)`.
  - Bổ sung `@EntityGraph(attributePaths = "heritageSite")` cho truy vấn `findAll(Specification, Pageable)`.
  - Không thêm quan hệ Multimedia vào Artifact.
- Lần chạy Maven gần nhất: 134 bài kiểm thử Surefire, 0 failures, 0 errors, 0 skipped.
- Maven thất bại tại bước `spring-boot:repackage` do tải dependency `spring-core:6.0.10` từ Maven Central bị gián đoạn (`Premature end of chunk coded message body`).
- Tại thời điểm ghi nhận Mục 12, chưa có số liệu sau tối ưu được xác nhận từ lần chạy Failsafe tương ứng.
- Kết quả kiểm thử và số liệu sau tối ưu được xác nhận ở Mục 13 và Mục 14 bằng lần chạy PostgreSQL integration test độc lập.

## 13. Kết quả đo sau khi áp dụng EntityGraph
- Môi trường kiểm thử: PostgreSQL 16.15, database `smart_heritage_test`, profile `postgres-test`.
- Thay đổi được kiểm chứng: `ArtifactRepository` sử dụng `@EntityGraph(attributePaths = "heritageSite")` cho cả truy vấn có phân trang và không phân trang.

### So sánh số câu SQL
| Trường hợp | Trước tối ưu | Sau tối ưu |
|---|---:|---:|
| Truy vấn Artifact không phân trang | 4 | 1 |
| Truy vấn Artifact có phân trang | 5 | 2 |
| Truy vấn không có kết quả | 1 | 1 |

- Truy vấn không phân trang giảm 3 câu SQL (75%).
- Truy vấn có phân trang giảm 3 câu SQL (60%).
- Truy vấn có phân trang vẫn thực hiện câu `COUNT` riêng để xác định tổng số bản ghi.
- SQL truy vấn Artifact đã JOIN `heritage_site`, không còn các câu SELECT riêng để tải từng HeritageSite.
- Số Multimedia entity được tải trong các truy vấn Artifact: 0.
- Kiểm thử bao gồm Artifact không có Multimedia, có một Multimedia, có nhiều Multimedia, nhiều Artifact dùng chung HeritageSite, phân trang và kết quả rỗng.

### Kết quả kiểm thử
- Chạy `ArtifactQueryOptimizationIT` trên PostgreSQL.
- Tổng số: 3 tests.
- Failures: 0; Errors: 0; Skipped: 0.
- Kết quả Maven: `BUILD SUCCESS`.
- Đã xác nhận số liệu sau tối ưu bằng Hibernate Statistics và SQL log.

### Kết luận
- Nguyên nhân truy vấn dư trước tối ưu là quan hệ LAZY `Artifact.heritageSite` được truy cập khi ánh xạ `ArtifactResponse.fromEntity()`.
- EntityGraph giúp tải HeritageSite cùng truy vấn Artifact.
- Không thêm quan hệ Multimedia vào Artifact và không tải Multimedia không cần thiết.
- Chưa thay đổi cấu trúc response API.
## 14. Xác nhận lại kết quả sau khi chuẩn hóa nhãn log

- Ngày thực hiện: 12/11/2026.
- Đã đổi nhãn output từ `[LTJ-56 BASELINE]` thành `[LTJ-56 AFTER]` và đổi tên ba phương thức test để thể hiện đúng mục đích đo sau tối ưu.
- Môi trường: Docker Maven 3.9.6, Java 17.0.11, PostgreSQL 16.15, database `smart_heritage_test`.
- Spring profile: `postgres-test`; Maven profile: `postgres-integration`.
- Flyway xác thực thành công 3 migrations; schema version 3 đã cập nhật.

### Số liệu sau tối ưu được xác nhận lại

| Trường hợp | SQL statements |
|---|---:|
| Artifact không phân trang | 1 |
| Artifact có phân trang | 2 |
| Không có kết quả | 1 |

- Unpaged: `HeritageSite entity loads = 3`; `Multimedia entity loads = 0`.
- Paged: `Multimedia entity loads = 0`.
- SQL truy vấn Artifact sử dụng JOIN với `heritage_site`.
- Truy vấn phân trang vẫn có câu COUNT riêng.
- Kết quả: 3 tests, 0 failures, 0 errors, 0 skipped.
- Maven Failsafe 3.2.5: `BUILD SUCCESS`.

### Kết luận

- Kết quả sau tối ưu được xác nhận lại sau khi chuẩn hóa nhãn log.
- So với baseline, truy vấn không phân trang giảm từ 4 xuống 1 câu SQL; truy vấn phân trang giảm từ 5 xuống 2 câu SQL.
- Không có Multimedia entity load trong các truy vấn Artifact được kiểm thử.
- Chưa chạy toàn bộ PostgreSQL integration test suite do rủi ro `VisitorInteractionPostgresIT` xóa dữ liệu dùng chung.

## 15. Kiểm thử bổ sung bộ lọc siteId
- Bổ sung test `filtersArtifactsBySiteIdAfterOptimization()` trong `ArtifactQueryOptimizationIT`.
- API được kiểm thử: `GET /api/artifacts?siteId={siteId}`.
- Môi trường: PostgreSQL 16.15, database `smart_heritage_test`, Spring profile `postgres-test`.
- Kết quả: API trả về đúng 9 Artifact thuộc HeritageSite được chọn.
- Tất cả phần tử trong response có `siteId` bằng `targetSiteId`.
- SQL log ghi nhận một câu kiểm tra sự tồn tại của HeritageSite và một câu truy vấn Artifact có JOIN `heritage_site`.
- Không phát sinh Multimedia entity loads trong các phép đo unpaged và paged.
- `ArtifactQueryOptimizationIT`: 4 tests, 0 failures, 0 errors, 0 skipped.
- Maven Failsafe 3.2.5: `BUILD SUCCESS`.

## 16. Kiểm thử phân trang dữ liệu lớn và kiểm tra Artifact trùng lặp
- Bổ sung test `handlesLargePagedArtifactResultWithoutDuplicateArtifacts()` trong `ArtifactQueryOptimizationIT`.
- Tạo thêm 125 Artifact trên bộ dữ liệu fixture 24 Artifact, nâng tổng số bản ghi kiểm thử lên 149.
- Gọi API với `page=0`, `size=100` và `page=1`, `size=100`.
- Xác nhận cả hai trang đều trả về `totalElements = 149`.
- Xác nhận trang đầu có 100 Artifact, trang thứ hai có 49 Artifact.
- Kiểm tra không trùng `artifactId` trong từng trang và giữa hai trang.
- Tổng hợp ID của hai trang thu được đúng 149 ID duy nhất.

Kết quả chạy PostgreSQL integration test:

- Database: PostgreSQL 16.15, `smart_heritage_test`.
- Flyway xác thực thành công 3 migrations; schema ở version 3.
- `ArtifactQueryOptimizationIT`: 5 tests, 0 failures, 0 errors, 0 skipped.
- Kết quả Maven: `BUILD SUCCESS`.

Kết luận: kiểm thử phân trang với tập dữ liệu lớn xác nhận số lượng, metadata phân trang và tính duy nhất của Artifact giữa các trang.
