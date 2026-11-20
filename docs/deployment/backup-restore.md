# PostgreSQL backup & restore

Quy trình S6-M1-02 dùng bộ script an toàn trong `scripts/database/`:

- `scripts/database/backup.sh`
- `scripts/database/restore.sh`
- `scripts/database/test-backup-restore.sh`

Chi tiết thiết kế, kịch bản kiểm chứng và giới hạn:
[`docs/sprint-6/database-backup-restore.md`](../sprint-6/database-backup-restore.md).

## 1. Nguyên tắc an toàn

- Chỉ restore vào database **đã tồn tại và trống**.
- Không restore đè lên database đang phục vụ.
- Không dùng `pg_restore --clean`.
- Không để script restore tự tạo/drop database tùy ý.
- Không dùng credential production cho test disposable.
- Luôn kiểm tra checksum và metadata trước khi restore.
- Không commit dump, checksum, metadata hoặc file chứa credential.

Các script cũ trong `scripts/deployment/` là wrapper Docker Compose cho
production. `restore-postgres.sh` cũng từ chối primary database, target không
trống và không dùng `--clean`; không dùng chúng cho diễn tập S6.

## 2. Yêu cầu

- PostgreSQL 16; client major >= server major.
- `pg_dump`, `pg_restore`, `psql`, `createdb`, `dropdb`, `sha256sum`.
- Flyway wrapper dùng Docker (`FLYWAY_MODE=docker`) hoặc Maven plugin
  (`FLYWAY_MODE=maven`); chế độ `auto` tự chọn.
- Java 17 và backend jar nếu chạy application compatibility check; Maven mode
  cũng cần Java 17.

Không dùng tài liệu này để thao tác trực tiếp trên production data.

## 3. Cấu hình kết nối

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGDATABASE=smart_heritage
export PGUSER=smart_heritage_app
export PGPASSFILE="$HOME/.pgpass"
chmod 600 "$PGPASSFILE"
```

Không truyền password qua argument và không in password ra log. `PGPASSWORD`
chỉ nên dùng cho CI/disposable test.

## 4. Backup

```bash
scripts/database/backup.sh --output-dir /var/backups/smart-heritage
```

Script:

1. Kiểm tra đúng database và PostgreSQL major 16.
2. Chạy `pg_dump --format=custom --compress=9 --no-owner --no-privileges`.
3. Kiểm tra magic `PGDMP` và đọc archive bằng `pg_restore --list`.
4. Tính SHA-256, kích thước, server/client version và UTC timestamp.
5. Ghi `.dump`, `.dump.sha256`, `.dump.metadata` với mode `600`.

Đường dẫn backup được in ra stdout; log ở stderr. Script không ghi đè file đã
tồn tại và từ chối thư mục source chưa được gitignore.

Dump chỉ chứa database hiện tại, không chứa role/global object. Nếu cần khôi
phục role/password, phải có quy trình `pg_dumpall --globals-only` riêng.

## 5. Restore vào database trống

```bash
createdb --maintenance-db=postgres smart_heritage_restore_verify

export PROTECTED_DATABASES=smart_heritage
scripts/database/restore.sh \
  /var/backups/smart-heritage/smart_heritage_20261120T100000Z.dump \
  smart_heritage_restore_verify
```

Mặc định phải gõ đúng tên database đích. Chỉ dùng `--yes` khi automation đã xác
định chính xác target.

Script từ chối:

- Target trùng database nguồn trong metadata.
- `postgres`, `template0`, `template1` hoặc database trong
  `PROTECTED_DATABASES`; mặc định đã chặn `smart_heritage`,
  `smart_heritage_prod`, `smart_heritage_production`.
- Target đã có user object.
- Checksum/size mismatch, archive hỏng hoặc version không tương thích.

Restore dùng `--exit-on-error --single-transaction --no-owner --no-privileges`.
Không có `--clean`; lỗi giữa chừng được rollback. Database target và source
không bị drop bởi script.

## 6. Diễn tập trên database disposable

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=backup_ci
export PGPASSWORD=backup_ci
export TEST_DB_PREFIX=s6_local_
export FLYWAY_MODE=auto

BACKEND_JAR=backend/target/backend-0.0.1-SNAPSHOT.jar \
REQUIRE_APP_CHECK=1 \
  bash scripts/database/test-backup-restore.sh
```

Script tạo ba database có prefix do nó kiểm soát, seed dữ liệu deterministic,
backup, thử các trường hợp bị từ chối, restore, so sánh data/schema/Flyway,
kiểm tra sequence và chạy backend với `ddl-auto=validate`.

Không đặt `TEST_DB_PREFIX` trùng tên database thật.

## 7. Sau restore

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://host:5432/smart_heritage_restore_verify'
export SPRING_DATASOURCE_USERNAME='user'
export SPRING_DATASOURCE_PASSWORD='password'
export FLYWAY_NETWORK=host

scripts/database/flyway.sh info
scripts/database/flyway.sh validate
```

Kiểm tra thêm:

- Flyway history V1–V4 `success=true`, không có migration fail.
- Backend start với `ddl-auto=validate`, `/api/health` trả `UP`.
- Dữ liệu heritage site/artifact/beacon/interaction quan trọng còn đúng.
- Không có invalid index hoặc sequence lệch.

## 8. Giới hạn

- Không có PITR; chỉ restore từ dump.
- Không tự động mã hóa/offsite/retention.
- Không tự chuyển backend sang database mới.
- Không có production data để diễn tập.
- Legacy `scripts/deployment/backup-postgres.sh` không tạo checksum/metadata;
  dùng `scripts/database/backup.sh` khi môi trường cho phép kết nối libpq.
