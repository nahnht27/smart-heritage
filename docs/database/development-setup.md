# Database development setup

Hướng dẫn này dành cho lập trình viên chạy PostgreSQL + Flyway ở local và thêm
migration mới an toàn.

## 1. Chạy local bằng Docker

Từ thư mục gốc:

```bash
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:8080/api/health
```

- PostgreSQL 16 chạy trong container, database `smart_heritage`.
- Backend chạy Flyway V1–V4 khi database trống, sau đó Hibernate validate.
- Dữ liệu nằm trong volume `postgres_data`.
- Không dùng `docker compose down -v` nếu cần giữ dữ liệu local.

Xem migration đã áp dụng:

```bash
docker compose exec postgres psql -U postgres -d smart_heritage \
  -c 'select version, description, type, success from flyway_schema_history order by installed_rank'
```

## 2. Database đang có dữ liệu local

Nếu database được tạo bởi Hibernate trước khi có Flyway:

1. Backup hoặc chấp nhận đây là dữ liệu dev có thể thay thế.
2. Chạy detection:
   ```bash
   docker compose exec -T postgres psql -U postgres -d smart_heritage \
     < scripts/database/detect-schema-version.sql
   ```
3. Baseline đúng version theo [schema-baseline.md](schema-baseline.md).
4. Chạy migrate và start backend.

Không baseline database đã có `flyway_schema_history`.

## 3. Chạy test

### Unit test (H2)

```bash
cd backend
./mvnw -B test
```

H2 dùng `ddl-auto=create-drop`, Flyway tắt. Test này **không** chứng minh
migration PostgreSQL.

### PostgreSQL integration

Cần PostgreSQL 16 và quyền tạo database cho test (profile tạo `ltj54_*` database
tạm):

```bash
cd backend
POSTGRES_TEST_URL='jdbc:postgresql://localhost:5432/smart_heritage_ci' \
POSTGRES_TEST_USERNAME='postgres' \
POSTGRES_TEST_PASSWORD='postgres' \
  ./mvnw -B -Ppostgres-integration verify
```

Suite chạy `VisitorInteractionPostgresIT`, `DatabaseMigrationIT`, `SchemaDetectorIT` và `ArtifactQueryOptimizationIT`; không chạy
trên database dev/production. Nếu host không có Java, dùng Docker Maven:

```bash
docker run --rm --network host \
  -v "$PWD/backend":/workspace -v "$HOME/.m2":/root/.m2 \
  -w /workspace \
  -e POSTGRES_TEST_URL='jdbc:postgresql://localhost:5432/smart_heritage_ci' \
  -e POSTGRES_TEST_USERNAME=postgres \
  -e POSTGRES_TEST_PASSWORD=postgres \
  maven:3.9-eclipse-temurin-17 \
  sh -c 'apt-get update -qq && apt-get install -y -qq unzip >/dev/null && ./mvnw -B -Ppostgres-integration verify'
```

## 4. Thêm migration mới

1. Tạo file trong `backend/src/main/resources/db/migration/`:
   `V5__mo_ta_ngan.sql`, `V6__...`.
2. Không sửa V1–V4 đã merge.
3. Viết SQL idempotent khi phù hợp (`IF NOT EXISTS`, `DO` block) cho constraint/
   index; không dùng `DROP` dữ liệu nếu không có kế hoạch.
4. Chạy fresh PostgreSQL và database cũ (baseline + migrate) trước khi mở PR.
5. Thêm test vào `DatabaseMigrationIT`/`SchemaDetectorIT` nếu thay đổi schema hoặc detector.
6. Cập nhật ERD/tài liệu database nếu cần.

Quy ước:

- Version tăng dần, không nhảy số.
- Một migration nên có một mục đích rõ ràng.
- Không đặt secret/credential trong SQL.
- Không dựa vào `ddl-auto=update` để tạo schema.

## 5. Flyway CLI và Maven plugin

Cách khuyến nghị, không cần Java/Maven trên host:

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/smart_heritage'
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=postgres
export FLYWAY_NETWORK=host

scripts/database/flyway.sh info
scripts/database/flyway.sh migrate
```

Script dùng `flyway/flyway:10.22.0` và mount migration read-only. Không chạy
`clean` (đã disable). Với production không publish PostgreSQL, đặt
`FLYWAY_NETWORK=smart-heritage-production_internal` và URL host `postgres`.

Nếu có Java, Maven plugin trong `backend/pom.xml` cho lệnh tương đương:

```bash
cd backend
./mvnw -B flyway:info
./mvnw -B flyway:migrate
```

## 6. Lỗi thường gặp

| Lỗi | Nguyên nhân / xử lý |
|---|---|
| `Found non-empty schema(s) ... without schema history table` | DB cũ chưa baseline; chạy detection + baseline tường minh, không bật auto-baseline |
| `Detected resolved migration not applied to database` | History thiếu migration; chạy `flyway:info`, không sửa checksum |
| `Validate failed: checksum mismatch` | File migration đã bị sửa sau khi áp dụng; khôi phục file gốc, không drop history |
| Hibernate `validate` báo thiếu bảng/cột | Chưa migrate hoặc baseline sai; dừng app, kiểm tra detection/history |
| `flyway:baseline` báo history đã có migration | Không baseline nữa; dùng `flyway:info` và migration mới |
