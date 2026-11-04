# Production deployment

Tài liệu này mô tả deployment package **portable** cho Smart Heritage. Tại thời
điểm M1 chưa có domain, cloud provider, VPS hoặc production credentials, nên
**chưa có production deployment thật**. Các bước dưới đây đã được kiểm chứng
local bằng Docker Compose; TLS và dữ liệu production là **PENDING**.

## 1. Kiến trúc

```text
Internet
   |
   v
External reverse proxy / TLS (Nginx, Caddy hoặc Traefik)
   |
   v
Frontend container (Nginx :80)  ── /api/ ──>  Backend container (Spring Boot :8080)
   |                                                    |
   | static SPA                                         v
   |                                              PostgreSQL 16 (:5432, internal)
   v
Trình duyệt Admin Web

Mobile (Expo native) ── HTTPS ──> Public API URL (/api)
```

- Chỉ **frontend** bind ra host (mặc định `127.0.0.1`), để reverse proxy TLS bên
  ngoài hoặc cùng host truy cập.
- **Backend** và **PostgreSQL** không publish port; chỉ nói chuyện qua network
  nội bộ của Compose.
- Mobile không chạy trong Docker; build native trỏ tới public API HTTPS.

## 2. Development và production

| Hạng mục | Development | Production |
|----------|-------------|------------|
| Compose file | `docker-compose.yml` | `docker-compose.production.yml` |
| Compose project | theo tên thư mục (ví dụ `java-subject`) | `smart-heritage-production` (`name:`) |
| Env file | `.env` không bắt buộc | `.env.production` bắt buộc |
| PostgreSQL | Publish `5432` để dev | Không publish, chỉ internal |
| Backend | Publish `8080` để dev | Không publish, Nginx proxy `/api` |
| Admin Web | Vite dev server `5173` | Static build + Nginx |
| Secrets | Dev fallback | Bắt buộc, không có default yếu |
| TLS | Không | Reverse proxy bên ngoài (PENDING) |

Không sửa `docker-compose.yml` của Task 1 khi triển khai production.

## 3. Thành phần

| Thành phần | File | Ghi chú |
|------------|------|---------|
| PostgreSQL 16 | `docker-compose.production.yml` | Named volume `postgres_data`, healthcheck `pg_isready` |
| Backend | `backend/Dockerfile` | Multi-stage Maven build, JRE 17 runtime, non-root UID 10001, healthcheck |
| Admin Web | `frontend/Dockerfile`, `frontend/nginx/default.conf` | Node build + Nginx static/SPA + proxy `/api` |
| Env mẫu | `.env.production.example` | Chỉ placeholder |
| Backup/restore | `scripts/deployment/*.sh` | Xem [backup-restore.md](backup-restore.md) |
| Release/rollback | [release-management.md](release-management.md) | Semver, checklist, rollback |

## 4. Chuẩn bị môi trường

Yêu cầu:

- Docker Engine đang chạy.
- Docker Compose plugin V2 trở lên (`docker compose version`). Legacy
  `docker-compose` chỉ dùng như workaround local.
- Domain/DNS và chứng chỉ TLS do team vận hành cung cấp.
- Một host Linux (khuyến nghị) hoặc máy có Docker; không cần Java/Node trên host.

Tạo env production:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Sinh secret mạnh (không dùng giá trị dev):

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
```

Điền tối thiểu các biến sau (không commit file):

| Biến | Bắt buộc | Ý nghĩa |
|------|----------|---------|
| `APP_VERSION` | có (khuyến nghị) | Version label cho image và release |
| `POSTGRES_DB` | có | Tên database |
| `POSTGRES_USER` | có | User ứng dụng |
| `POSTGRES_PASSWORD` | có | Password mạnh, khác local |
| `JWT_SECRET` | có | Chuỗi ngẫu nhiên >= 256 bits |
| `JWT_EXPIRATION_MS` | không | Mặc định `86400000` |
| `CORS_ALLOWED_ORIGINS` | có | Origin HTTPS của Admin Web |
| `APP_BIND_ADDRESS` | không | Mặc định `127.0.0.1` |
| `APP_HTTP_PORT` | không | Mặc định `8080` |
| `VITE_API_BASE_URL` | không | Build-time public API origin; để trống nếu same-origin |

Compose production dùng cú pháp `${VAR:?message}` cho các secret bắt buộc. Nếu
thiếu, `docker compose config` sẽ fail rõ ràng thay vì dùng credential mặc định.

`VITE_API_BASE_URL` là **public**, không phải secret:

- Để trống (khuyến nghị): frontend gọi `/api/...` same-origin, Nginx trong
  container proxy tới backend.
- Chỉ đặt khi API ở origin khác, ví dụ `https://api.your-domain.example`
  (không kèm `/api`).

Giá trị này được nhúng vào bundle lúc **build frontend**; đổi sau đó phải build
lại image frontend.

## 5. Build và khởi động

Từ thư mục gốc dự án:

```bash
# 1. Kiểm tra cấu hình và biến bắt buộc
docker compose -f docker-compose.production.yml --env-file .env.production config

# 2. Build image backend + frontend
docker compose -f docker-compose.production.yml --env-file .env.production build

# 3. Khởi động stack
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# 4. Trạng thái và health
docker compose -f docker-compose.production.yml --env-file .env.production ps
docker compose -f docker-compose.production.yml --env-file .env.production logs --tail=100
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/api/health
```

Kỳ vọng: `postgres`, `backend`, `frontend` đều `healthy`; `/api/health` trả
`{"status":"UP",...}`.

Các lệnh `curl` trên dùng cổng mặc định `8080`; nếu đổi `APP_HTTP_PORT`, thay
số cổng tương ứng.

Không dùng `down -v` trong quy trình deploy thông thường — lệnh đó xoá volume
PostgreSQL.

## 6. Reverse proxy và TLS

Frontend container đã:

- Serve static SPA, fallback React Router về `index.html`.
- Proxy `/api/` tới `http://backend:8080` (giữ nguyên path).
- Forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Timeout 10s connect / 60s read-send.
- Trả `/healthz` cho healthcheck.

TLS **không** được terminate trong container frontend. Đặt Nginx/Caddy/Traefik
bên ngoài, trỏ tới `APP_BIND_ADDRESS:APP_HTTP_PORT` (mặc định
`127.0.0.1:8080`). Ví dụ Nginx (chưa kích hoạt, chỉ là mẫu):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.example;

    ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    server_name your-domain.example;
    return 301 https://$host$request_uri;
}
```

Yêu cầu TLS:

- `CORS_ALLOWED_ORIGINS` phải là origin HTTPS thật của Admin Web.
- Mobile phải gọi `https://<domain>/api`.
- Không dùng self-signed certificate cho production.
- **TLS verification: PENDING** cho tới khi có domain/certificate thật.

## 7. Health checks và logging

| Service | Health check |
|---------|--------------|
| PostgreSQL | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` |
| Backend | `curl -fsS http://localhost:8080/api/health` |
| Frontend | `wget -q -O /dev/null http://127.0.0.1/healthz` |

`depends_on` dùng `condition: service_healthy`; health check vẫn là nguồn xác
nhận thật, không thay thế bằng thứ tự start.

Logging:

- Docker `json-file`, rotate `max-size=10m`, `max-file=3` cho cả 3 service.
- Ứng dụng log ra stdout/stderr; không log password, JWT hay Authorization
  header.
- Không triển khai Prometheus/Grafana/ELK trong M1 vì chưa có yêu cầu hạ tầng.

Xem log:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production logs -f --tail=200 backend
```

## 8. Database

- PostgreSQL 16, volume `postgres_data` (project-scoped).
- Không publish `5432`; chỉ backend truy cập qua hostname `postgres` trong
  network nội bộ.
- `ddl-auto: update` (theo cấu hình hiện tại) tự cập nhật schema; không có
  migration tool chính thức. Xem cảnh báo rollback trong
  [release-management.md](release-management.md).
- Backup/restore: xem [backup-restore.md](backup-restore.md).

## 9. Mobile production build

Mobile là Expo/React Native, **không** Docker hóa và **không** dùng chung
Compose.

- `EXPO_PUBLIC_API_BASE_URL` phải là URL HTTPS public, bao gồm `/api`, ví dụ
  `https://your-domain.example/api`.
- Expo chỉ expose biến prefix `EXPO_PUBLIC_`; đây là giá trị public, không đặt
  private credential/token trong đó.
- Giá trị được nhúng lúc build app; đổi URL phải build lại.
- Repo hiện **chưa có** `mobile/eas.json`; chưa cấu hình EAS project/signing.
  Không tự tạo signing credentials.

Khi team cấu hình EAS:

```bash
cd mobile
npx eas-cli login                 # thực hiện bởi người có quyền
npx eas-cli build:configure       # tạo eas.json nếu chưa có
EXPO_PUBLIC_API_BASE_URL=https://your-domain.example/api \
  npx eas-cli build -p android --profile production
EXPO_PUBLIC_API_BASE_URL=https://your-domain.example/api \
  npx eas-cli build -p ios --profile production
```

Các bước prerequisite:

1. Tạo Expo account/project và EAS project ID.
2. Cấu hình `eas.json` với profile production (không commit secret).
3. Cấu hình signing Android keystore/iOS credentials qua EAS hoặc CI secret
   store của team.
4. Build, kiểm tra app cài trên thiết bị thật, xác nhận gọi được HTTPS API.
5. Không đăng nhập/deploy thay người dùng trong môi trường này.

## 10. Kiểm chứng local đã thực hiện

Đã chạy với project Compose cô lập (ban đầu `smart-heritage-task4-test`, sau đó
`smart-heritage-production`), cổng host `8081`, volume/database test riêng
(không dùng dữ liệu dev/production). Production Compose đặt `name:
smart-heritage-production` để không dùng chung volume `postgres_data` với stack
dev trong cùng thư mục:

- Backend image build: PASS (non-root UID 10001).
- Frontend image build + Nginx: PASS.
- `docker compose config`: PASS; thiếu `JWT_SECRET` → fail rõ ràng.
- Stack `up -d --build`: cả 3 service `healthy`.
- `GET /`, `/index.html`, `/assets/*` và security/cache headers: PASS.
- SPA fallback cho route sâu: PASS.
- `GET /api/health` qua Nginx: `status=UP`.
- Public API qua proxy: PASS.
- PostgreSQL persistence sau restart: PASS.
- Backup/restore trên database cô lập: PASS (xem
  [backup-restore.md](backup-restore.md)).
- Chỉ frontend publish cổng, bind `127.0.0.1`; backend/PostgreSQL không publish.

## 11. Chưa thể verify

- Deploy lên server/cloud thật: **PENDING** (không có hạ tầng/credentials).
- Domain, DNS, TLS certificate: **PENDING**.
- Production data migration/backup thật: **PENDING**.
- Mobile store build/signing: **PENDING** (chưa có EAS config).
- UI E2E trên trình duyệt/emulator thật: **PENDING** theo báo cáo Task 2.

## 12. Troubleshooting

| Triệu chứng | Nguyên nhân / cách xử lý |
|-------------|--------------------------|
| `config` báo `POSTGRES_PASSWORD is required` | Chưa tạo `.env.production` hoặc thiếu biến; không dùng default |
| Backend restart liên tục | Xem `logs backend`; kiểm tra `POSTGRES_*` và `JWT_SECRET` |
| Frontend 502 khi gọi `/api` | Backend chưa healthy hoặc sai service name; kiểm tra `ps`/`logs` |
| `/api/api/...` | `VITE_API_BASE_URL` không được kèm `/api`; build lại frontend |
| CORS error | `CORS_ALLOWED_ORIGINS` phải đúng origin HTTPS của Admin Web |
| Không truy cập từ Internet | Frontend bind `127.0.0.1`; cần reverse proxy TLS cùng host |
| `down -v` làm mất dữ liệu | Không dùng trong deploy; volume bị xoá |
