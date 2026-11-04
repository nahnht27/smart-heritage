# PostgreSQL backup & restore

Scripts:

- `scripts/deployment/backup-postgres.sh`
- `scripts/deployment/restore-postgres.sh`

Cả hai dùng Docker Compose để chạy `pg_dump`/`pg_restore` **trong container**
PostgreSQL, nên host không cần cài PostgreSQL client và password không bị in ra
log.

## 1. Yêu cầu

- Production stack đang chạy (`docker-compose.production.yml` + `.env.production`).
- Docker + Compose V2 (`docker compose`). Legacy `docker-compose` chỉ là fallback.
- Quyền đọc `.env.production` và ghi thư mục backup.
- Không chạy restore lên database đang được người dùng sử dụng nếu chưa có cửa
  sổ bảo trì và backup mới.

Biến môi trường tuỳ chọn cho cả hai script:

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `COMPOSE_FILE` | `docker-compose.production.yml` | Compose file |
| `ENV_FILE` | `.env.production` | Env file production |
| `POSTGRES_SERVICE` | `postgres` | Tên service Compose |
| `COMPOSE_CMD` | auto | Override lệnh Compose khi cần (ví dụ đường dẫn binary) |

## 2. Backup

```bash
scripts/deployment/backup-postgres.sh
```

Script sẽ:

1. Kiểm tra Compose file/env file.
2. Kiểm tra service PostgreSQL đang chạy và `pg_isready`.
3. Chạy `pg_dump --format=custom --no-owner --no-privileges`.
4. Tạo `backups/<database>_<UTC timestamp>.dump`.
5. Kiểm tra file không rỗng và có magic `PGDMP`.
6. Đặt quyền `600`.

Ví dụ kết quả:

```text
[backup] Dumping database 'smart_heritage' to backups/smart_heritage_20261104T130811Z.dump
[backup] Backup OK: backups/smart_heritage_20261104T130811Z.dump (18337 bytes)
```

Tùy chọn:

```bash
BACKUP_DIR=/var/backups/smart-heritage scripts/deployment/backup-postgres.sh
```

`backups/` đã nằm trong `.gitignore`; không commit dump.

Khuyến nghị vận hành:

- Copy backup ra khỏi host và mã hoá khi lưu trữ dài hạn.
- Giữ retention theo chính sách của team (script không tự xoá backup cũ).
- Chạy backup trước mỗi release và trước rollback.
- Không đặt backup trong thư mục được serve public.

## 3. Restore

```bash
scripts/deployment/restore-postgres.sh backups/smart_heritage_20261104T130811Z.dump
```

Script sẽ:

1. Kiểm tra file backup và magic `PGDMP`.
2. Kiểm tra PostgreSQL đang chạy/healthy.
3. Xác định target database (`POSTGRES_DB` hoặc `RESTORE_DB`).
4. Cảnh báo rõ thao tác destructive.
5. Yêu cầu gõ đúng tên database để xác nhận.
6. Từ chối restore vào **primary database** trừ khi
   `ALLOW_PRIMARY_DB_RESTORE=yes` được đặt rõ ràng.
7. Chạy `pg_restore --clean --if-exists --no-owner --no-privileges
   --single-transaction`.
8. Kiểm tra database sau restore.

Không xoá Docker volume. Tuy nhiên object có trong backup sẽ bị drop/recreate;
dữ liệu hiện có trong target database có thể bị thay thế.

### Restore vào database chính (production)

Chỉ sau khi:

- Đã backup mới.
- Đã dừng backend để tránh ghi dữ liệu.
- Đã xác nhận đúng database.

```bash
docker compose -f docker-compose.production.yml --env-file .env.production stop backend
ALLOW_PRIMARY_DB_RESTORE=yes \
  scripts/deployment/restore-postgres.sh backups/<file>.dump
docker compose -f docker-compose.production.yml --env-file .env.production start backend
```

### Diễn tập restore trên database cô lập (khuyến nghị)

Tạo database riêng trong cùng container PostgreSQL, restore vào đó, kiểm tra,
rồi xoá database test:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production \
  exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" smart_heritage_restore_test'

RESTORE_DB=smart_heritage_restore_test \
CONFIRM_RESTORE=yes \
  scripts/deployment/restore-postgres.sh backups/<file>.dump

docker compose -f docker-compose.production.yml --env-file .env.production \
  exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d smart_heritage_restore_test -c "SELECT 1"'
```

Không dùng `RESTORE_DB` trỏ nhầm database đang phục vụ người dùng.

### Non-interactive (CI/automation)

`CONFIRM_RESTORE=yes` bỏ qua prompt nhưng vẫn giữ guard primary database. Chỉ
dùng khi đã xác định đúng target từ trước.

## 4. Bằng chứng kiểm chứng

Ngày 2026-11-04, chạy trên **project Compose cô lập** `smart-heritage-task4-test`
với database test `smart_heritage_prod_test` (không phải dữ liệu dev/production):

- Backup: `smart_heritage_prod_test_20261104T130811Z.dump`, 18337 bytes, magic
  `PGDMP`, mode `600`.
- Tạo database đích riêng `smart_heritage_restore_test`.
- Restore bằng `RESTORE_DB=smart_heritage_restore_test CONFIRM_RESTORE=yes`:
  exit 0.
- Kiểm tra dữ liệu marker sau restore: trả `persists` → PASS.
- Guard primary DB: chạy restore không có `ALLOW_PRIMARY_DB_RESTORE` vào
  `smart_heritage_prod_test` → từ chối, exit 1 → PASS.
- Không restore vào database dev đang chạy; không xoá volume của stack dev.

## 5. Giới hạn

- Không có backup tự động theo lịch trong M1; nếu cần, thêm cron/systemd timer
  gọi script và giám sát exit code.
- Không có mã hoá/offsite upload sẵn; team cần bổ sung theo hạ tầng.
- Không phải PITR (point-in-time recovery); chỉ restore từ dump.
- `pg_restore --clean` không drop các object không có trong backup và không
  reset toàn bộ database; muốn sạch hoàn toàn phải tạo database mới rồi restore.
- Luôn kiểm tra version PostgreSQL của dump và server đích tương thích.
