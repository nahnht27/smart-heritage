# Release management

Quy trình release/rollback cho Smart Heritage ở mức portable. Chưa tạo Git tag
hay release production trong M1 vì chưa có quyết định release chính thức.

## 1. Versioning

Dùng Semantic Versioning `MAJOR.MINOR.PATCH`:

| Thay đổi | Ví dụ |
|----------|-------|
| Stable release đầu tiên | `1.0.0` |
| Feature tương thích ngược | `1.1.0` |
| Bug fix tương thích ngược | `1.1.1` |
| Breaking change | `2.0.0` |

- `APP_VERSION` trong `.env.production` là version của lần deploy hiện tại.
- Image được tag `smart-heritage-backend:<version>` và
  `smart-heritage-frontend:<version>`.
- Không tự tạo tag/release trên GitHub nếu chưa có quyết định của M1.

## 2. Trước khi release

Checklist bắt buộc:

- [ ] Tất cả PR của phạm vi release đã merge vào `main`.
- [ ] CI required checks PASS: `backend-test`, `frontend-checks`,
      `mobile-tests`, `docker-build`, `integration-smoke`.
- [ ] Backend tests PASS (`./mvnw -B test`).
- [ ] Frontend lint + production build PASS.
- [ ] Mobile Jest PASS (`npm ci --legacy-peer-deps && npm test -- --ci`).
- [ ] PostgreSQL smoke/integration PASS (public-only CI + authenticated smoke
      thủ công nếu có fixture an toàn).
- [ ] UI E2E đã review (Admin Web + Mobile) hoặc ghi rõ PENDING.
- [ ] `.env.production` đã kiểm tra đủ biến, không dùng giá trị dev/placeholder.
- [ ] `JWT_SECRET`, `POSTGRES_PASSWORD`, `CORS_ALLOWED_ORIGINS` đúng môi trường.
- [ ] Backup database mới nhất đã tạo và kiểm tra file.
- [ ] Không có secret trong repo/image/log.
- [ ] Health checks đã chạy trên môi trường đích.
- [ ] Release notes đã chuẩn bị (mục 6).

`mobile-static-analysis` là **advisory**, không phải điều kiện release cho tới
khi technical debt TypeScript/ESLint được xử lý.

## 3. Quy trình deploy

Từ thư mục gốc, với `.env.production` đã cập nhật `APP_VERSION`:

```bash
# 1. Kiểm tra env + Compose (fail nếu thiếu secret bắt buộc)
docker compose -f docker-compose.production.yml --env-file .env.production config

# 2. Backup trước khi thay đổi
scripts/deployment/backup-postgres.sh

# 3. Build image version mới
docker compose -f docker-compose.production.yml --env-file .env.production build

# 4. Khởi động/cập nhật
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# 5. Kiểm tra trạng thái
docker compose -f docker-compose.production.yml --env-file .env.production ps

# 6. Kiểm tra health qua reverse proxy nội bộ
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/api/health

# 7. Xem log
docker compose -f docker-compose.production.yml --env-file .env.production logs --tail=200
```

Không dùng `down -v` trong deploy thường; không xoá volume PostgreSQL. Các lệnh
`curl` dùng cổng mặc định `8080`; thay số nếu `APP_HTTP_PORT` khác.

Ghi lại:

- Version/commit đã deploy.
- Thời điểm deploy và người thực hiện.
- Kết quả health check.
- Backup file tương ứng.

## 4. Rollback

### 4.1 Chuẩn bị trước rollback

1. Xác định version đang chạy và version trước đó (`APP_VERSION`,
   `docker image ls`).
2. Tạo backup mới **trước khi** rollback nếu database đã có dữ liệu mới.
3. Xác định thay đổi database: dự án dùng Hibernate `ddl-auto: update`, không có
   migration versioned. Rollback code không tự rollback schema.

### 4.2 Rollback application

Nếu image version trước còn trên host:

```bash
# Sửa APP_VERSION trong .env.production về version trước, rồi:
docker compose -f docker-compose.production.yml --env-file .env.production config
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# Kiểm tra
docker compose -f docker-compose.production.yml --env-file .env.production ps
curl -fsS http://127.0.0.1:8080/api/health
```

Nếu image không còn, checkout đúng tag/commit cũ và build lại với version đó.
Không force-push hay sửa lịch sử Git.

### 4.3 Khi nào cần restore database

Chỉ restore database khi:

- Version cũ **không tương thích** với schema mới, hoặc
- Dữ liệu mới gây lỗi không thể sửa bằng hotfix.

Quy trình:

1. Dừng backend để tránh ghi dữ liệu trong lúc restore.
2. Backup database hiện tại.
3. Restore backup trước release vào đúng database (xem
   [backup-restore.md](backup-restore.md)); thao tác này destructive.
4. Khởi động lại backend version cũ.
5. Verify health + dữ liệu nghiệp vụ.

**Không tuyên bố rollback an toàn nếu schema thay đổi không tương thích.** Với
thay đổi phá vỡ schema, cần cửa sổ bảo trì và kế hoạch dữ liệu rõ ràng.

### 4.4 Verify sau rollback

- [ ] `backend`, `frontend`, `postgres` healthy.
- [ ] `/api/health` trả UP.
- [ ] Admin Web tải được và gọi API thành công.
- [ ] Mobile (nếu có build tương ứng) gọi được API.
- [ ] Log không có lỗi lặp lại.
- [ ] Dữ liệu quan trọng đã được kiểm tra.

## 5. Không làm trong quy trình

- Không `docker compose down -v` để "reset" production.
- Không restore nhầm database khi chưa xác nhận tên DB.
- Không dùng chung `JWT_SECRET`/DB password giữa local và production.
- Không đưa `.env.production`, dump hoặc signing key vào Git/image.
- Không deploy khi required CI checks đang fail.

## 6. Release notes template

```markdown
## Smart Heritage <version> — <YYYY-MM-DD>

### Commits / PRs
- #<pr> <title>
- <commit-sha> <summary>

### Features
- ...

### Bug fixes
- ...

### Database changes
- Schema/data changes:
- Migration/rollback notes:

### Configuration changes
- New/removed env vars:
- CORS/TLS/domain changes:

### Known issues
- ...

### Rollback notes
- Previous version:
- Image rollback sufficient? (yes/no)
- Database restore required? (yes/no, reason):
- Backup file:
```

## 7. Trạng thái M1

- Chưa tạo release tag.
- Chưa deploy production.
- Quy trình đã sẵn sàng để team chạy khi có hạ tầng/domain/TLS/credentials.
