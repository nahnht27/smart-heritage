# Smart Heritage Demo Dataset — Setup, Seed and Cleanup

## 1. Mục đích
Tài liệu hướng dẫn chuẩn bị, tạo, kiểm tra và dọn dẹp dữ liệu demo cho hệ thống Smart Heritage.

Script sử dụng:
- `backend/scripts/seed-demo-data.ps1`: tự động tạo, xác minh và dọn dẹp dữ liệu demo.
- `backend/scripts/demo-seed-manifest.json`: lưu thông tin các bản ghi thuộc bộ dữ liệu demo và trạng thái sở hữu.

Dữ liệu demo phục vụ kiểm thử tích hợp và trình diễn hệ thống. Không sử dụng script trên môi trường production hoặc database chứa dữ liệu thực tế.

## 2. Yêu cầu môi trường
- Windows PowerShell 5.1 trở lên.
- Docker Desktop và Docker Compose.
- Smart Heritage backend đang chạy.
- PostgreSQL của dự án đã khởi động.
- Tài khoản ADMIN hợp lệ để gọi các API cần quyền quản trị.

Các giá trị mặc định:
| Thành phần | Giá trị |
|---|---|
| API Base URL | `http://localhost:8080` |
| PostgreSQL service | `postgres` |
| Database | `smart_heritage` |
| PostgreSQL username | `postgres` |
| Seed script | `backend/scripts/seed-demo-data.ps1` |
| Manifest | `backend/scripts/demo-seed-manifest.json` |

## 3. Khởi động hệ thống
Mở PowerShell tại thư mục gốc repository:
```powershell
docker compose up --build -d
```

Kiểm tra trạng thái container:
```powershell
docker compose ps
```

Kiểm tra API health:
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/health"
```

**Chỉ thực hiện Seed sau khi backend và PostgreSQL đã sẵn sàng.

## 4. Xác thực ADMIN
Script cần ADMIN Bearer token để thực hiện các thao tác API có quyền quản trị.

Có hai cách cung cấp token:

**Cách 1 — Nhập khi được yêu cầu**
Nếu biến môi trường chưa được thiết lập, script sẽ hiển thị lời nhắc nhập token bằng `Read-Host -AsSecureString`.
Token được chuyển thành chuỗi trong bộ nhớ để tạo HTTP Authorization header. Script không ghi token vào manifest.

**Cách 2 — Sử dụng biến môi trường**
Có thể thiết lập biến môi trường trong phiên PowerShell hiện tại:
```powershell
$env:SMART_HERITAGE_ADMIN_TOKEN = "<ADMIN_BEARER_TOKEN>"
```

Không đưa token thật vào mã nguồn, file manifest, tài liệu, log hoặc Git.

Sau khi hoàn thành công việc, xóa biến môi trường khỏi phiên hiện tại:
```powershell
Remove-Item Env:SMART_HERITAGE_ADMIN_TOKEN -ErrorAction SilentlyContinue
```

## 5. Cấu trúc Demo Dataset
Bộ dữ liệu demo hiện tại gồm:

| Loại dữ liệu | Số lượng |
|---|---:|
| HeritageSite | 2 |
| Artifact | 8 |
| Multimedia | 8 |
| Beacon | 4 |
| VisitorInteraction | 24 |
| Anonymous visitors | 8 |

Hai địa điểm demo:
- Hoàng thành Thăng Long.
- Đại Nội Huế.

Quan hệ dữ liệu:
```text
HeritageSite
    |
    +-- Artifact
            |
            +-- Multimedia
            |
            +-- Beacon
            |
            +-- VisitorInteraction
```

Mỗi địa điểm có 4 Artifact. Có 4 Beacon được ánh xạ tới Artifact, mỗi địa điểm có 2 Beacon.
VisitorInteraction sử dụng anonymous visitor UUID và event UUID ổn định để hỗ trợ việc chạy Seed nhiều lần mà không tạo bản ghi trùng.

Các loại interaction:

| Interaction type | Số lượng |
|---|---:|
| VIEW | 8 |
| SCAN | 8 |
| BEACON_TRIGGER | 4 |
| AUDIO_PLAY | 4 |
| **Total** | **24** |

Timestamp được tạo theo UTC và sử dụng định dạng có timezone.

## 6. Chạy Seed

### 6.1. Dry-run
Trước khi tạo dữ liệu, chạy:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Seed -WhatIf
```

Chế độ này chỉ hiển thị kế hoạch dữ liệu:
- 2 HeritageSite.
- 8 Artifact.
- 8 Multimedia.
- 4 Beacon.
- 24 VisitorInteraction.

Không gọi API và không ghi dữ liệu vào database hoặc manifest.

### 6.2. Tạo dữ liệu
Sau khi kiểm tra dry-run:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Seed -Confirm
```

Cung cấp ADMIN token khi được yêu cầu.

Script thực hiện:
1. Đọc manifest hiện tại nếu đã tồn tại.
2. Kiểm tra các bản ghi đã có.
3. Tạo những bản ghi còn thiếu.
4. Ghi nhận ID và thông tin nhận diện vào manifest.
5. Tạo VisitorInteraction với event UUID ổn định.
6. Bảo toàn thông tin sở hữu của những bản ghi đã được seed tạo trước đó.

Không chỉnh sửa hoặc xóa manifest trong khi Seed đang chạy.

### 6.3. Tính idempotent
Có thể chạy lại Seed khi cần khôi phục hoặc bổ sung dữ liệu.
Script nhận diện các bản ghi đã tồn tại để tránh tạo trùng.
Đối với VisitorInteraction, event UUID được sử dụng để nhận diện sự kiện đã được tạo.
Sau khi chạy lại, cần đối chiếu số lượng dữ liệu PostgreSQL và chạy Verify.

## 7. Verify dữ liệu
Chạy:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Verify
```

Verify kiểm tra dữ liệu thông qua API và PostgreSQL, bao gồm:
- HeritageSite.
- Artifact và quan hệ với HeritageSite.
- Multimedia và quan hệ với Artifact.
- Beacon và ánh xạ Artifact.
- VisitorInteraction.
- Anonymous visitor UUID.
- Event UUID.
- Timestamp và timezone.
- Các điều kiện toàn vẹn dữ liệu liên quan.

Kết quả thành công có dạng:

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

Nếu Verify thất bại, cần kiểm tra lỗi API, manifest và PostgreSQL trước khi tiếp tục.

## 8. Kiểm tra PostgreSQL trực tiếp
Có thể kiểm tra số lượng bản ghi bằng:

```powershell
docker compose exec -T postgres psql -U postgres -d smart_heritage -X -c "SELECT 'heritage_site' AS table_name, COUNT(*) FROM heritage_site UNION ALL SELECT 'artifact', COUNT(*) FROM artifact UNION ALL SELECT 'multimedia', COUNT(*) FROM multimedia UNION ALL SELECT 'beacon', COUNT(*) FROM beacon UNION ALL SELECT 'visitor_interaction', COUNT(*) FROM visitor_interaction ORDER BY table_name;"
```

Kết quả mong đợi đối với bộ dữ liệu demo hoàn chỉnh:
| Table | Expected count |
|---|---:|
| heritage_site | 2 |
| artifact | 8 |
| multimedia | 8 |
| beacon | 4 |
| visitor_interaction | 24 |

Nếu database có dữ liệu khác ngoài demo, không được mặc định rằng tổng số bản ghi phải bằng các giá trị trên.

## 9. Cleanup dữ liệu demo

### 9.1. Nguyên tắc an toàn
Cleanup chỉ được phép xóa bản ghi được manifest đánh dấu:

```text
createdBySeed = true
```

Trước khi xóa, script kiểm tra ID và các trường nhận diện để hạn chế xóa nhầm dữ liệu.

Thứ tự xóa:
1. VisitorInteraction trong PostgreSQL.
2. Multimedia.
3. Beacon.
4. Artifact.
5. HeritageSite.

Các bản ghi không thuộc quyền sở hữu của seed không được chủ động xóa.
Không xóa manifest trước khi Cleanup hoàn tất.

### 9.2. Mô phỏng Cleanup
Luôn chạy mô phỏng trước:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Confirm -WhatIf
```

Kiểm tra:
- Danh sách thao tác xóa.
- ID từng bản ghi.
- Thứ tự xóa.
- Thông tin nhận diện và quyền sở hữu.
- Manifest không bị thay đổi.

`-WhatIf` không thực hiện thao tác xóa thật.

### 9.3. Thực hiện Cleanup thật
Chỉ thực hiện khi đã kiểm tra kỹ kết quả mô phỏng và xác nhận database đang sử dụng là môi trường demo:
```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Confirm
```

PowerShell sẽ yêu cầu xác nhận các thao tác được bảo vệ bởi `ShouldProcess`.
Nếu một thao tác bị từ chối, script phải dừng thay vì ghi nhận Cleanup hoàn tất.
Nếu Cleanup bị gián đoạn, giữ nguyên manifest và chạy lại sau khi xác minh trạng thái database. Script cho phép xử lý các bản ghi đã được xóa ở lần trước.

Sau Cleanup, kiểm tra lại PostgreSQL và API.

**Lưu ý về Cleanup một phần:**
Cleanup không phải một transaction bao trùm toàn bộ API và PostgreSQL. Nếu một thao tác thất bại hoặc bị từ chối, các thao tác đã hoàn thành trước đó không được tự động rollback.

Trong trường hợp này:
- Không xóa hoặc chỉnh sửa manifest.
- Kiểm tra trạng thái dữ liệu trên PostgreSQL và API.
- Chạy lại Cleanup sau khi xác định nguyên nhân.
- Script cho phép bỏ qua các bản ghi đã không còn tồn tại để hỗ trợ phục hồi sau Cleanup gián đoạn.

### 9.4. Cảnh báo
Không chạy Cleanup khi:

- Chưa kiểm tra manifest.
- Không xác định được database đang kết nối.
- Manifest thuộc một Base URL khác.
- Dữ liệu đã bị thay đổi ngoài phạm vi seed.
- Database có dữ liệu thực tế cần bảo toàn.

Không sử dụng Cleanup như một phương pháp reset toàn bộ database.

## 10. Manifest và quyền sở hữu dữ liệu
Manifest lưu:

- Seed name và Base URL.
- Phiên bản manifest.
- ID các bản ghi được quản lý.
- Các trường nhận diện dữ liệu.
- Event UUID và anonymous visitor UUID.
- Trạng thái `createdBySeed`.
- Thời điểm tạo, cập nhật và hoàn tất Cleanup (`createdAtUtc`, `updatedAtUtc`, `cleanedAtUtc`).

Manifest được sử dụng để:

- Hỗ trợ Seed idempotent.
- Phục hồi trạng thái khi Seed bị gián đoạn.
- Kiểm tra quyền sở hữu trước Cleanup.
- Ngăn Cleanup xóa nhầm bản ghi không thuộc bộ demo.

Không chỉnh sửa ID hoặc `createdBySeed` thủ công nếu không hiểu rõ tác động đến quá trình Cleanup.

Không xóa manifest trong khi dữ liệu demo vẫn còn trong database.

## 11. Khắc phục sự cố

| Hiện tượng | Hướng xử lý |
|---|---|
| Không kết nối được API | Kiểm tra backend, Docker Compose và Base URL |
| ADMIN token không hợp lệ | Kiểm tra token và quyền ADMIN |
| Không tìm thấy manifest | Kiểm tra đường dẫn manifest và chạy Seed nếu cần |
| Manifest thuộc Base URL khác | Xác định đúng môi trường trước khi tiếp tục |
| Seed bị gián đoạn | Giữ manifest, kiểm tra PostgreSQL và chạy lại Seed |
| Verify thất bại | Kiểm tra API, database, quan hệ dữ liệu và timestamp |
| Cleanup phát hiện identity mismatch | Dừng thao tác, kiểm tra bản ghi thực tế; không sửa manifest để bỏ qua kiểm tra |
| Docker Compose hiển thị cảnh báo `version is obsolete` | Đây là cảnh báo cấu hình Compose, cần xử lý riêng; không đồng nghĩa thao tác database thất bại |


## 12. Quy trình khuyến nghị
```text
Start Docker Compose
        |
        v
Check API and PostgreSQL
        |
        v
Run Seed -WhatIf
        |
        v
Run Seed
        |
        v
Run Verify
        |
        v
Check PostgreSQL counts
        |
        v
Demo / Integration Testing
        |
        v
Run Cleanup -WhatIf
        |
        v
Review deletion plan
        |
        v
Cleanup with explicit confirmation
        |
        v
Check final API and PostgreSQL state
```
