# Database migration strategy

Tài liệu này là nguồn chuẩn cho thay đổi schema PostgreSQL của Smart Heritage.
Migration dùng **Flyway 10.22.0**, chạy tự động khi backend khởi động và không
được thay thế bằng Hibernate `ddl-auto`.

## 1. Nguyên tắc

- **Forward-only**: mọi thay đổi schema là file migration mới, không sửa file đã
  áp dụng trên môi trường dùng chung.
- **Không auto-baseline**: `baseline-on-migrate=false`. Database không có lịch
  sử Flyway phải được phân loại và baseline tường minh.
- **Không dùng Hibernate để đổi schema**: production đặt
  `spring.jpa.hibernate.ddl-auto=validate`; lỗi validate làm app fail-fast thay
  vì tự sửa bảng.
- **Không xoá dữ liệu**: migration hiện tại chỉ thêm bảng/cột/index/constraint
  và chuẩn hoá metadata, không drop dữ liệu nghiệp vụ.
- **Backup trước thay đổi**: luôn backup và kiểm tra file trước khi migrate môi
  trường có dữ liệu thật.
- **Không dùng `flyway:clean`**: plugin đặt `cleanDisabled=true`; không xoá
  schema để "sửa lỗi".
- **Rollback code không tự rollback schema**: khôi phục dữ liệu bằng backup/
  restore hoặc viết migration tiến/lùi có kiểm soát.

## 2. Migration hiện có

| Version | File | Nội dung |
|---|---|---|
| V1 | `V1__baseline_schema.sql` | Schema gốc M1/M2: heritage site, artifact, multimedia, role, user, visitor interaction |
| V2 | `V2__visitor_interaction_anonymous_visitor.sql` | `visitor_id`, cho phép `user_id` nullable, index analytics |
| V3 | `V3__beacon_management.sql` | Bảng `beacon`, FK `visitor_interaction.beacon_id`, check/index Wave 4 |
| V4 | `V4__normalize_legacy_schema.sql` | Chuẩn hoá DB do Hibernate tạo: index, default `enabled`, check range, FK `ON DELETE SET NULL` |

V4 kiểm tra biểu thức của constraint check trùng tên. Nếu `ck_beacon_major_range`
hoặc `ck_beacon_minor_range` tồn tại nhưng không đúng range `0..65535`, migration
fail rõ ràng; không tự drop/thay thế constraint và không sửa dữ liệu nghiệp vụ.

Với FK, V4 so khớp chính xác `conkey`/`confkey` của
`visitor_interaction.beacon_id → beacon.beacon_id`. FK đúng mapping và
`ON DELETE SET NULL` được giữ nguyên; FK đúng mapping nhưng sai delete action
được thay bằng FK chuẩn; FK trỏ tới `beacon` qua cột khác làm migration fail rõ
ràng và không bị drop.

Không sửa checksum của V1–V4 sau khi đã merge. Thay đổi tiếp theo bắt đầu từ
`V5__...sql`.

## 3. Trạng thái database và cách adoption

| Database hiện tại | Cách xử lý | Migration sẽ chạy |
|---|---|---|
| Database trống | Không baseline | V1 → V4 |
| Schema Hibernate hiện tại, chưa có `flyway_schema_history` | Baseline tường minh ở **3**, sau đó migrate | V4 |
| Schema đã có V2, chưa có V3/V4 | Baseline ở **2**, sau đó migrate | V3 → V4 |
| Schema đã có V1, chưa có V2/V3/V4 | Baseline ở **1**, sau đó migrate | V2 → V3 → V4 |
| Schema đã đầy đủ V4 nhưng chưa có history | Baseline ở **4** | Không chạy lại migration |
| Đã có history | Không baseline; chạy `flyway:info`, xử lý theo version hiện tại | Phần còn thiếu |

Dùng [`scripts/database/detect-schema-version.sql`](../../scripts/database/detect-schema-version.sql)
để phân loại trước khi baseline. Script chỉ đọc, không sửa database. Quy trình
chi tiết và checklist xác minh nằm trong
[schema-baseline.md](schema-baseline.md).

### Vì sao mặc định baseline là 3?

Schema hiện tại do Hibernate tạo có đủ bảng/cột của V1–V3 nhưng thiếu một số
index, check constraint, default và `ON DELETE SET NULL`. Baseline ở 3 cho phép
V4 chuẩn hoá các khác biệt đó mà không chạy lại V2/V3 trên dữ liệu đã tồn tại.
Nếu database đã đầy đủ V4, baseline ở 4 để bỏ qua V4.

## 4. Quy trình cho database đang có dữ liệu

1. **Dừng backend** để không có ghi đồng thời.
2. **Backup** theo [backup-restore.md](../deployment/backup-restore.md) và kiểm
   tra file dump.
3. Chạy detection SQL và ghi lại output.
4. Kiểm tra schema thực tế theo checklist trong
   [schema-baseline.md](schema-baseline.md).
5. Nếu **chưa có** `flyway_schema_history`, baseline đúng version. Script dùng
   Flyway CLI trong Docker, không cần Java/Maven trên host:

   ```bash
   export SPRING_DATASOURCE_URL='jdbc:postgresql://host:5432/db'
   export SPRING_DATASOURCE_USERNAME='user'
   export SPRING_DATASOURCE_PASSWORD='password'
   export FLYWAY_NETWORK=host            # local; production dùng network Compose
   export FLYWAY_BASELINE_VERSION=3      # 1/2/3/4 theo detection

   scripts/database/flyway.sh baseline
   ```

   Trong production, đặt `FLYWAY_NETWORK=smart-heritage-production_internal` và
   URL `jdbc:postgresql://postgres:5432/<db>` vì PostgreSQL không publish cổng.

6. Chạy migrate và kiểm tra history:

   ```bash
   scripts/database/flyway.sh migrate
   scripts/database/flyway.sh info
   ```

7. Chạy detection lại; kỳ vọng `detected_version = 4`.
8. Khởi động backend với `ddl-auto=validate`, kiểm tra `/api/health` và dữ liệu
   nghiệp vụ.
9. Ghi lại version, thời điểm, người thực hiện và backup tương ứng.

Lệnh `baseline` sẽ từ chối nếu history đã có migration. Không drop
`flyway_schema_history` để lách lỗi; khi đó phải đối chiếu history hiện tại và
xử lý bằng migration mới.

## 5. Fresh database và môi trường phát triển

- `docker compose up -d postgres backend` tạo database trống; backend chạy
  V1–V4 rồi Hibernate validate.
- Không cần chạy baseline cho database trống.
- Chỉ xoá volume dev bằng `docker compose down -v` khi chủ động muốn mất dữ liệu
  local.
- Test H2 dùng `ddl-auto=create-drop` và Flyway tắt; đây không phải bằng chứng
  cho migration. Bằng chứng migration phải chạy trên PostgreSQL thật.

## 6. Kiểm thử bắt buộc

- `DatabaseMigrationIT`: fresh V1–V4, không auto-baseline, baseline 3/2/1, chuẩn
  hoá schema kiểu Hibernate bằng V4, fail an toàn khi constraint trùng tên sai,
  và xác minh FK đúng mapping/sai delete action/sai cột.
- `VisitorInteractionPostgresIT`: API/service trên PostgreSQL 16 với Flyway và
  Hibernate validate.
- `SchemaDetectorIT`: detector trên V1/V2 không có `beacon`, V3 có history,
  V4 đầy đủ, Hibernate-era, và các V4 thiếu invariant hoặc sai biểu thức check.
- CI `postgres-integration` chạy cả ba report và fail nếu thiếu test/failure/
  error/skip.
- Trước release: backup + migrate trên bản sao hoặc database cô lập, sau đó kiểm
  tra app start, health và dữ liệu.

## 7. Giới hạn

- Chưa có production database thật để diễn tập; verification hiện dùng
  PostgreSQL 16 disposable.
- Chưa có PITR; rollback dữ liệu dựa trên dump/restore.
- V4 không sửa dữ liệu nghiệp vụ và không tự xoá constraint lạ. Nếu detection
  trả `UNEXPECTED`, dừng lại và review schema thay vì baseline mù.
