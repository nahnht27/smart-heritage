# Smart Heritage Demo Dataset — Setup, Seed and Cleanup

## 1. Mục đích

Tài liệu hướng dẫn tạo, kiểm tra và dọn dẹp dữ liệu demo cho Smart Heritage
trên môi trường local/disposable.

Thành phần:

- `backend/scripts/seed-demo-data.ps1`: seed, verify và cleanup.
- `backend/scripts/lib/DemoSeed.Common.psm1`: validation loopback, anchor và
  sinh interaction definition.
- `backend/scripts/demo-seed-manifest.json`: runtime state của từng developer
  hoặc môi trường; **không commit**.
- `docs/database/demo-media-attribution.md`: inventory media và trạng thái
  nguồn/giấy phép.

Không chạy script trên production hoặc database chứa dữ liệu thật.

## 2. Yêu cầu môi trường

- Windows PowerShell 5.1 trở lên, hoặc PowerShell 7 trên Linux/CI.
- Docker và Docker Compose.
- Backend và PostgreSQL đang chạy.
- Tài khoản ADMIN hợp lệ.
- `psql` chỉ cần khi dùng `-PostgresMode Local`.

Giá trị mặc định:

| Thành phần | Giá trị |
|---|---|
| API Base URL | `http://localhost:8080` |
| PostgreSQL service | `postgres` |
| Database | `smart_heritage` |
| PostgreSQL username | `postgres` |
| Manifest | `backend/scripts/demo-seed-manifest.json` |

### 2.1. Giới hạn BaseUrl

Script chỉ chấp nhận URL loopback:

- `localhost`
- `127.0.0.1`
- `::1`

BaseUrl phải là URL tuyệt đối `http` hoặc `https`, không chứa credentials,
query string, fragment hoặc path khác `/`. Ví dụ hợp lệ:

```text
http://localhost:8080
http://127.0.0.1:8080/
http://[::1]:8080
https://localhost:8443
```

URL remote bị từ chối trước khi đọc token hoặc gọi API. Không dùng script với
backend remote.

## 3. Khởi động hệ thống

Tại thư mục gốc repository:

```powershell
docker compose up --build -d
docker compose ps
Invoke-RestMethod -Uri "http://localhost:8080/api/health"
```

Chỉ Seed sau khi PostgreSQL và backend đã sẵn sàng.

## 4. Xác thực ADMIN

Script cần ADMIN Bearer token cho các API quản trị. Token không được ghi vào
manifest, log, tài liệu hoặc Git.

Cách 1 — nhập khi được yêu cầu:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Seed -Confirm
```

Script dùng `Read-Host -AsSecureString`.

Cách 2 — biến môi trường:

```powershell
$env:SMART_HERITAGE_ADMIN_TOKEN = "<ADMIN_BEARER_TOKEN>"
```

Xóa token sau khi dùng:

```powershell
Remove-Item Env:SMART_HERITAGE_ADMIN_TOKEN -ErrorAction SilentlyContinue
```

## 5. Demo dataset

| Loại dữ liệu | Số lượng |
|---|---:|
| HeritageSite | 4 |
| Artifact | 20 |
| Multimedia | 20 |
| Beacon | 4 |
| VisitorInteraction | 60 |
| Anonymous visitors | 8 |

Bốn địa điểm:

- Hoàng thành Thăng Long (`site-thang-long`).
- Đại Nội Huế (`site-hue`).
- Văn Miếu – Quốc Tử Giám (`site-van-mieu`).
- Thành nhà Hồ (`site-ho-citadel`).

Quan hệ:

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

Mỗi Artifact có 3 interaction: `VIEW`, `SCAN` và `BEACON_TRIGGER` hoặc
`AUDIO_PLAY`. Event UUID và anonymous visitor UUID là deterministic.

## 6. Manifest và anchor

Manifest là runtime state theo từng môi trường. Đường dẫn
`backend/scripts/demo-seed-manifest.json` nằm trong `.gitignore`; không commit,
không dùng chung manifest giữa các developer.

Manifest lưu:

- Seed name và BaseUrl.
- ID các bản ghi demo.
- Thông tin nhận diện để kiểm tra ownership.
- Event UUID và visitor UUID.
- `createdBySeed`.
- `createdAtUtc`, `updatedAtUtc`, `cleanedAtUtc`.
- `interactionAnchorAtUtc`.

### 6.1. Interaction anchor

Lần Seed đầu tiên:

1. Lấy thời điểm UTC hiện tại làm anchor.
2. Ghi anchor vào manifest **trước khi** tạo interaction.
3. Sinh timestamp deterministic trong cửa sổ 8 ngày kết thúc gần anchor.

Seed lặp lại dùng đúng anchor đã lưu. Script không tạo dataset trôi theo thời
gian và không ghi đè timestamp đã có.

Dữ liệu mới phải có interaction trong cả bốn cửa sổ:

- 7 ngày gần nhất.
- 30 ngày gần nhất.
- 90 ngày gần nhất.
- All Time.

### 6.2. Manifest cũ chưa có anchor

Nếu manifest cũ chưa có `interactionAnchorAtUtc`, Seed suy ra anchor từ
interaction cũ để bảo toàn timestamp và ghi anchor vào manifest. Script cảnh
báo rõ; không tự động xóa hoặc sửa dữ liệu.

Nếu dữ liệu cũ không còn interaction trong cửa sổ 7 ngày, Verify sẽ thất bại.
Để làm mới dataset trên môi trường demo:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Confirm
.\backend\scripts\seed-demo-data.ps1 -Seed -Confirm
```

Cleanup là thao tác xóa tường minh. Chỉ thực hiện trên database demo/disposable.

Sau Cleanup thành công, script:

- Giữ file manifest.
- Ghi `cleanedAtUtc`.
- Xóa ownership interaction đã bị xóa khỏi database.
- Reset anchor để lần Seed tiếp theo dùng thời điểm mới.

## 7. Dry-run

```powershell
.\backend\scripts\seed-demo-data.ps1 -Seed -WhatIf
```

Kết quả mong đợi:

```text
DRY RUN - không gọi API và không ghi database.
4 HeritageSite
20 Artifact
20 Multimedia
4 Beacon
60 VisitorInteraction

DRY RUN COMPLETE.
```

Dry-run không đọc token, không gọi API và không ghi manifest/database.

## 8. Seed

```powershell
.\backend\scripts\seed-demo-data.ps1 -Seed -Confirm
```

Script:

1. Đọc manifest nếu có.
2. Xác định hoặc tạo anchor trước khi tạo interaction.
3. Tìm bản ghi đã tồn tại để tránh trùng.
4. Tạo bản ghi còn thiếu.
5. Ghi ID và ownership vào manifest.
6. Ghi `cleanedAtUtc = null` sau khi hoàn tất.

Trong CI/non-interactive, có thể dùng `-Force`. `-Force` là xác nhận tường minh
dành cho môi trường disposable; không dùng thay cho `-Confirm` khi thao tác thủ
công.

Có thể chỉ định PostgreSQL local thay vì Docker Compose:

```powershell
.\backend\scripts\seed-demo-data.ps1 `
  -Seed -Confirm `
  -PostgresMode Local `
  -PostgresUser postgres `
  -PostgresDatabase smart_heritage
```

Với `-PostgresMode Local`, kết nối dùng các biến `PGHOST`, `PGPORT`,
`PGUSER`, `PGPASSWORD` và `psql` trong `PATH`.

### 8.1. Idempotency

Chạy lại Seed:

- Bản ghi đã tồn tại được nhận diện là `EXISTS`.
- Interaction trùng eventId được ghi nhận là `REPLAYED`.
- Manifest, API và PostgreSQL vẫn khớp.
- Số lượng không tăng.
- Anchor không đổi.

## 9. Verify

```powershell
.\backend\scripts\seed-demo-data.ps1 -Verify
```

Verify kiểm tra:

- HeritageSite, Artifact và quan hệ site/artifact.
- Multimedia, URL và file media thực tế.
- Beacon identity, enabled và mapping artifact.
- VisitorInteraction với API, manifest và PostgreSQL.
- Anonymous visitor UUID.
- Event UUID, timestamp và timezone.
- Anchor đã được lưu.
- Analytics 7/30/90/All Time có dữ liệu.

Kết quả thành công có dạng:

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
InteractionAnchor : <UTC timestamp>
Analytics 7 days  : <nonzero>
Analytics 30 days : <nonzero>
Analytics 90 days : <nonzero>
Analytics All Time: <nonzero>
API records       : Valid
Media files       : Valid
PostgreSQL data   : Matched
Beacon mapping    : Valid
Anonymous visitor : Valid
```

Verify thất bại nếu:

- Manifest thiếu anchor.
- Một cửa sổ analytics không có dữ liệu.
- API, manifest và PostgreSQL không khớp.
- Media không truy cập được hoặc không phải ảnh hợp lệ.

Riêng trường hợp dữ liệu cũ ngoài cửa sổ 7 ngày, chạy Cleanup rồi Seed lại trên
database demo.

## 10. Kiểm tra PostgreSQL trực tiếp

```powershell
docker compose exec -T postgres psql -U postgres -d smart_heritage -X -c "SELECT 'heritage_site' AS table_name, COUNT(*) FROM heritage_site UNION ALL SELECT 'artifact', COUNT(*) FROM artifact UNION ALL SELECT 'multimedia', COUNT(*) FROM multimedia UNION ALL SELECT 'beacon', COUNT(*) FROM beacon UNION ALL SELECT 'visitor_interaction', COUNT(*) FROM visitor_interaction ORDER BY table_name;"
```

Nếu database có dữ liệu khác ngoài demo, không mặc định tổng số phải bằng
4/20/20/4/60. Script Verify đối chiếu bản ghi thuộc manifest, không xóa dữ liệu
khác.

## 11. Cleanup

### 11.1. Nguyên tắc

Chỉ xóa bản ghi có `createdBySeed = true` trong manifest. Trước khi xóa, script
đối chiếu ID và các trường nhận diện. Identity mismatch dừng Cleanup.

Thứ tự:

1. VisitorInteraction trong PostgreSQL.
2. Multimedia.
3. Beacon.
4. Artifact.
5. HeritageSite.

Dữ liệu không thuộc seed không bị xóa.

### 11.2. Mô phỏng

```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Confirm -WhatIf
```

`-WhatIf` không xóa dữ liệu và không sửa manifest.

### 11.3. Cleanup thật

```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Confirm
```

Trong CI disposable có thể dùng:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Force
```

Nếu Cleanup gián đoạn:

- Không xóa hoặc sửa manifest thủ công.
- Kiểm tra PostgreSQL và API.
- Chạy lại Cleanup; bản ghi đã mất được bỏ qua.
- Chỉ sau khi Cleanup thành công mới reset anchor và ownership interaction.

Cleanup không phải transaction bao trùm toàn bộ API và PostgreSQL. Các thao tác
đã hoàn tất trước lỗi không tự rollback.

Cảnh báo: không chạy Cleanup khi chưa xác định đúng database, manifest thuộc
BaseUrl khác, hoặc database có dữ liệu thật cần bảo toàn.

## 12. Media demo

Bundle hiện có 20 ảnh JPEG cho 20 Artifact. Hai ảnh site không được sử dụng đã
được loại bỏ vì model HeritageSite không có trường ảnh và frontend/mobile không
tham chiếu.

Nguồn và giấy phép từng ảnh chưa được xác minh. Trạng thái là `PENDING` trong
`docs/database/demo-media-attribution.md`. Không công bố media ngoài phạm vi đồ
án trước khi hoàn tất attribution.

## 13. Automated checks

Static checks:

```bash
pwsh -NoProfile -File backend/scripts/tests/seed-common.tests.ps1
pwsh -NoProfile -NonInteractive -File backend/scripts/seed-demo-data.ps1 -Seed -WhatIf
```

CI job `demo-seed-static-checks` kiểm tra:

- Manifest runtime không bị track.
- Script và module parse hợp lệ.
- BaseUrl loopback.
- Dry-run.

CI job `demo-seed-lifecycle` chạy trên Docker Compose disposable:

- Seed lần đầu và Verify.
- Seed lặp lại, Verify và kiểm tra anchor không đổi.
- Cleanup WhatIf không thay đổi dữ liệu/manifest.
- Mô phỏng Cleanup gián đoạn.
- Cleanup thật và bảo toàn bản ghi không thuộc seed.
- Seed lại sau Cleanup để làm mới anchor.
- Verify thất bại sau Cleanup.

Kết quả CI được cập nhật tại PR #42 sau khi job hoàn tất.

## 14. Khắc phục sự cố

| Hiện tượng | Hướng xử lý |
|---|---|
| BaseUrl bị từ chối | Dùng `localhost`, `127.0.0.1` hoặc `::1`; bỏ path/query/credentials |
| Không kết nối được API | Kiểm tra backend, Docker Compose và BaseUrl |
| ADMIN token không hợp lệ | Kiểm tra token và quyền ADMIN |
| Không tìm thấy manifest | Chạy Seed để tạo manifest mới |
| Manifest thuộc BaseUrl khác | Xác định đúng môi trường trước khi tiếp tục |
| Manifest thiếu anchor | Chạy Seed một lần để lưu anchor từ dữ liệu hiện có |
| Analytics 7 ngày bằng 0 | Dữ liệu cũ; chạy Cleanup rồi Seed lại trên database demo |
| Seed bị gián đoạn | Giữ manifest, kiểm tra PostgreSQL và chạy lại Seed |
| Verify thất bại | Kiểm tra API, database, media, ownership và timestamp |
| Cleanup identity mismatch | Dừng, kiểm tra bản ghi thực tế; không sửa manifest để bỏ qua |
| Docker Compose báo `version is obsolete` | Cảnh báo cấu hình, không đồng nghĩa lỗi database |

## 15. Quy trình khuyến nghị

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
Run Verify (including 7/30/90/All Time)
        |
        v
Run Seed again and Verify idempotency
        |
        v
Demo / Integration Testing
        |
        v
Run Cleanup -WhatIf
        |
        v
Cleanup with explicit confirmation
        |
        v
Check final API and PostgreSQL state
```
