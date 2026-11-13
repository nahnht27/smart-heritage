# Schema baseline và xác minh

Tài liệu này hướng dẫn phân loại schema hiện có trước khi dùng Flyway baseline.
Mục tiêu là không chạy lại migration đã có và không làm mất dữ liệu.

## 1. Công cụ detection

Script: [`scripts/database/detect-schema-version.sql`](../../scripts/database/detect-schema-version.sql)

```bash
psql "$SPRING_DATASOURCE_URL" -f scripts/database/detect-schema-version.sql
```

Script chỉ đọc. Output gồm `detected_version`, `flyway_version` và các cờ:

| Cột | Ý nghĩa |
|---|---|
| `has_base_tables` | Có đủ bảng gốc V1 |
| `has_beacon` | Có bảng `beacon` (V3) |
| `has_visitor_id`, `visitor_id_not_null` | Có `visitor_interaction.visitor_id` và NOT NULL (V2) |
| `user_id_nullable` | `visitor_interaction.user_id` cho phép NULL (V2) |
| `has_beacon_id`, `beacon_id_nullable` | Có `visitor_interaction.beacon_id` và nullable (V3) |
| `has_analytics_index` | Có index `idx_visitor_interaction_interacted_at` trên đúng cột |
| `has_visitor_index` | Có index `idx_visitor_interaction_visitor_id` trên đúng cột |
| `has_beacon_index` | Có index `idx_visitor_interaction_beacon_id` trên đúng cột |
| `has_beacon_artifact_index` | Có index `idx_beacon_artifact_id` trên đúng cột |
| `has_beacon_major_check`, `has_beacon_minor_check` | Có check đúng tên **và** biểu thức đã chuẩn hoá khớp `major`/`minor BETWEEN 0 AND 65535`; constraint đã validate |
| `has_beacon_enabled_not_null`, `has_beacon_enabled_true_default` | `beacon.enabled` NOT NULL, default `true` |
| `has_beacon_identity_unique` | Unique `(proximity_uuid, major, minor)` |
| `has_event_id_unique` | Unique `visitor_interaction.event_id` |
| `has_beacon_fk_set_null` | FK đúng cột `beacon_id → beacon.beacon_id`, `ON DELETE SET NULL` |
| `has_v4_shape` | Đủ toàn bộ invariant V4 ở trên |

Các kiểm tra dùng `to_regclass`, nên script chạy an toàn cả khi bảng `beacon`
chưa tồn tại (V1/V2). Check constraint được so khớp bằng cả tên và biểu thức
`pg_get_constraintdef` đã chuẩn hoá (bỏ whitespace/ngoặc), không chỉ tên; cùng
tên nhưng sai range bị coi là thiếu. Khi `flyway_schema_history` tồn tại,
version history được đọc để phân biệt V3/V4: migration V3 đã tạo cùng catalog
shape với V4. Không có history thì schema đủ chuẩn hoá được báo `4`; schema
kiểu Hibernate thiếu
index/check/default/nullability/FK action được báo `3`.

## 2. Đọc kết quả

| `detected_version` | Ý nghĩa | Baseline đề xuất |
|---|---|---|
| `1` | Schema V1, chưa có anonymous visitor/beacon | 1 |
| `2` | Có `visitor_id`, chưa có beacon | 2 |
| `3` | V3 theo history, hoặc schema kiểu Hibernate còn thiếu chuẩn hoá V4 | 3 |
| `4` | Đã đủ schema V4 | 4 |
| `UNEXPECTED` | Không khớp chuỗi migration | **Không baseline**; review thủ công |
| `INCOMPLETE` | Thiếu bảng gốc | **Không baseline**; kiểm tra sai DB/schema |

`3` là kết quả bình thường với database do Hibernate tạo: đủ bảng/cột nhưng
thiếu index/check/default/nullability/FK action. V4 sẽ bổ sung các phần thiếu. V3 có history
cũng trả `3` dù catalog đã giống V4; không được dùng shape một mình để baseline
V3 thành V4.

`UNEXPECTED` cũng là kết quả đúng khi history ghi V4 nhưng thiếu một invariant
V4 (index, check, default, nullability, FK action...). Constraint đúng tên nhưng
sai biểu thức cũng bị coi là thiếu. Tuyệt đối không baseline các kết quả
`UNEXPECTED`/`INCOMPLETE`.

## 3. Checklist trước baseline

- [ ] Đã xác nhận đúng database/host (không phải dev hoặc production khác).
- [ ] Backend đã dừng.
- [ ] Backup mới đã tạo, file không rỗng và có magic `PGDMP`.
- [ ] `flyway_schema_history` **chưa tồn tại** (nếu có, không baseline).
- [ ] Detection không trả `UNEXPECTED`/`INCOMPLETE`.
- [ ] Đã đối chiếu bảng/cột/index/constraint với version dự kiến.
- [ ] Có người thứ hai review nếu là production.

## 4. Xác minh schema sau migration

Chạy lại detection; kỳ vọng `detected_version = 4`. Sau đó kiểm tra:

### Bảng và cột

- `heritage_site`, `artifact`, `multimedia`, `role`, `"user"`,
  `visitor_interaction`, `beacon` tồn tại.
- `visitor_interaction` có `visitor_id` NOT NULL, `user_id` nullable,
  `beacon_id` nullable.
- `beacon.enabled` NOT NULL, default `true`.

### Index

- `idx_visitor_interaction_interacted_at`
- `idx_visitor_interaction_visitor_id`
- `idx_visitor_interaction_beacon_id`
- `idx_beacon_artifact_id`

### Constraint

- `uk_visitor_interaction_event_id`
- `uk_beacon_identity (proximity_uuid, major, minor)`
- `ck_beacon_major_range` và `ck_beacon_minor_range` (`0..65535`)
- FK `visitor_interaction.beacon_id → beacon.beacon_id` có
  `ON DELETE SET NULL`

### Dữ liệu

- Đếm bản ghi các bảng nghiệp vụ trước/sau migration không giảm.
- Interaction đã có `beacon_id` vẫn giữ liên kết.
- Xoá beacon (trên bản sao) không xoá interaction; `beacon_id` chuyển NULL.

### Ứng dụng

- Backend start với `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`.
- `/api/health` trả `UP`.
- Log Flyway không có migration lỗi; history có V4 success.

## 5. Lệnh mẫu

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://host:5432/db'
export SPRING_DATASOURCE_USERNAME='user'
export SPRING_DATASOURCE_PASSWORD='password'
export FLYWAY_NETWORK=host            # production: smart-heritage-production_internal
export FLYWAY_BASELINE_VERSION=3      # 1/2/3/4 theo detection

# Xem trạng thái, không sửa
scripts/database/flyway.sh info

# Chỉ baseline khi chưa có history
scripts/database/flyway.sh baseline

# Áp dụng phần còn thiếu
scripts/database/flyway.sh migrate

# Kiểm tra lại
scripts/database/flyway.sh info
```

Script dùng image `flyway/flyway:10.22.0`, mount thư mục migration read-only;
không cần Java/Maven trên host. Biến `SPRING_DATASOURCE_*` phải trỏ đúng
database đích. Không đặt password trong file được commit.

Có thể dùng Maven plugin tương đương (`./mvnw -B flyway:info|baseline|migrate`)
nếu môi trường đã có Java và source checkout.

## 6. Kết quả kiểm chứng LTJ-54

Đã chạy trên PostgreSQL 16 disposable, không dùng dữ liệu dev/production:

- Fresh DB: V1–V4 success, history 1–4, app health `UP`, Hibernate validate pass.
- DB kiểu Hibernate (không history): detection `3`, baseline 3, V4 success,
  detection `4`, dữ liệu giữ nguyên, app health `UP`.
- DB V1: baseline 1 rồi migrate V2–V4, history đúng, dữ liệu giữ nguyên.
- DB V2: baseline 2 rồi migrate V3–V4, history đúng.
- `SchemaDetectorIT`: 16/16 pass (bao gồm V1/V2 không có bảng `beacon`, V3 có
  history, Hibernate-era, các V4 thiếu invariant và constraint cùng tên sai
  biểu thức).
- `DatabaseMigrationIT`: 8/8 pass; `VisitorInteractionPostgresIT`: 22/22 pass.

Production thật vẫn **PENDING** vì chưa có hạ tầng/credentials.
