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
- `docs/database/demo-media-attribution.md`: audit media và nguồn gốc
  ảnh placeholder.

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
| PostgreSQL host (Local) | `127.0.0.1` |
| PostgreSQL port (Local) | `5432` |
| Docker container PostgreSQL | `smart-heritage-db` |
| Docker container backend | `smart-heritage-backend` |
| Docker volume | `smart-heritage_postgres_data` |
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

### 2.2. Giới hạn PostgreSQL Local

`-PostgresMode Local` chỉ dùng cho PostgreSQL trên chính máy đang chạy script.
Script kiểm tra cấu hình trước khi đọc token hoặc gọi API:

- `-PostgresHost` chỉ được là `localhost`, `127.0.0.1` hoặc `::1`.
- `-PostgresPort` phải nằm trong khoảng `1-65535`.
- Từ chối `PGHOSTADDR`, `PGSERVICE`, `PGSERVICEFILE` và `PGOPTIONS` nếu các biến này được đặt.
- `-PostgresDatabase` chỉ được là tên database thuần; chuỗi conninfo/URI (có thể ghi đè host) bị từ chối.
- `PGHOST`, nếu có, phải là một host loopback duy nhất và khớp `-PostgresHost`.
- `PGPORT`, nếu có, phải là số hợp lệ và khớp `-PostgresPort`.

Sau khi kiểm tra, script truyền tường minh `psql -h <host> -p <port>`; không phụ
thuộc host/port ngầm từ môi trường. `PGPASSWORD` vẫn được dùng để xác thực và
không được ghi vào manifest hay log.

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

60 interaction được phân bổ cố định theo bốn cửa sổ analytics để các cửa sổ
tăng nghiêm ngặt:

| Cửa sổ | Số event trong khoảng | Tổng cộng dồn |
|---|---:|---:|
| 0–7 ngày | 8 | 8 |
| 7–30 ngày | 12 | 20 |
| 30–90 ngày | 16 | 36 |
| Cũ hơn 90 ngày | 24 | 60 |
| All Time | 60 | 60 |

Kết quả kỳ vọng: `8 < 20 < 36 < 60`. Không event nào ở tương lai. Timestamp
được chuẩn hóa UTC và giữ độ chính xác microsecond.

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
- `interactionDistributionVersion` (hiện tại là `2`).

### 6.1. Interaction anchor và phân bổ analytics

Lần Seed đầu tiên:

1. Lấy thời điểm UTC hiện tại làm anchor.
2. Ghi anchor vào manifest **trước khi** tạo interaction.
3. Sinh timestamp deterministic trải trên bốn band: 1–6 ngày, 8–29 ngày,
   31–89 ngày và 91–400 ngày trước anchor.

Seed lặp lại dùng đúng anchor đã lưu. Script không tạo dataset trôi theo thời
gian và không ghi đè timestamp đã có.

Dữ liệu mới phải có interaction trong cả bốn cửa sổ với số lượng chính xác:

- 7 ngày gần nhất: 8.
- 30 ngày gần nhất: 20.
- 90 ngày gần nhất: 36.
- All Time: 60.

Verify so khớp chính xác các con số này và báo lỗi nếu chạy trên dataset cũ
hoặc dataset đã trôi khỏi cửa sổ.

### 6.2. Manifest cũ chưa có anchor hoặc phân bổ cũ

Nếu manifest cũ chưa có `interactionAnchorAtUtc`, Seed suy ra anchor từ
interaction cũ để bảo toàn timestamp và ghi anchor vào manifest. Script cảnh
báo rõ; không tự động xóa hoặc sửa dữ liệu.

Manifest có interaction nhưng thiếu `interactionDistributionVersion = 2` bị
từ chối ở chế độ Seed/Verify **trước khi đọc token**. Cleanup vẫn được phép
chạy để dọn dữ liệu cũ. Quy trình làm mới trên database demo/disposable:

```powershell
.\backend\scripts\seed-demo-data.ps1 -Cleanup -Force
.\backend\scripts\seed-demo-data.ps1 -Seed -Force
```

Không tự động xóa manifest hoặc dữ liệu legacy. Cleanup là thao tác xóa tường
minh; chỉ thực hiện trên database demo/disposable.

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
  -PostgresHost 127.0.0.1 `
  -PostgresPort 5432 `
  -PostgresUser postgres `
  -PostgresDatabase smart_heritage
```

Với `-PostgresMode Local`, host/port chỉ được là loopback và được kiểm tra theo
mục 2.2. Script gọi `psql -h <host> -p <port>` tường minh; `PGHOSTADDR`,
`PGSERVICE`, `PGSERVICEFILE` và `PGOPTIONS` phải trống. `PGPASSWORD` được dùng để xác thực
nhưng không bị ghi lại.

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
- Anchor đã được lưu và `interactionDistributionVersion = 2`.
- Analytics 7/30/90/All Time khớp chính xác `8/20/36/60`.

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
Analytics 7 days  : 8
Analytics 30 days : 20
Analytics 90 days : 36
Analytics All Time: 60
API records       : Valid
Media files       : Valid
PostgreSQL data   : Matched
Beacon mapping    : Valid
Anonymous visitor : Valid
```

Verify thất bại nếu:

- Manifest thiếu anchor hoặc dùng phân bổ interaction cũ.
- Các cửa sổ analytics không tăng nghiêm ngặt hoặc không khớp
  `8/20/36/60`.
- Có interaction ở tương lai.
- API, manifest và PostgreSQL không khớp.
- Media không truy cập được hoặc không phải ảnh hợp lệ.

Riêng trường hợp dữ liệu cũ hoặc analytics đã trôi, chạy Cleanup rồi Seed lại
trên database demo.

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

Bundle có 20 ảnh JPEG (1200×800) cho 20 Artifact. Đây là **placeholder gốc do
dự án tạo** (nhãn `ẢNH MINH HỌA`), không phải ảnh thật của hiện vật/di tích; sinh
bởi `scripts/tools/generate-demo-placeholders.py`. 20 ảnh bên thứ ba ban đầu
không có bằng chứng giấy phép (NOT CLEARED) nên đã bị thay thế. Chi tiết audit
tại `docs/database/demo-media-attribution.md`.

Không thêm ảnh bên thứ ba vào repo công khai khi chưa có nguồn, tác giả, giấy
phép và điều kiện attribution được ghi lại.

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
- PostgreSQL Local host loopback và biến môi trường bị cấm.
- Legacy `interactionDistributionVersion` bị từ chối trước xác thực.
- Dry-run.

CI job `demo-seed-isolation` kiểm tra cô lập Docker:

- Tạo sentinel container `smart-heritage-db`, `smart-heritage-backend` và volume
  `smart-heritage_postgres_data` trước khi chạy.
- Chạy Compose với project, container name và volume name riêng.
- Xác nhận teardown chỉ xóa tài nguyên của project cô lập.
- Xác nhận sentinel mặc định không đổi.

CI job `demo-seed-lifecycle` chạy trên Docker Compose disposable:

- Dùng Compose project `smart-heritage-seed-<timestamp>-<pid>` và tên
  container/volume riêng; từ chối chạy nếu tên trùng stack mặc định.
- Seed lần đầu và Verify với 4/20/20/4/60.
- Seed lặp lại, Verify và kiểm tra anchor không đổi.
- Kiểm tra PostgreSQL analytics đúng `8|20|36|60`.
- Cleanup WhatIf không thay đổi dữ liệu/manifest.
- Mô phỏng Cleanup gián đoạn.
- Cleanup thật và bảo toàn bản ghi không thuộc seed.
- Seed lại sau Cleanup để làm mới anchor.
- Verify thất bại sau Cleanup.
- Teardown chỉ project cô lập và xác nhận stack mặc định không đổi.

Kết quả CI: sẽ được cập nhật sau khi chạy lại toàn bộ workflow cho commit
hardening.

## 14. Khắc phục sự cố

| Hiện tượng | Hướng xử lý |
|---|---|
| BaseUrl bị từ chối | Dùng `localhost`, `127.0.0.1` hoặc `::1`; bỏ path/query/credentials |
| PostgreSQL Local host bị từ chối | Dùng `localhost`, `127.0.0.1` hoặc `::1`; bỏ `PGHOSTADDR`/`PGSERVICE`/`PGSERVICEFILE` |
| `PGHOST`/`PGPORT` không khớp tham số | Đặt biến môi trường khớp `-PostgresHost`/`-PostgresPort` hoặc bỏ các biến đó |
| Manifest dùng phân bổ cũ | Chạy `-Cleanup -Force` rồi `-Seed -Force` trên database demo/disposable |
| Không kết nối được API | Kiểm tra backend, Docker Compose và BaseUrl |
| ADMIN token không hợp lệ | Kiểm tra token và quyền ADMIN |
| Không tìm thấy manifest | Chạy Seed để tạo manifest mới |
| Manifest thuộc BaseUrl khác | Xác định đúng môi trường trước khi tiếp tục |
| Manifest thiếu anchor | Chạy Seed một lần để lưu anchor từ dữ liệu hiện có |
| Analytics 7 ngày bằng 0 hoặc sai `8/20/36/60` | Dữ liệu cũ/đã trôi; chạy Cleanup rồi Seed lại trên database demo |
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
