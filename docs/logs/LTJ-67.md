# LTJ-67 — Chuẩn bị dữ liệu Demo và Seed Database

## 1. Tiến độ đã hoàn thành

### Kiểm tra cấu trúc dữ liệu
- Đã kiểm tra các Entity: HeritageSite, Artifact, Multimedia, Beacon và VisitorInteraction.
- Xác nhận mỗi Artifact phải thuộc một HeritageSite.
- Xác nhận mỗi Multimedia phải thuộc một Artifact.
- Beacon có định danh duy nhất theo bộ ba Proximity UUID, Major và Minor.
- Beacon có thể được ánh xạ tới Artifact; quan hệ này có thể để trống.
- VisitorInteraction yêu cầu eventId duy nhất, visitorId, Artifact, loại tương tác, ngôn ngữ và thời gian hợp lệ.

### Kiểm tra nghiệp vụ tương tác
- BEACON_TRIGGER bắt buộc có Beacon đang bật.
- Beacon phải được ánh xạ tới đúng Artifact trong lượt tương tác.
- Các loại tương tác khác không được truyền beaconId.
- eventId được sử dụng để kiểm soát gửi sự kiện trùng lặp.

### Kiểm tra Analytics
- Số lượng khách truy cập duy nhất được tính theo visitorId.
- Dữ liệu Timeseries được nhóm theo ngày UTC.
- Các ngày không có tương tác vẫn được trả về với giá trị 0.
- Khoảng thời gian truy vấn sử dụng quy ước [from, to).
- Thống kê ngôn ngữ được chuẩn hóa bằng cách loại bỏ khoảng trắng đầu và cuối.

### Kiểm tra và cập nhật Database
- Đã tạo bản sao lưu PostgreSQL trước khi chạy migration.
- Đã áp dụng thành công Flyway V3 và V4 trên PostgreSQL local.
- Đã xác minh Flyway Schema History cập nhật thành công đến V4.
- Đã xác minh bảng Beacon và các ràng buộc khóa ngoại, khóa duy nhất, giới hạn Major/Minor.
- Đã xác minh VisitorInteraction có visitorId và beaconId theo thiết kế.
- Đã xác nhận các bảng dữ liệu nghiệp vụ hiện chưa có dữ liệu demo.

### Kiểm tra Backend
- Đã build Docker image Backend thành công.
- Kết quả kiểm thử: 154 tests, không có lỗi hoặc thất bại.

### Kiểm thử truy cập media demo
- Đã thêm DemoMediaAccessTest kiểm tra truy cập /demo-media/test-image.png không cần JWT.
- Kết quả: BUILD SUCCESS; 1 test chạy, 0 lỗi, 0 thất bại.
- Xác nhận response có content type tương thích image/png.
- Test chạy bằng Maven container maven:3.9.6-eclipse-temurin-17, sử dụng profile test và H2; không ghi dữ liệu vào PostgreSQL demo.


### Chuẩn bị ảnh demo cho HeritageSite và Artifact
- Đã bổ sung 2 ảnh HeritageSite và 8 ảnh Artifact vào src/main/resources/static/demo-media/.
- Ảnh được phân chia thành hai thư mục sites/ và artifacts/.
- Đã kiểm tra danh sách file: đủ 10 file, tất cả có dung lượng lớn hơn 0 byte.
- Đã xác minh URL truy cập thực tế của cả 10 ảnh trên Docker Backend, tất cả trả HTTP 200 và image/jpeg.
- Nguồn gốc và giấy phép sử dụng của từng ảnh vẫn chưa được xác minh.


### Xác minh truy cập Demo Media trên Docker Backend
- Đã rebuild image `laptrinh-java-backend` sau khi cập nhật `SecurityConfig`.
- Đã khởi động lại service backend bằng Docker Compose.
- Đã kiểm tra GET trực tiếp toàn bộ 10 ảnh trong `demo-media/sites/` và `demo-media/artifacts/`.
- Kết quả: cả 10 URL đều trả về HTTP 200 và Content-Type `image/jpeg`.
- Các URL `/demo-media/**` truy cập được mà không cần JWT.
- Chưa xác minh nguồn gốc và giấy phép sử dụng của từng ảnh; cần hoàn tất việc này trước khi công bố dữ liệu demo.

### Đối chiếu Schema và DTO phục vụ Demo Seed
- Đã kiểm tra trực tiếp các migration V1, V2, V3 và V4.
- Xác nhận quan hệ khóa ngoại HeritageSite → Artifact → Multimedia.
- Xác nhận VisitorInteraction hỗ trợ khách ẩn danh với user_id có thể NULL và visitor_id bắt buộc.
- Xác nhận Beacon có unique constraint trên (proximity_uuid, major, minor).
- Xác nhận Major và Minor có CHECK constraint trong khoảng 0–65535.
- Xác nhận Beacon mặc định enabled = true và visitor_interaction.beacon_id sử dụng ON DELETE SET NULL.
- Đã đối chiếu các Entity HeritageSite, Artifact, Multimedia, Beacon và VisitorInteraction với schema.
- Đã kiểm tra CreateInteractionRequest: các loại sự kiện hợp lệ gồm VIEW, AUDIO_PLAY, SCAN và BEACON_TRIGGER.
- Xác nhận languageCode tuân thủ định dạng ngôn ngữ và eventId, visitorId là UUID bắt buộc.

### Kiểm tra trạng thái dữ liệu PostgreSQL trước khi Seed

- Đã truy vấn số lượng bản ghi trên PostgreSQL database smart_heritage.
- heritage_site: 0 bản ghi.
- artifact: 0 bản ghi.
- multimedia: 0 bản ghi.
- beacon: 0 bản ghi.
- visitor_interaction: 0 bản ghi.
- Chưa thực hiện thao tác ghi dữ liệu demo vào PostgreSQL.

### Kiểm tra cấu hình và cơ chế khởi tạo dữ liệu

- Đã kiểm tra application.yml: Flyway được bật, baseline-on-migrate=false, Hibernate ddl-auto=validate và Flyway clean-disabled=true.
- Chưa tìm thấy seed script hoặc initializer riêng trong src/main qua kiểm tra tên file.
- Định hướng triển khai seed độc lập, chạy chủ động, không tự động nạp dữ liệu khi Backend khởi động và không ảnh hưởng môi trường production.

### Kiểm tra vị trí đặt Demo Seed Script
- Đã kiểm tra thư mục backend/scripts/ tại thời điểm thực hiện.
- Kết quả: thư mục chưa tồn tại, chưa có seed script tại vị trí này.
- Chưa tạo script và chưa ghi dữ liệu vào PostgreSQL.
- Hướng triển khai tiếp theo: tạo script seed độc lập, chạy thủ công và hỗ trợ chạy lặp an toàn.


### Kiểm tra Index, Constraint và Trigger trên PostgreSQL
- Đã kiểm tra pg_indexes trên 5 bảng demo.
- Xác nhận unique index uk_beacon_identity trên (proximity_uuid, major, minor).
- Xác nhận unique index uk_visitor_interaction_event_id trên event_id.
- Xác nhận các index hỗ trợ truy vấn Artifact, Beacon, VisitorInteraction và Analytics.
- Xác nhận CHECK constraint Major/Minor trong khoảng 0–65535.
- Không phát hiện trigger trên 5 bảng HeritageSite, Artifact, Multimedia, Beacon và VisitorInteraction.
- Chưa tạo seed script và chưa ghi dữ liệu demo vào PostgreSQL.

### Khởi tạo và xác minh tài khoản ADMIN
- Đã đăng ký tài khoản quản trị thông qua POST `/api/auth/register`.
- Đã xác minh userId = 1, username = admin và email = admin@gmail.com trong PostgreSQL.
- Đã tạo role ADMIN và nâng quyền đúng tài khoản userId = 1.
- Đã truy vấn lại PostgreSQL, xác nhận tài khoản có role ADMIN.
- Đã đăng nhập lại qua POST `/api/auth/login`, nhận JWT mới với tokenType = Bearer và thời hạn 86400 giây.
- Đã sử dụng JWT gọi GET `/api/admin/beacons`.
- Kết quả: HTTP 200, thông báo Beacons retrieved successfully; danh sách Beacon hiện đang rỗng.
- Không ghi mật khẩu hoặc giá trị JWT vào nhật ký hay mã nguồn.
- Chưa ghi dữ liệu demo vào các bảng nghiệp vụ.

## Triển khai Demo Seed Script và PostgreSQL Verification

### Triển khai Demo Seed Script
- Đã tạo `backend/scripts/seed-demo-data.ps1`.
- Script hỗ trợ các chế độ:
  - `-Seed`: tạo các dữ liệu demo còn thiếu.
  - `-Seed -WhatIf`: kiểm tra kế hoạch Seed mà không ghi database.
  - `-Verify`: kiểm tra dữ liệu thông qua API, manifest, media và PostgreSQL.
  - `-Cleanup -Confirm`: xóa dữ liệu thuộc quyền sở hữu của Seed sau khi xác minh.
- Không tự động Seed khi Backend khởi động.
- Không lưu thông tin đăng nhập hoặc JWT vào manifest.

### Chuẩn bị Demo Dataset
Đã triển khai bộ dữ liệu demo gồm:

| Entity | Số lượng |
|---|---:|
| HeritageSite | 2 |
| Artifact | 8 |
| Multimedia | 8 |
| Beacon | 4 |
| VisitorInteraction | 24 |
| Anonymous visitor | 8 |

- Hai HeritageSite: Hoàng thành Thăng Long và Đại Nội Huế.
- Tám Artifact được phân bổ cho hai HeritageSite.
- Tám Multimedia được liên kết với Artifact tương ứng.
- Bốn Beacon được ánh xạ tới Artifact.
- Các Beacon sử dụng Proximity UUID, Major và Minor riêng biệt.
- VisitorInteraction sử dụng eventId và visitorId ổn định.
- Timestamp được chuẩn hóa theo UTC.

### Manifest quản lý dữ liệu Seed
- Đã tạo `backend/scripts/demo-seed-manifest.json`.
- Manifest lưu thông tin các bản ghi do Seed quản lý.
- Đã cập nhật manifest tương ứng với dữ liệu thực tế sau quá trình Seed.
- Manifest hiện quản lý 2 Sites, 8 Artifacts, 8 Multimedia, 4 Beacons và 24 Interactions.
- Manifest được sử dụng để đối chiếu dữ liệu và xác định quyền sở hữu khi Cleanup.

### Xử lý lỗi trong quá trình triển khai
- Điều chỉnh cách đọc phản hồi API để xử lý dữ liệu UTF-8 và tiếng Việt chính xác.
- Đối chiếu PostgreSQL trước khi khôi phục thông tin bản ghi vào manifest sau lần Seed bị gián đoạn.
- Điều chỉnh xử lý thuộc tính `beaconId` vì thuộc tính này chỉ áp dụng cho `BEACON_TRIGGER`.
- Điều chỉnh `Invoke-PostgresSql` để thu thập stderr riêng và kiểm tra exit code của Docker Compose, tránh coi cảnh báo Compose là lỗi truy vấn SQL.
- Đã kiểm tra cú pháp PowerShell sau các chỉnh sửa.

### Kết quả chạy Seed
Đã chạy Seed thành công sau khi xử lý các bản ghi còn lại từ lần chạy bị gián đoạn.
Kết quả:
    SMART HERITAGE DEMO SEED COMPLETED
    HeritageSite      : 2
    Artifact          : 8
    Multimedia        : 8
    Beacon            : 4
    VisitorInteraction: 24

### PostgreSQL Verification

Đã chạy lệnh:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Verify
```

Kết quả thực tế:

```text
VERIFY SUCCESS
2 Sites
8 Artifacts
8 Multimedia
4 Beacons
24 Interactions
8 unique anonymous visitors
Beacon mapping and timestamps valid.
```

- Đã xác minh số lượng dữ liệu trên PostgreSQL thực tế.
- Đã xác minh Beacon mapping và timestamp.

### Acceptance Criteria — Trạng thái hiện tại

| Tiêu chí | Trạng thái |
|---|---|
| Site → Artifact → Multimedia | Đã triển khai và Verify |
| Beacon mapping | Đã triển khai và Verify |
| Beacon identity | Đã tạo dữ liệu và Verify |
| VisitorInteraction demo data | Đã tạo 24 bản ghi |
| Timestamp và timezone | Đã Verify |
| Seed dry-run | Đã chạy thành công |
| Seed dataset | Đã chạy thành công |
| PostgreSQL verification | Đã chạy thành công |
| Idempotency sau khi dataset hoàn chỉnh | Đã kiểm thử thành công trên PostgreSQL |
| Cleanup và ownership validation | Đã kiểm tra ownership và WhatIf; Cleanup thật chưa kiểm thử |
| Tài liệu setup/seed/cleanup | Đã tạo docs/database/demo-seed-setup.md |
| Nguồn gốc, giấy phép media | Chưa xác minh đầy đủ |
| Commit/PR/CI evidence | Chưa cập nhật |

### Bằng chứng kiểm thử Idempotency

- Đã chạy lại `.\backend\scripts\seed-demo-data.ps1 -Seed -Confirm` trên dataset đã đầy đủ.
- 2 HeritageSite, 8 Artifact, 8 Multimedia và 4 Beacon đều được nhận diện là `EXISTS`.
- 24 VisitorInteraction đều được nhận diện là `REPLAYED` theo eventId.
- Đã đối chiếu PostgreSQL trước và sau lần Seed thứ hai: số lượng của cả 5 bảng không thay đổi.
- Đã chạy lại `.\backend\scripts\seed-demo-data.ps1 -Verify` và nhận kết quả `VERIFY SUCCESS`.

Kết quả PostgreSQL sau lần Seed thứ hai:

| Bảng | Số lượng |
|---|---:|
| heritage_site | 2 |
| artifact | 8 |
| multimedia | 8 |
| beacon | 4 |
| visitor_interaction | 24 |
### Cleanup WhatIf Verification

- Đã chạy `.\backend\scripts\seed-demo-data.ps1 -Cleanup -Confirm -WhatIf`.
- Script mô phỏng 23 thao tác: 1 PostgreSQL, 8 Multimedia, 4 Beacon, 8 Artifact và 2 HeritageSite.
- Manifest không bị thay đổi.
- Đã kiểm tra PostgreSQL sau mô phỏng; số lượng vẫn giữ nguyên: 2 HeritageSite, 8 Artifact, 8 Multimedia, 4 Beacon và 24 VisitorInteraction.
- Chưa thực hiện Cleanup thật; chưa xác nhận kết quả xóa dữ liệu thực tế.
### Kết luận tiến độ

Phần triển khai cốt lõi của S6-M2-01 đã hoàn thành: Seed Script, Demo Dataset, Manifest và PostgreSQL Verification.

Task chưa được đánh dấu hoàn thành toàn bộ. Các công việc còn lại gồm kiểm thử Cleanup thật, xác minh giấy phép media và cập nhật bằng chứng commit/CI.

## Cập nhật LTJ-67 — Mở rộng Demo Dataset 

### 1. Mở rộng Demo Dataset
Đã mở rộng bộ dữ liệu demo từ phiên bản ban đầu gồm 2 HeritageSite, 8 Artifact và 24 VisitorInteraction lên bộ dữ liệu hiện tại:

| Entity | Số lượng hiện tại |
|---|---:|
| HeritageSite | 4 |
| Artifact | 20 |
| Multimedia | 20 |
| Beacon | 4 |
| VisitorInteraction | 60 |
| Anonymous visitor | 8 |

Các HeritageSite hiện có:
- Hoàng thành Thăng Long.
- Đại Nội Huế.
- Văn Miếu – Quốc Tử Giám.
- Thành nhà Hồ.

Đã bổ sung các Artifact và Multimedia tương ứng, đồng thời duy trì quan hệ giữa HeritageSite, Artifact và Multimedia.
Bốn Beacon được duy trì với định danh riêng biệt và ánh xạ tới Artifact tương ứng.
VisitorInteraction được mở rộng lên 60 sự kiện, sử dụng eventId và visitorId ổn định. Các sự kiện được phân bổ theo Artifact, bao gồm VIEW, SCAN, AUDIO_PLAY và BEACON_TRIGGER tùy theo cấu hình Beacon.

### 2. Điều chỉnh thứ tự tạo VisitorInteraction
- Phát hiện thứ tự khai báo Artifact trong script không hoàn toàn trùng với thứ tự ID Artifact được tạo trong PostgreSQL.
- Điều chỉnh `New-InteractionDefinitions` để sắp xếp Artifact theo ID thực tế trước khi tạo định nghĩa Interaction.
- Đối chiếu các sự kiện bị lệch giữa Manifest và PostgreSQL.
- Đã kiểm tra dữ liệu trước khi điều chỉnh các bản ghi liên quan.
- Đã cập nhật 3 VisitorInteraction có eventId tương ứng 025–027 để liên kết đúng Artifact ID 9.
- Đã xác minh lại tổng số Interaction theo từng Artifact: mỗi Artifact có 3 Interaction, tổng cộng 60 bản ghi.
- Đã đồng bộ lại thông tin 15 Interaction liên quan trong Manifest, bao gồm artifactId, interactionType và beaconId.
- Đã tạo bản sao lưu Manifest trước khi cập nhật.

### 3. Xử lý lỗi đọc UTF-8 trong Windows PowerShell 5.1
- Phát hiện `Load-Manifest` sử dụng `Get-Content -Raw` mà không chỉ định encoding.
- Trong Windows PowerShell 5.1, cách đọc này có thể giải mã sai nội dung tiếng Việt của file UTF-8 không BOM.
- Đã kiểm tra file Manifest hiện tại và bản backup bằng `System.IO.File.ReadAllText` với `Encoding.UTF8`.
- Xác nhận cả hai file đều chứa chính xác tên tiếng Việt của 4 HeritageSite.
- Đã điều chỉnh `Load-Manifest` để đọc UTF-8 tường minh:

```powershell
$manifestJson = [System.IO.File]::ReadAllText(
    $ManifestPath,
    [System.Text.Encoding]::UTF8
)

$manifest = $manifestJson | ConvertFrom-Json
```
- Không cần khôi phục Manifest từ backup vì dữ liệu trong file hiện tại vẫn chính xác khi được đọc bằng UTF-8 đúng cách.

### 4. PostgreSQL Verification — Kết quả mới nhất
Đã chạy:
```powershell
.\backend\scripts\seed-demo-data.ps1 -Verify
```

Kết quả thực tế:
```text
======================================
SMART HERITAGE VERIFY SUCCESS
======================================
HeritageSite      : 4
Artifact          : 20
Multimedia        : 20
Beacon            : 4
VisitorInteraction: 60
Unique Visitors   : 8
API records       : Valid
Media files       : Valid
PostgreSQL data   : Matched
Beacon mapping    : Valid
Anonymous visitor : Valid
```

Kết quả xác nhận:
- Số lượng bản ghi giữa API, Manifest và PostgreSQL khớp nhau.
- Media files được xác minh hợp lệ.
- Beacon mapping hợp lệ.
- VisitorInteraction sử dụng visitor ẩn danh hợp lệ.
- Có 8 visitorId duy nhất.
- Dữ liệu PostgreSQL đã khớp với Manifest và dữ liệu API theo các kiểm tra của script.

### 5. Seed Dry-run — Kết quả mới nhất
Đã chạy:
```powershell
.\backend\scripts\seed-demo-data.ps1 -Seed -WhatIf
```

Kết quả thực tế:

```text
DRY RUN - không gọi API và không ghi database.
4 HeritageSite
20 Artifact
20 Multimedia
4 Beacon
60 VisitorInteraction
DRY RUN COMPLETE.
```

Xác nhận:

- Script hoàn thành chế độ Dry-run.
- Số lượng dữ liệu dự kiến đúng với bộ Demo Dataset hiện tại.
- Không gọi API.
- Không ghi dữ liệu vào PostgreSQL trong quá trình Dry-run.

### 6. Acceptance Criteria — Cập nhật trạng thái
| Tiêu chí | Trạng thái |
|---|---|
| Site → Artifact → Multimedia | Đã Verify với 4 Site, 20 Artifact, 20 Multimedia |
| Beacon identity | Đã Verify |
| Beacon mapping | Đã Verify |
| VisitorInteraction demo data | Đã Verify 60 bản ghi |
| Anonymous visitor | Đã Verify 8 visitorId |
| Timestamp và timezone | Đã Verify theo kiểm tra của script |
| Manifest consistency | Đã Verify |
| API và PostgreSQL consistency | Đã Verify |
| Media files | Đã Verify |
| Seed dry-run với dataset hiện tại | Đã chạy thành công |
| Seed thực tế với dataset hiện tại | Đã có dữ liệu và Verify; chưa kiểm thử chạy Seed lặp lại sau lần mở rộng gần nhất |
| Idempotency | Đã kiểm thử thành công trên dataset phiên bản ban đầu; cần kiểm thử lại với dataset hiện tại |
| Cleanup WhatIf | Đã kiểm thử trên dataset phiên bản trước; cần chạy lại với dataset hiện tại |
| Cleanup thật | Chưa kiểm thử |
| Nguồn gốc và giấy phép media | Chưa xác minh đầy đủ |
| Commit/PR/CI evidence | Chưa cập nhật |

### 7. Kết luận tiến độ cập nhật
Đã mở rộng thành công Demo Dataset của LTJ-67 lên 4 HeritageSite, 20 Artifact, 20 Multimedia, 4 Beacon và 60 VisitorInteraction.
Hai bước kiểm tra mới nhất đều thành công:
- PostgreSQL Verification: `SMART HERITAGE VERIFY SUCCESS`.
- Seed Dry-run: `DRY RUN COMPLETE`.

Các kiểm tra xác nhận dữ liệu API, Manifest, PostgreSQL, Media và Beacon mapping đang nhất quán.
Task đã hoàn thành phần chuẩn bị dữ liệu, mở rộng dataset và xác minh hiện trạng. Chưa đánh dấu hoàn thành toàn bộ vì còn các công việc cần kiểm thử hoặc bổ sung bằng chứng:
1. Kiểm thử idempotency lại với dataset 4/20/20/4/60.
2. Kiểm thử Cleanup WhatIf lại với dataset hiện tại.
3. Chỉ thực hiện Cleanup thật khi có yêu cầu và đã xác nhận phạm vi xóa.
4. Xác minh nguồn gốc và giấy phép sử dụng media.
5. Cập nhật bằng chứng commit, PR và CI nếu có.

