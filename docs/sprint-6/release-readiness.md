# Sprint 6 — Release & Deployment Readiness

Ngày kiểm tra: 2026-11-19  
Phạm vi: **S6-M1-01** — chuẩn bị deployment package, xác minh cấu hình và ghi
nhận giới hạn release. Tài liệu này **không** tuyên bố đã deploy production.

## 1. Kết luận

Smart Heritage có thể được triển khai bằng Docker Compose trên một host Linux
có Docker Engine, với ba thành phần: PostgreSQL 16, backend Spring Boot và
frontend React + Nginx. Cấu hình production tách biệt Compose dev, không publish
backend/PostgreSQL, chỉ frontend bind loopback để reverse proxy TLS bên ngoài
truy cập.

Trạng thái:

- Deployment package: **READY FOR STAGING/DEMO**.
- Production thật: **NOT DEPLOYED** — chưa có domain, TLS, server và
  credentials production.
- CI production smoke: job `production-smoke` build và chạy stack ephemeral,
  kiểm tra Nginx/SPA/proxy/health.
-   Mobile identity/EAS demo config đã sẵn sàng (`com.university.smartheritage`),
  APK native demo build/signing/verify đã **PASS** (local Docker builder), thiết bị
  BLE thật vẫn là **PENDING**.

## 2. Kiến trúc release

```text
Internet
   |
   v
TLS reverse proxy (Nginx/Caddy/Traefik)
   |
   v
frontend container (Nginx :80) ── /api/ ──> backend container (:8080)
   |                                              |
   | static SPA                                   v
   |                                        PostgreSQL 16 (internal)
   v
Admin Web

Mobile native app ── HTTPS /api ──> public API qua reverse proxy
```

- Compose project production: `smart-heritage-production`.
- Network: `smart-heritage-production_internal` (bridge).
- Volume: `smart-heritage-production_postgres_data`.
- Chỉ frontend publish `127.0.0.1:8080` (hoặc `APP_HTTP_PORT`).
- Backend và PostgreSQL không publish cổng ra host.

## 3. Thay đổi trong S6

### 3.1 Spring production profile

Thêm `backend/src/main/resources/application-prod.yml` và đặt
`SPRING_PROFILES_ACTIVE=prod` trong production Compose:

- `spring.jpa.show-sql=false` — không ghi toàn bộ SQL ra log production.
- `spring.jpa.properties.hibernate.format_sql=false`.
- `spring.jpa.open-in-view=false` — không giữ persistence context tới view.
- `server.shutdown=graceful`.
- `spring.lifecycle.timeout-per-shutdown-phase=25s`.

Compose production giữ `stop_grace_period: 30s`, lớn hơn timeout graceful 25s,
để request đang xử lý có thời gian hoàn tất trước `SIGKILL`.

### 3.2 Compose và CI

- Bỏ key `version` obsolete khỏi `docker-compose.yml`.
- Thêm `stop_grace_period: 30s` cho backend dev.
- `docker-build` validate cả Compose dev và production.
- Thêm job `production-smoke`:
  - build backend + frontend production;
  - chạy stack ephemeral trên cổng `18080`;
  - kiểm tra `/healthz`, `/`, `/dashboard`, `/api/health`,
    `/api/heritage-sites`;
  - xác nhận backend/PostgreSQL không publish cổng;
  - luôn teardown bằng `down -v --remove-orphans`.

## 4. Cấu hình môi trường và secrets

Nguồn mẫu: `.env.production.example`. Không commit `.env.production`.

| Biến | Bắt buộc | Ghi chú |
|------|----------|---------|
| `APP_VERSION` | khuyến nghị | Tag image, ví dụ `1.0.0` |
| `POSTGRES_DB` | có | Database production |
| `POSTGRES_USER` | có | User ứng dụng |
| `POSTGRES_PASSWORD` | có | Sinh bằng `openssl rand -base64 32` |
| `JWT_SECRET` | có | >= 256 bits; khác hoàn toàn dev |
| `JWT_EXPIRATION_MS` | không | Mặc định `86400000` |
| `CORS_ALLOWED_ORIGINS` | có | Origin HTTPS của Admin Web |
| `APP_BIND_ADDRESS` | không | Mặc định `127.0.0.1` |
| `APP_HTTP_PORT` | không | Mặc định `8080` |
| `VITE_API_BASE_URL` | không | Để trống cho same-origin `/api` |

Quy tắc:

- Compose production dùng `${VAR:?message}` cho secret bắt buộc; thiếu biến thì
  `docker compose config` fail thay vì dùng default dev.
- `JWT_SECRET` và `POSTGRES_PASSWORD` production phải khác local.
- Không đưa `.env.production`, dump database, token hoặc signing key vào Git
  hoặc image.
- `VITE_API_BASE_URL` là public, được nhúng lúc build; đổi giá trị phải build
  lại frontend.
- Không log password, JWT hoặc header `Authorization`.

## 5. Quy trình deploy staging/demo

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# Điền APP_VERSION, POSTGRES_*, JWT_SECRET, CORS_ALLOWED_ORIGINS

docker compose -f docker-compose.production.yml --env-file .env.production config
docker compose -f docker-compose.production.yml --env-file .env.production build
docker compose -f docker-compose.production.yml --env-file .env.production up -d --wait

docker compose -f docker-compose.production.yml --env-file .env.production ps
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/heritage-sites
```

Kỳ vọng:

- `postgres`, `backend`, `frontend` đều `healthy`.
- `/healthz` trả `ok`.
- `/api/health` trả `status=UP`.
- Admin Web tải được tại `/`, route sâu fallback về SPA.
- Public API trả envelope `success=true`.

Không dùng `down -v` trong deploy thường vì sẽ xoá volume PostgreSQL.

## 6. Health, log và shutdown

| Thành phần | Kiểm tra |
|------------|----------|
| PostgreSQL | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` |
| Backend | `curl -fsS http://localhost:8080/api/health` |
| Frontend | `wget -q -O /dev/null http://127.0.0.1/healthz` |

- Log Docker dùng `json-file`, rotate `10m × 3` cho cả ba service.
- Log ứng dụng ra stdout/stderr.
- `docker compose stop backend` gửi `SIGTERM`; Spring graceful shutdown cho
  request đang chạy hoàn tất trong tối đa 25s.
- `restart: unless-stopped` tự khởi động lại sau reboot/crash.
- Không triển khai Prometheus/Grafana/ELK trong phạm vi này.

## 7. Database, backup và rollback

- Flyway chạy V1–V4 khi backend start; Hibernate chỉ `validate`.
- `baseline-on-migrate=false`; database cũ phải được baseline tường minh theo
  [`schema-baseline.md`](../database/schema-baseline.md).
- Backup trước mọi thay đổi schema:
  [`backup-restore.md`](../deployment/backup-restore.md).
- Rollback application dùng `APP_VERSION` cũ và image còn trên host.
- Migration là forward-only; không `flyway:clean`, không sửa/xoá
  `flyway_schema_history`.
- Nếu schema mới không tương thích code cũ, cần cửa sổ bảo trì và restore
  backup; thao tác này destructive.

Chi tiết:
[`release-management.md`](../deployment/release-management.md).

## 8. Bằng chứng kiểm chứng

### 8.1 Local (2026-11-19)

| Kiểm tra | Kết quả |
|----------|---------|
| `docker compose config --quiet` (dev) | PASS |
| Production Compose config với `.env.production.example` | PASS |
| YAML workflow CI parse | PASS, 8 job |
| Backend `./mvnw -B test` | PASS — 154 test |
| Frontend lint | PASS |
| Frontend Vitest | PASS — 104 test |
| Frontend typecheck + Vite build | PASS |
| Mobile Jest | PASS — 108 test |
| `git diff --check` | PASS |

Máy kiểm tra S6 **không có Docker daemon** (`/var/run/docker.sock` không truy
cập được), nên không thể build/start container local. Việc build image và chạy
production stack được giao cho CI `production-smoke` và các job Docker.

### 8.2 CI

Các job bắt buộc:

- `backend-test`
- `postgres-integration`
- `frontend-checks`
- `mobile-tests`
- `docker-build` (dev + production config, dev images)
- `integration-smoke` (dev, public-only)
- `production-smoke` (production images + Nginx + proxy + health)

`mobile-static-analysis` vẫn là advisory do technical debt TypeScript/ESLint có
sẵn. Kết quả CI cuối cùng được ghi tại PR Sprint 6 và run tương ứng.

## 9. Giới hạn và known issues

Không phải blocker cho staging/demo, nhưng cần biết trước production thật:

- Chưa có domain, DNS, TLS certificate và hạ tầng đích.
- Chưa deploy production, chưa push image lên registry.
- Chưa kiểm thử backup/restore trên production data thật; chỉ có quy trình và
  kiểm chứng trước đó trên PostgreSQL disposable.
- Chưa có rate limit/lockout cho login.
- CSP và HSTS chưa đặt trong container; TLS reverse proxy bên ngoài chịu trách
  nhiệm HSTS. Nginx master process vẫn chạy root mặc định của image.
- Chưa có EAS project/signing cho mobile store build; đã chạy APK demo local qua
  Docker builder và verify package/permissions/checksum, chưa ký store.
- Chưa xác minh BLE beacon, media playback và iOS trên thiết bị thật.
- UI E2E trình duyệt/emulator thật vẫn PENDING.
- Không có monitoring/alerting tập trung trong phạm vi M1.

## 10. Checklist trước khi công bố release

- [ ] Required CI checks PASS, gồm `production-smoke`.
- [ ] `.env.production` đủ biến, không dùng placeholder/dev secret.
- [ ] `APP_VERSION` và release notes đã chuẩn bị.
- [ ] Backup database đã tạo và kiểm tra.
- [ ] Flyway migration đã review; thử trên bản sao dữ liệu cũ nếu có.
- [ ] Reverse proxy TLS trỏ đúng `127.0.0.1:APP_HTTP_PORT`.
- [ ] `CORS_ALLOWED_ORIGINS` đúng origin HTTPS.
- [ ] Health check, SPA route sâu và public API qua proxy PASS.
- [ ] Không có secret trong Git/image/log.
- [ ] Known issues được ghi trong release notes.

## 11. Tài liệu liên quan

- [Production deployment](../deployment/production-deployment.md)
- [Release management](../deployment/release-management.md)
- [Backup/restore](../deployment/backup-restore.md)
- [CI/CD](../development/ci-cd.md)
- [Schema baseline](../database/schema-baseline.md)
- [M3 iBeacon mobile integration](../features/ibeacon-mobile-integration.md)
- [Mobile Android demo build](../deployment/mobile-android-release.md)
- [LTJ-70 physical beacon acceptance](../logs/LTJ-70.md)
- [LTJ-71 real-device multimedia acceptance](../logs/LTJ-71.md)
- [LTJ-72 Android release preparation](../logs/LTJ-72.md)
