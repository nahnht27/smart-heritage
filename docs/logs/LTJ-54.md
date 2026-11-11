# Log: LTJ-54 — Database Migration & Schema Governance

## Thông tin chung

- **Branch:** `LTJ-54-database-migration-schema-governance`
- **Base:** `origin/main` tại `43a3a72`
- **Implementation commit:** `38b623e`
- **Mục tiêu:** Flyway versioned migrations, baseline an toàn cho database cũ,
  Hibernate `validate`, giữ nguyên dữ liệu, cập nhật CI/Docker/tài liệu.

## A. Git

- Branch tạo từ `origin/main` mới nhất, không sửa trực tiếp `main`.
- Không reset/rebase/force-push; không merge PR.
- PR mở vào `main` sau khi hoàn tất kiểm chứng.

## B. Audit

- Trước thay đổi, `application.yml` đặt `baseline-on-migrate: true`,
  `baseline-version: 1`. Với schema hiện tại, Flyway sẽ baseline ở V1 rồi chạy
  lại V2/V3 trên schema đã có — không an toàn.
- `ddl-auto` đã là `validate`, nhưng production compose không override Flyway/
  Hibernate rõ ràng.
- Schema do Hibernate tạo đủ bảng/cột nhưng thiếu:
  - index analytics/beacon,
  - `beacon.enabled` default,
  - check range `major`/`minor`,
  - `ON DELETE SET NULL` cho `visitor_interaction.beacon_id`.
- Tài liệu production còn ghi `ddl-auto: update` và “không có migration tool”.

## C. Implementation

- Thêm `V4__normalize_legacy_schema.sql`, idempotent, không sửa dữ liệu nghiệp
  vụ; bổ sung index/check/default/FK action còn thiếu.
- Đổi Flyway sang baseline tường minh:
  - `baseline-on-migrate: false`
  - `baseline-version: 3` cho schema kiểu Hibernate
  - `validate-on-migrate: true`, `clean-disabled: true`, `out-of-order: false`.
- Production Compose đặt `SPRING_FLYWAY_ENABLED=true`,
  `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false`,
  `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`.
- Thêm Flyway Maven plugin và `scripts/database/flyway.sh` (Flyway CLI Docker,
  không cần Java/Maven trên host).
- Thêm `scripts/database/detect-schema-version.sql` (read-only) để phân loại
  V1/V2/V3/V4 trước baseline.
- Thêm `DatabaseMigrationIT` (6 test) và cập nhật `VisitorInteractionPostgresIT`
  kiểm tra Flyway V4.
- CI gate kiểm tra cả hai report: 22 Visitor Interaction + 6 migration.
- Thêm/cập nhật tài liệu database, deployment, release, ERD, CI, README.

## D. Data safety

- Không có `DROP TABLE`/`DROP COLUMN`/data rewrite.
- Baseline chỉ chạy khi chưa có `flyway_schema_history`; không auto-baseline.
- V4 dùng `IF NOT EXISTS`/`DO` block; nếu beacon vi phạm range check, migration
  fail rõ ràng thay vì bỏ qua.
- Test xác nhận dữ liệu V1/V2/current/Hibernate-like được giữ nguyên; xoá beacon
  chỉ chuyển `beacon_id` về NULL, không xoá interaction.
- Manual DB kiểu Hibernate: 1 site, 1 artifact, 1 beacon, 1 interaction trước và
  sau migration; interaction vẫn trỏ beacon 1; app health UP với validate.

## E. Tests / verification

- `./mvnw -B test`: **134/134 PASS**.
- `./mvnw -B -Ppostgres-integration verify`: **28/28 PASS**
  - `DatabaseMigrationIT`: 6/6
  - `VisitorInteractionPostgresIT`: 22/22.
- CI report gate local: `GATE OK` (22 + 6, 0 failure/error/skip).
- Fresh PostgreSQL 16:
  - Flyway V1–V4, history `1,2,3,4`;
  - app health `UP`, Hibernate validate PASS.
- Database kiểu Hibernate (không history):
  - detection `3`;
  - baseline 3 → V4 → detection `4`;
  - app health `UP`, dữ liệu giữ nguyên.
- Database V1: baseline 1 → V2/V3/V4; history đúng.
- Database V2: baseline 2 → V3/V4; history đúng.
- `flyway.sh` CLI: `info`, `baseline`, `migrate`, `validate` PASS trên
  PostgreSQL disposable.
- Compose V2 `config -q`: PASS.
- YAML parse, `bash -n`, `git diff --check`: PASS.

## F. Remaining

- Push branch, mở PR vào `main`, chờ CI thực tế.
- Chưa có production database/credentials thật để diễn tập; mới kiểm chứng trên
  PostgreSQL 16 disposable.
- Chưa có PITR; rollback dữ liệu dựa trên backup/restore.
