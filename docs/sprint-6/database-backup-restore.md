# Sprint 6 — Database backup, restore và migration acceptance

Tài liệu này mô tả quy trình backup/restore PostgreSQL 16 cho Smart Heritage và
cách kiểm chứng bằng database disposable. Phạm vi **S6-M1-02** không bao gồm
deploy production, PITR, hay restore đè lên database đang phục vụ.

## 1. Mục tiêu và phạm vi

Mục tiêu:

- Tạo backup custom-format có timestamp, SHA-256 và metadata.
- Restore chỉ vào database đích đã tồn tại và đang trống.
- Không dùng `pg_restore --clean`; không drop/tạo database tùy ý trong restore.
- Chứng minh dữ liệu, schema, constraint, index, sequence và Flyway history
  còn nguyên sau restore.
- Chứng minh backend khởi động với Hibernate `ddl-auto=validate` trên database
  đã restore.
- Chạy toàn bộ round trip trong CI với PostgreSQL 16 disposable.

Không nằm trong phạm vi:

- Production backup/restore hoặc thao tác trên dữ liệu thật.
- Point-in-time recovery (PITR), WAL archiving, logical replication.
- Backup roles/globals/password hashes ngoài database hiện tại.
- Tự động chuyển backend sang database mới sau restore.
- Mã hóa, offsite upload hoặc lịch backup tự động.

## 2. Thành phần và luồng

| Thành phần | Vai trò |
|---|---|
| `scripts/database/backup.sh` | Tạo dump custom, checksum và metadata bằng libpq trên host |
| `scripts/database/restore.sh` | Kiểm tra an toàn và restore vào database trống |
| `scripts/database/test-backup-restore.sh` | Tạo DB disposable, seed, backup, restore, verify, chạy app |
| `scripts/database/fixtures/backup-restore-fixture.sql` | Dữ liệu deterministic cho round trip |
| `scripts/database/flyway.sh` | Chạy Flyway `info`, `migrate`, `validate` |
| `.github/workflows/ci.yml` job `database-backup-restore` | Chạy acceptance trong CI |

Luồng chuẩn:

```text
PostgreSQL 16 source
        |
        | Flyway V1..V4
        | seed fixture
        v
backup.sh ──> .dump + .sha256 + .metadata
        |
        | checksum + pg_restore --list
        v
PostgreSQL 16 target (empty)
        |
        | restore.sh (single transaction, exit-on-error)
        v
data/schema/Flyway compare + app health/content/beacon check
```

## 3. Yêu cầu môi trường

- PostgreSQL server major **16**.
- PostgreSQL client major >= server major; CI dùng `postgresql-client-16`.
- Các lệnh: `pg_dump`, `pg_restore`, `psql`, `createdb`, `dropdb`, `sha256sum`.
- Flyway có thể chạy qua Docker wrapper (`FLYWAY_MODE=docker`) hoặc Maven
  plugin (`FLYWAY_MODE=maven`). Chế độ `auto` dùng Docker nếu daemon sẵn sàng,
  nếu không thì fallback Maven.
- Java 17 và backend jar nếu chạy application compatibility check; Maven mode
  cũng cần Java 17.
- Kết nối trực tiếp tới PostgreSQL test; không cần publish cổng production.

Không chạy các lệnh trong tài liệu này với `PGHOST`/`PGDATABASE` trỏ tới
production.

## 4. Cấu hình kết nối và bảo mật

Script dùng biến chuẩn của libpq:

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGDATABASE=smart_heritage
export PGUSER=smart_heritage_app
export PGPASSFILE="$HOME/.pgpass"
chmod 600 "$PGPASSFILE"
```

Quy tắc:

- Không truyền password qua command-line argument.
- Không in password, `PGPASSFILE` content hoặc connection string đầy đủ ra log.
- `PGPASSWORD` chỉ dùng cho CI/disposable test; production nên dùng
  `PGPASSFILE` được bảo vệ.
- Backup, metadata và checksum phải có mode `600`; thư mục backup nên ngoài
  source tree hoặc đã nằm trong `.gitignore`.
- Không commit `.dump`, `.backup`, `.sql.gz`, metadata hoặc checksum.
- Mặc định chặn các tên production `smart_heritage`, `smart_heritage_prod`,
  `smart_heritage_production`; dùng `PROTECTED_DATABASES` để thêm tên khác
  (đặt rỗng chỉ khi thật sự cần, không dùng cho production).

Script backup kiểm tra server major, client `pg_dump`, database thực tế đang kết
nối và từ chối ghi vào thư mục source chưa được gitignore.

## 5. Backup

```bash
chmod 600 "$PGPASSFILE"
scripts/database/backup.sh --output-dir /var/backups/smart-heritage
```

Script thực hiện:

1. Kiểm tra `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`.
2. Kết nối non-interactive (`-w`) và xác nhận đúng database/major.
3. Chạy `pg_dump --format=custom --compress=9 --no-owner --no-privileges`.
4. Kiểm tra file không rỗng và có magic `PGDMP`.
5. Đọc archive bằng `pg_restore --list`.
6. Tính SHA-256, kích thước và ghi metadata.
7. Ghi atomically file `.dump`, `.sha256`, `.metadata` với mode `600`.
8. In đường dẫn backup cuối cùng ra stdout; log ra stderr.

Tên file:

```text
<database>_<YYYYMMDDTHHMMSSZ>.dump
```

Không ghi đè backup đã tồn tại. Dump không chứa roles/globals; nếu cần khôi
phục role/password phải có quy trình `pg_dumpall --globals-only` riêng, chưa
được tự động hóa trong S6-M1-02.

## 6. Metadata và checksum

Mỗi backup có hai sidecar:

```text
smart_heritage_20261120T100000Z.dump
smart_heritage_20261120T100000Z.dump.metadata
smart_heritage_20261120T100000Z.dump.sha256
```

Metadata dạng key-value:

```text
format=custom
database=smart_heritage
server_version=16.9
server_version_num=160009
pg_dump_version=16.9
created_at_utc=2026-11-20T10:00:00Z
size_bytes=18337
sha256=<64 hex characters>
```

Checksum sidecar dùng định dạng `sha256sum`:

```text
<64 hex characters>  smart_heritage_20261120T100000Z.dump
```

Restore kiểm tra metadata, kích thước thực, SHA-256 trong metadata, SHA-256
trong sidecar và tên file trong sidecar. Bất kỳ mismatch nào đều dừng trước khi
kết nối tới target.

## 7. Restore safety

`scripts/database/restore.sh` chỉ restore vào database **đã tồn tại và trống**.

```bash
export PROTECTED_DATABASES=smart_heritage
scripts/database/restore.sh \
  /var/backups/smart-heritage/smart_heritage_20261120T100000Z.dump \
  smart_heritage_restore_verify
```

Mặc định script yêu cầu gõ đúng tên database đích. Automation có thể thêm
`--yes` sau khi đã xác nhận target.

Các guard bắt buộc:

- Từ chối nếu target trùng database nguồn trong metadata.
- Từ chối `postgres`, `template0`, `template1`.
- Từ chối target nằm trong `PROTECTED_DATABASES` (mặc định gồm các tên
  production).
- Từ chối nếu target có bất kỳ user relation nào.
- Từ chối checksum/size mismatch, archive hỏng hoặc `pg_restore --list` fail.
- Từ chối PostgreSQL major khác 16 hoặc `pg_restore` cũ hơn source.
- Không tạo/drop database, không `--clean`, không sửa `flyway_schema_history`.

Restore dùng:

```text
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges
```

`--single-transaction` bảo đảm archive hỏng hoặc lỗi giữa chừng không để lại
object dở dang trong target.

Sau restore, script kiểm tra tối thiểu 8 bảng ứng dụng/Flyway, Flyway history
thành công, không có migration fail, version tối đa >= 4, không có invalid
index, tối thiểu 6 foreign key và 7 sequence.

## 8. Quy trình restore

1. Dừng mọi ghi vào database nguồn nếu đang lấy backup consistency.
2. Tạo backup mới và xác nhận có đủ `.dump`, `.sha256`, `.metadata`.
3. Tạo database đích rỗng bằng quy trình được kiểm soát:

   ```bash
   createdb --maintenance-db=postgres smart_heritage_restore_verify
   ```

4. Chạy `scripts/database/restore.sh` với target vừa tạo.
5. So sánh dữ liệu/schema/Flyway với nguồn (script test làm tự động).
6. Chạy Flyway `info` và `validate`.
7. Khởi động backend với `ddl-auto=validate`, kiểm tra health và dữ liệu.
8. Chỉ sau khi tất cả kiểm tra pass mới cân nhắc chuyển môi trường sử dụng sang
   database mới; việc chuyển này không được tự động trong M1.

Không restore đè database đang phục vụ. Nếu cần khôi phục production, tạo
database mới, restore vào đó, verify, rồi mới có kế hoạch chuyển đổi có cửa sổ
bảo trì và phê duyệt.

## 9. Disposable round-trip test

Chuẩn bị database PostgreSQL 16 disposable và client 16, sau đó:

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=backup_ci
export PGPASSWORD=backup_ci
export TEST_DB_PREFIX=s6_local_
export FLYWAY_MODE=auto
export BACKEND_JAR=backend/target/backend-0.0.1-SNAPSHOT.jar

REQUIRE_APP_CHECK=1 bash scripts/database/test-backup-restore.sh
```

Script:

- Tạo ba database với prefix do script kiểm soát:
  `..._src`, `..._tgt`, `..._nonempty`.
- Chạy Flyway `migrate` trên source.
- Seed role/user/site/artifact/multimedia/beacon/interaction, gồm cả nullable
  relationship.
- Tạo backup, checksum và metadata.
- Chạy các kịch bản từ chối.
- Restore vào target trống.
- So sánh snapshot source/target.
- Chạy Flyway `info`/`validate`, sequence rollback test và application check.
- Chỉ drop các database do chính script tạo và có đúng prefix.

Script từ chối drop database không nằm trong danh sách đã tạo. Không dùng
`TEST_DB_PREFIX` trỏ tới tên database thật.

## 10. Dữ liệu và schema được kiểm chứng

Fixture deterministic tạo:

- 2 role: `VISITOR`, `ADMIN`.
- 2 user với password hash giả, không phải credential thật.
- 1 heritage site, 1 artifact, 1 multimedia.
- 1 beacon với UUID/major/minor cố định.
- 2 interaction: một interaction có user/beacon, một interaction anonymous với
  `user_id` và `beacon_id` NULL.

Snapshot so sánh:

- Toàn bộ row của 7 bảng nghiệp vụ dưới dạng JSONB đã chuẩn hóa.
- Column, kiểu dữ liệu, nullability và default.
- Index definition.
- Constraint definition, gồm primary key, unique, check và foreign key.
- Sequence `last_value` và `is_called`.
- Flyway history: version, script, checksum, success (không so timestamp chạy).

Sequence integrity được kiểm tra thêm bằng một transaction rollback: insert mới
phải nhận ID lớn hơn `max(id)` hiện có, sau đó rollback để không thay đổi
database.

## 11. Flyway sau restore

Sau restore:

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://host:5432/smart_heritage_restore_verify'
export SPRING_DATASOURCE_USERNAME='user'
export SPRING_DATASOURCE_PASSWORD='password'
export FLYWAY_NETWORK=host

scripts/database/flyway.sh info
scripts/database/flyway.sh validate
```

Kỳ vọng:

- History có V1–V4, `success=true`.
- Không có migration pending/failed.
- Checksum history khớp file migration hiện tại.
- Không sửa hoặc xóa `flyway_schema_history`.
- Không baseline lại database đã restore.
- Fresh database vẫn migrate bình thường V1 → V4.

## 12. Application compatibility

Backend phải khởi động được trên database đã restore với:

```text
SPRING_FLYWAY_ENABLED=true
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_PROFILES_ACTIVE=prod
```

Kiểm tra:

- `/api/health` trả `status=UP`.
- `/api/heritage-sites` trả heritage site từ fixture.
- `/api/beacons/resolve` với UUID/major/minor của fixture trả artifact đúng.
- Không có Flyway migration mới hoặc lỗi Hibernate validate.
- Backend shutdown graceful; không ghi dữ liệu vào database đã restore trong
  lúc kiểm tra.

CI đặt `REQUIRE_APP_CHECK=1` và truyền `BACKEND_JAR` đã build, nên không được
bỏ qua bước này.

## 13. CI

Job `database-backup-restore`:

- Dùng service `postgres:16-alpine` disposable.
- Cài `postgresql-client-16`.
- Build backend jar với JDK 17.
- Chạy `scripts/database/test-backup-restore.sh` với app check bắt buộc.
- Drop toàn bộ database test trong cleanup.
- Không dùng secret production; chỉ dùng credential CI tạm thời.
- Không hạ ngưỡng hoặc bỏ qua các job hiện có.

Job này bổ sung cho `postgres-integration`; không thay thế các test migration
hiện có.

## 14. Kịch bản và recovery runbook

Các kịch bản được kiểm chứng:

| Kịch bản | Kỳ vọng |
|---|---|
| Backup/restore bình thường | Dữ liệu/schema/Flyway khớp source, app health UP |
| Archive bị cắt/hỏng | Restore fail, target vẫn trống |
| Checksum mismatch | Fail trước khi restore, target không đổi |
| PostgreSQL version không tương thích | Bị từ chối, target không đổi |
| Target trùng source | Bị từ chối, source không đổi |
| Tên production mặc định (`smart_heritage`) | Bị từ chối trước khi kết nối target |
| Target không trống | Bị từ chối, marker data còn nguyên |
| Sequence sau restore | Insert mới không trùng ID; rollback sạch |

Runbook khi cần phục hồi:

1. Xác định backup hợp lệ gần nhất và kiểm tra metadata/checksum.
2. Dừng ghi nếu có thể; tạo backup hiện trạng trước thao tác.
3. Tạo database đích rỗng, restore vào đó.
4. Chạy Flyway `info`/`validate`; so sánh dữ liệu quan trọng.
5. Khởi động backend trên database mới, kiểm tra health và API.
6. Chỉ chuyển môi trường sau khi được duyệt; giữ database cũ để rollback.
7. Ghi lại backup file, thời điểm, version và người thực hiện.

Không dùng restore để che giấu migration sai. Với lỗi schema, ưu tiên forward
fix hoặc restore vào database mới có kiểm chứng.

## 15. Bằng chứng kiểm chứng và giới hạn

Kết quả local ngày 2026-11-20:

- PostgreSQL 16.15 disposable, chạy bằng binary local vì Docker daemon không
  khả dụng.
- Flyway `V1`–`V4` migrate source, `info`/`validate` trên target: PASS.
- Backup custom khoảng 24,7 KB, checksum/metadata hợp lệ: PASS.
- Corrupt archive, checksum mismatch, incompatible version, source=target,
  protected production name và non-empty target đều bị từ chối;
  target/source không bị thay đổi: PASS.
- Restore vào target trống, so sánh data/schema/Flyway/sequence: PASS.
- Backend start với `ddl-auto=validate`, `/api/health` UP, heritage site và
  beacon resolve đúng: PASS.
- CI `database-backup-restore` dùng Docker/Flyway wrapper; kết quả CI được ghi
  tại PR/run tương ứng.

Giới hạn:

- Chưa có production database thật để diễn tập.
- Chưa có PITR; chỉ restore từ dump.
- Không backup role/password/global object.
- Không tự động mã hóa/offsite/retention.
- Restore không tự chuyển backend sang database mới.
- Docker path của Flyway wrapper chỉ được xác nhận đầy đủ trong CI; local đã
  dùng Maven fallback.
