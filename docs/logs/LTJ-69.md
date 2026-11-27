# LTJ-69 — S6-M2-03: Kiểm thử tích hợp và nghiệm thu Content & Beacon

## 1. Mục tiêu

Ghi nhận kết quả kiểm thử tích hợp và nghiệm thu các chức năng Backend thuộc phạm vi Content, Beacon và Visitor Interaction trong Sprint 6.

Phạm vi kiểm thử bao gồm:

- Quan hệ dữ liệu HeritageSite → Artifact → Multimedia.
- Tính toàn vẹn dữ liệu khi cập nhật và xóa Artifact.
- Cập nhật quan hệ Artifact sang HeritageSite khác và Multimedia sang Artifact khác.
- Tạo, cập nhật, quản lý và ánh xạ Beacon với Artifact.
- Phân giải Beacon thông qua API công khai.
- Kiểm tra điều kiện ghi nhận tương tác `BEACON_TRIGGER`.
- Tìm kiếm, lọc, phân trang và tối ưu truy vấn Content.
- Tính toàn vẹn dữ liệu Visitor Interaction và Analytics.

## 2. Tổng hợp kết quả kiểm thử

Các nhóm kiểm thử đã thực thi đều hoàn thành thành công.

| Nhóm kiểm thử | Số lượng test | Môi trường | Kết quả |
|---|---:|---|---|
| BeaconResolutionIntegrityIT | 17 | PostgreSQL | PASS |
| ArtifactQueryOptimizationIT | 5 | PostgreSQL | PASS |
| VisitorInteractionPostgresIT | 23 | PostgreSQL | PASS |
| 8 lớp kiểm thử Controller/Service | 158 | H2 / Mockito | PASS |
| **Tổng cộng** | **204** | | **PASS** |
ContentRelationshipPostgresIT | 1 | PostgreSQL | PASS

Kết quả tổng hợp:

- Tổng số test: 204.
- Số test thành công: 204.
- Số test thất bại: 0.
- Số test phát sinh lỗi: 0.
- Số test bị bỏ qua: 0.

Lần regression 8 lớp Controller/Service gần nhất hoàn thành lúc `2026-11-27T15:26:17Z`, với `BUILD SUCCESS`.

Hai test cập nhật quan hệ mới được xác nhận PASS trong lần chạy riêng lúc `2026-11-27T15:22:52Z`, sau đó được bao gồm trong lần regression 158 test.

## 3. Kết quả kiểm thử theo chức năng

### 3.1. HeritageSite

Đã kiểm tra:

- Lấy danh sách và xem chi tiết HeritageSite.
- ADMIN có thể tạo, cập nhật và xóa HeritageSite.
- VISITOR không được phép thực hiện các thao tác ghi dữ liệu.
- Không cho phép xóa HeritageSite khi còn Artifact liên quan.
- Tìm kiếm theo từ khóa, không phân biệt chữ hoa và chữ thường.
- Phân trang và sắp xếp kết quả.
- Kiểm tra các tham số phân trang, kích thước trang và sắp xếp không hợp lệ.
- Đảm bảo thứ tự sắp xếp ổn định giữa các trang.
- Xử lý trường hợp HeritageSite không tồn tại.

**Bằng chứng:** `HeritageSiteControllerTest`.

### 3.2. Artifact

Đã kiểm tra:

- ADMIN có thể cập nhật và xóa Artifact.
- Cập nhật thành công Artifact từ HeritageSite ban đầu sang một HeritageSite khác đang tồn tại.
- Xác nhận quan hệ mới qua API GET sau khi cập nhật.
- Không cho phép cập nhật Artifact khi HeritageSite đích không tồn tại.
- Không cho phép xóa Artifact khi còn Multimedia, VisitorInteraction hoặc Beacon liên quan.
- Các bản ghi liên quan được giữ nguyên khi thao tác xóa bị từ chối.
- Tìm kiếm, lọc theo HeritageSite, phân trang và sắp xếp.
- Kiểm tra hiệu năng truy vấn danh sách Artifact trên PostgreSQL.

**Bằng chứng:**
- `ArtifactControllerTest`
- `ArtifactQueryOptimizationIT`

### 3.3. Multimedia

Đã kiểm tra:

- ADMIN có thể tạo, cập nhật và xóa Multimedia.
- Người dùng có thể truy vấn danh sách và chi tiết Multimedia.
- Lọc danh sách Multimedia theo `artifactId`.
- Cập nhật thành công Multimedia từ Artifact ban đầu sang một Artifact khác đang tồn tại.
- Xác nhận quan hệ mới và dữ liệu đã lưu qua API GET sau khi cập nhật.
- Không cho phép tạo hoặc cập nhật Multimedia khi Artifact được tham chiếu không tồn tại.
- Kiểm tra số lượng câu lệnh SQL khi truy vấn danh sách nhằm hạn chế vấn đề N+1.

**Bằng chứng:** `MultimediaControllerTest`.

### 3.4. Beacon

Đã kiểm tra:

- ADMIN có thể tạo, xem danh sách, cập nhật và xóa Beacon.
- Từ chối Beacon trùng định danh `(uuid, major, minor)`.
- Cập nhật ánh xạ Beacon sang Artifact khác.
- Phân giải Beacon thông qua API công khai.
- Beacon không tồn tại hoặc đang bị vô hiệu hóa không được phân giải thành công.
- Beacon chưa được gán Artifact vẫn có thể phân giải; các thông tin Artifact và HeritageSite trả về `null`.
- Kiểm tra tính nhất quán khi cập nhật ánh xạ và phân giải Beacon đồng thời.
- Kiểm tra các ràng buộc dữ liệu và chỉ mục trên PostgreSQL.

**Bằng chứng:**
- `BeaconControllerTest`
- `BeaconResolutionIntegrityIT`

### 3.5. Visitor Interaction và BEACON_TRIGGER

Đã kiểm tra:

- Ghi nhận tương tác của người dùng đã đăng nhập và khách ẩn danh.
- Xử lý idempotency khi gửi lại cùng `eventId`.
- Kiểm tra điều kiện ghi nhận `BEACON_TRIGGER`:
  - Bắt buộc cung cấp `beaconId`.
  - Beacon phải tồn tại và đang được bật.
  - Beacon phải được gán Artifact.
  - Artifact của Beacon phải trùng với `artifactId` trong request.
  - Không chấp nhận `beaconId` đối với các loại tương tác không phải `BEACON_TRIGGER`.
- Từ chối dữ liệu tương tác không hợp lệ.
- Kiểm tra thống kê tổng quan, chuỗi thời gian và ngôn ngữ.
- Đảm bảo bản ghi VisitorInteraction được giữ lại khi xóa Beacon; khóa ngoại `beacon_id` được đặt thành `null`.

**Bằng chứng:**
- `VisitorInteractionControllerTest`
- `VisitorInteractionServiceTest`
- `VisitorInteractionPostgresIT`

## 4. Kiểm thử hiệu năng và tính toàn vẹn dữ liệu

Các kết quả kiểm thử trên PostgreSQL:

- Truy vấn danh sách Artifact không phân trang sử dụng 1 câu lệnh SQL.
- Truy vấn Artifact có phân trang sử dụng 1 câu lệnh SELECT và 1 câu lệnh COUNT.
- Số lần tải entity Multimedia khi truy vấn danh sách Artifact bằng 0.
- Kiểm thử dữ liệu gồm 149 Artifact, phân trang thành hai trang có 100 và 49 bản ghi, không xuất hiện ID trùng lặp.
- Kiểm tra đường truy vấn tối ưu khi phân giải Beacon.
- Kiểm tra các ràng buộc UNIQUE, FOREIGN KEY và CHECK trên PostgreSQL.
- Kiểm tra các tình huống tạo dữ liệu và cập nhật ánh xạ đồng thời.

## 5. Các giới hạn về bằng chứng kiểm thử

Các nội dung dưới đây là những phần chưa có đủ bằng chứng kiểm thử, không đồng nghĩa với việc đã phát hiện lỗi trong implementation:

1. Chưa có một bài kiểm thử PostgreSQL end-to-end thực hiện toàn bộ luồng tạo HeritageSite → Artifact → Multimedia và cập nhật các quan hệ trong cùng một kịch bản. Các test cập nhật quan hệ Artifact và Multimedia hiện được xác nhận trên H2/MockMvc.
2. Các trường hợp POST `BEACON_TRIGGER` hợp lệ và không hợp lệ đã được kiểm thử ở tầng Controller/Service trên H2 và Mockito. PostgreSQL integration hiện xác nhận tính toàn vẹn của Interaction khi xóa Beacon, chưa kiểm thử đầy đủ các trường hợp POST `BEACON_TRIGGER` trên PostgreSQL.
3. Chưa thực hiện kiểm thử iBeacon bằng thiết bị vật lý và xác minh hoạt động trên thiết bị di động thực tế.

Các giới hạn trên cần được giữ rõ trong báo cáo nghiệm thu, không suy diễn thành các chức năng đã được kiểm chứng end-to-end trên PostgreSQL hoặc thiết bị thật.

## 6. Kết luận nghiệm thu

Các nhóm kiểm thử đã thực thi trong phạm vi S6-M2-03 đều hoàn thành thành công, với tổng cộng **203 test PASS**, không có Failure hoặc Error.

Kết quả kiểm thử cung cấp bằng chứng về tính đúng đắn của các chức năng Content, Beacon, Visitor Interaction, Analytics, các ràng buộc dữ liệu và tối ưu truy vấn trong phạm vi đã kiểm tra.

Đã bổ sung bằng chứng cho hai trường hợp cập nhật quan hệ thành công:
- Artifact chuyển sang HeritageSite khác.
- Multimedia chuyển sang Artifact khác.

## 7. Tài liệu và bằng chứng liên quan

- `docs/integration/api-contract.md`
- `backend/src/test/java/com/university/backend/controller/`
- `backend/src/test/java/com/university/backend/`
- `BeaconResolutionIntegrityIT`
- `ArtifactQueryOptimizationIT`
- `VisitorInteractionPostgresIT`