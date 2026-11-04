# Smart Heritage

University project — Smart Heritage platform.

## Project Structure

```
├── backend/     → Spring Boot API (Java 17, Maven)
├── frontend/    → React (npm, chạy local)
├── mobile/      → React Native (npm, chạy local)
├── docs/        → Project documentation
│   ├── requirements/
│   └── design/
└── docker-compose.yml
```

## Documentation (M1 Sprint 1)

### Requirements
- [01 — Project Scope](docs/requirements/01_project_scope.md)
- [02 — Functional Requirements](docs/requirements/02_functional_requirements.md)
- [03 — Non-Functional Requirements](docs/requirements/03_non_functional_requirements.md)

### Design
- [04 — System Architecture](docs/design/04_system_architecture.md)
- [05 — Use Case Diagram](docs/design/05_use_case_diagram.md)
- [05 — Use Case Diagram (PlantUML)](docs/design/05_use_case_diagram.puml)

## Prerequisites

- **Docker** + Docker Compose (backend + PostgreSQL). Docker Desktop đã gồm cả hai.
- **Node.js 20+** và npm (Admin Web + Mobile). Khuyến nghị Node 22 LTS.
- Không cần cài Java/Maven hay PostgreSQL trên máy nếu chạy bằng Docker.
- Điện thoại/emulator cho Mobile (Expo Go hoặc development build).

> Compose V2 plugin dùng `docker compose`; một số máy cũ dùng `docker-compose`
> (có dấu `-`). Hai lệnh tương đương trong tài liệu này.

## Environment Variables

Không commit file `.env` chứa credentials thật. Chỉ dùng các file `.env.example`
làm mẫu.

| Component | Biến | Mặc định | Ghi chú |
|-----------|------|----------|---------|
| Backend | `SERVER_PORT` | `8080` | Cổng HTTP |
| Backend | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/smart_heritage` | Docker Compose dùng `postgres` thay cho `localhost` |
| Backend | `SPRING_DATASOURCE_USERNAME` | `postgres` | |
| Backend | `SPRING_DATASOURCE_PASSWORD` | `postgres` | |
| Backend | `JWT_SECRET` | Dev fallback | **Bắt buộc override ngoài local dev** |
| Backend | `JWT_EXPIRATION_MS` | `86400000` | 24 giờ |
| Backend | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8081` | Phân cách bằng dấu phẩy |
| PostgreSQL | `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `smart_heritage` / `postgres` / `postgres` | Dùng trong `docker-compose.yml` |
| Admin Web | `VITE_API_BASE_URL` | `http://localhost:8080` | Là **origin**, không kèm `/api` |
| Mobile | `EXPO_PUBLIC_API_BASE_URL` | Theo platform | Bao gồm `/api`; xem `mobile/.env.example` |

Mẫu cấu hình: [`backend/.env.example`](backend/.env.example),
[`frontend/.env.example`](frontend/.env.example),
[`mobile/.env.example`](mobile/.env.example).

## Quick Start (Docker)

Chỉ cần Docker đang chạy, rồi:

```bash
# Build & chạy cả PostgreSQL + Backend
docker-compose up --build

# Chạy nền (detached)
docker-compose up --build -d

# Hoặc với Compose V2
docker compose up --build -d
```

Sau khi chạy xong:

| Service    | URL                                  |
|------------|--------------------------------------|
| Backend    | http://localhost:8080                 |
| Health     | http://localhost:8080/api/health      |
| PostgreSQL | localhost:5432 (db: `smart_heritage`) |

Compose có health check: PostgreSQL phải `healthy` trước khi backend khởi động;
backend được đánh dấu `healthy` khi `/api/health` trả 200.

```bash
docker-compose ps
curl http://localhost:8080/api/health
# → {"status":"UP","timestamp":"..."}

# Public content APIs (không cần JWT)
curl http://localhost:8080/api/heritage-sites
curl http://localhost:8080/api/artifacts
curl http://localhost:8080/api/multimedia
```

### Dừng

```bash
# Dừng containers (giữ nguyên database volume)
docker-compose down

# CHỈ khi muốn xóa toàn bộ dữ liệu PostgreSQL:
# docker-compose down -v
```

## Docker Services

| Service    | Image / Build         | Port |
|------------|----------------------|------|
| `postgres` | postgres:16-alpine   | 5432 |
| `backend`  | ./backend (Dockerfile) | 8080 |

## Chạy Frontend / Mobile (local, không Docker)

```bash
# Admin Web — http://localhost:5173
cd frontend
cp .env.example .env   # tuỳ chỉnh VITE_API_BASE_URL nếu cần
npm ci
npm run dev

# Mobile — Expo
cd mobile
cp .env.example .env   # bỏ comment đúng dòng cho Android/iOS/thiết bị thật
npm ci
npm start             # nhấn a = Android, i = iOS, w = Web
```

Backend phải đang chạy tại `http://localhost:8080` (hoặc URL bạn cấu hình).

### Kết nối Mobile tới Backend

| Môi trường | `EXPO_PUBLIC_API_BASE_URL` |
|------------|----------------------------|
| Android Emulator | `http://10.0.2.2:8080/api` |
| iOS Simulator / Expo Web | `http://localhost:8080/api` |
| Thiết bị thật (cùng LAN) | `http://<IP_MAY_TINH>:8080/api` |

- `10.0.2.2` là địa chỉ đặc biệt của Android Emulator để tới máy host.
- Không dùng `localhost` trên thiết bị thật — nó trỏ về chính điện thoại.
- Native app không bị CORS; chỉ **Expo Web**/Admin Web (browser) phụ thuộc CORS.

## Database

- **DB name**: `smart_heritage`
- **Username**: `postgres`
- **Password**: `postgres`
- **Port**: `5432`

Docker tự tạo database khi chạy lần đầu. Data được lưu trong Docker volume
`postgres_data`. Không dùng `docker-compose down -v` nếu muốn giữ dữ liệu.

## Troubleshooting

| Triệu chứng | Nguyên nhân / Cách khắc phục |
|-------------|------------------------------|
| Backend container restart liên tục | Xem `docker-compose logs backend`; thường do PostgreSQL chưa sẵn sàng hoặc sai `SPRING_DATASOURCE_URL`. Trong Compose phải dùng host `postgres`, không phải `localhost`. |
| `curl :8080/api/health` connection refused | Kiểm tra `docker-compose ps`; chờ backend `healthy` (health check có `start_period`). |
| Browser báo "Blocked by CORS policy" | Thêm origin của web vào `CORS_ALLOWED_ORIGINS` rồi restart backend. Mặc định chỉ cho `localhost:5173` và `localhost:8081`. |
| Admin Web gọi `/api/api/...` | `VITE_API_BASE_URL` phải là origin (`http://localhost:8080`), không kèm `/api`. Code tự bỏ `/api` cuối, nhưng nên cấu hình đúng. |
| Mobile Android không kết nối được | Dùng `10.0.2.2`, không dùng `localhost`. Với máy thật, dùng IP LAN và đảm bảo firewall cho phép cổng 8080. |
| `401 Unauthorized` | Thiếu/hết hạn JWT. Đăng nhập lại; header đúng dạng `Authorization: Bearer <token>`. |
| `403 Forbidden` khi ghi nội dung/analytics | Tài khoản không có role `ADMIN`. |
| Port 5432/8080 bị chiếm | Dừng service đang dùng hoặc đổi `POSTGRES_PORT` / `BACKEND_PORT` trong môi trường Compose. |

## Lưu ý cho team

- **Không cần cài Java hay Maven** trên máy — Docker lo hết phần backend.
- **Không cần cài PostgreSQL** trên máy — Docker lo luôn.
- Chỉ cần cài **Docker** + **Node.js** (cho frontend/mobile).
- Lần build đầu tiên sẽ lâu (~2-5 phút) vì tải dependencies. Lần sau nhanh hơn nhờ Docker cache.
- Không commit `.env`, `JWT_SECRET` thật, token hay password.
