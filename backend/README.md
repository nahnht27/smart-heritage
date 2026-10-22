# Backend — Spring Boot

## Tech Stack

| Component   | Version / Tool      |
|-------------|---------------------|
| Language    | Java 17             |
| Framework   | Spring Boot 3.2.5   |
| Build Tool  | Maven 3.9.6         |
| Database    | PostgreSQL          |

## Dependencies

- `spring-boot-starter-web` — REST API
- `spring-boot-starter-data-jpa` — ORM / Repository pattern
- `spring-boot-starter-validation` — Bean Validation (Jakarta)
- `spring-boot-starter-security` — Spring Security (JWT stateless)
- `postgresql` — JDBC driver

## Project Structure

```
backend/
├── .mvn/wrapper/          # Maven Wrapper
├── src/
│   ├── main/
│   │   ├── java/com/university/backend/
│   │   │   ├── controller/     # REST Controllers
│   │   │   │   ├── AuthController.java        (M1)
│   │   │   │   ├── UserController.java        (M1)
│   │   │   │   ├── HealthController.java      (M1)
│   │   │   │   ├── HeritageSiteController.java (M2)
│   │   │   │   ├── ArtifactController.java    (M2)
│   │   │   │   └── MultimediaController.java  (M2)
│   │   │   ├── service/        # Business Logic
│   │   │   ├── repository/     # JPA Repositories
│   │   │   ├── entity/         # Entity classes
│   │   │   ├── dto/            # Data Transfer Objects
│   │   │   ├── exception/      # Custom exceptions
│   │   │   ├── security/       # JWT Security
│   │   │   └── BackendApplication.java
│   │   └── resources/
│   │       └── application.yml
│   └── test/
├── mvnw                   # Maven Wrapper script
├── pom.xml
└── .gitignore
```

## API Endpoints

Tất cả endpoint dùng prefix `/api`. Response envelope tuân thủ `ApiResponse<T>`:
`{ success, message, data, timestamp, path, errors }`.

### Auth (M1) — không yêu cầu xác thực

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `POST` | `/api/auth/register` | `RegisterRequest` | `ApiResponse<UserResponse>` | Đăng ký khách |
| `POST` | `/api/auth/login` | `LoginRequest` | `ApiResponse<LoginResponse>` | Đăng nhập, trả về `accessToken` |

### User (M1) — yêu cầu JWT Bearer token

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/users/me` | — | `ApiResponse<UserResponse>` | Xem profile người dùng hiện tại |
| `PUT` | `/api/users/me` | `UpdateProfileRequest` | `ApiResponse<UserResponse>` | Cập nhật profile |

### Heritage Site (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/heritage-sites` | — | `ApiResponse<List<HeritageSiteResponse>>` | Liệt kê di sản |
| `GET` | `/api/heritage-sites/{siteId}` | — | `ApiResponse<HeritageSiteResponse>` | Chi tiết di sản |
| `POST` | `/api/heritage-sites` | `HeritageSiteRequest` | `ApiResponse<HeritageSiteResponse>` | Tạo di sản (ADMIN) |
| `PUT` | `/api/heritage-sites/{siteId}` | `HeritageSiteRequest` | `ApiResponse<HeritageSiteResponse>` | Cập nhật di sản (ADMIN) |
| `DELETE` | `/api/heritage-sites/{siteId}` | — | `ApiResponse<Void>` | Xóa di sản (ADMIN) |

### Artifact (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/artifacts?siteId={siteId}` | — | `ApiResponse<List<ArtifactResponse>>` | Liệt kê hiện vật (lọc theo `siteId`) |
| `GET` | `/api/artifacts/{artifactId}` | — | `ApiResponse<ArtifactResponse>` | Chi tiết hiện vật |
| `POST` | `/api/artifacts` | `ArtifactRequest` | `ApiResponse<ArtifactResponse>` | Tạo hiện vật (ADMIN) |
| `PUT` | `/api/artifacts/{artifactId}` | `ArtifactRequest` | `ApiResponse<ArtifactResponse>` | Cập nhật hiện vật (ADMIN) |
| `DELETE` | `/api/artifacts/{artifactId}` | — | `ApiResponse<Void>` | Xóa hiện vật (ADMIN) |

### Multimedia (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/multimedia?artifactId={artifactId}` | — | `ApiResponse<List<MultimediaResponse>>` | Liệt kê multimedia (lọc theo `artifactId`) |
| `GET` | `/api/multimedia/{multimediaId}` | — | `ApiResponse<MultimediaResponse>` | Chi tiết multimedia |
| `POST` | `/api/multimedia` | `MultimediaRequest` | `ApiResponse<MultimediaResponse>` | Tạo multimedia (ADMIN) |
| `PUT` | `/api/multimedia/{multimediaId}` | `MultimediaRequest` | `ApiResponse<MultimediaResponse>` | Cập nhật multimedia (ADMIN) |
| `DELETE` | `/api/multimedia/{multimediaId}` | — | `ApiResponse<Void>` | Xóa multimedia (ADMIN) |

### Health

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/health` | Health check, không yêu cầu xác thực |

## Xác thực và Phân quyền

- JWT Bearer token được trả về từ `POST /api/auth/login`.
- Gửi token trong header: `Authorization: Bearer <accessToken>`.
- Các endpoint ghi/xóa nội dung (POST/PUT/DELETE trên heritage-sites, artifacts, multimedia) yêu cầu role `ADMIN` (`@PreAuthorize("hasRole('ADMIN')")`).
- Các endpoint GET là công khai (không yêu cầu token).
- Lỗi xác thực trả về `401 Unauthorized`, lỗi phân quyền trả về `403 Forbidden`.

## Quick Start

```bash
# Đảm bảo PostgreSQL đang chạy, database 'smart_heritage' đã tồn tại
# Cấu hình trong application.yml hoặc qua biến môi trường Docker Compose

# Chạy app (tự download Maven nếu chưa có)
./mvnw spring-boot:run

# Hoặc nếu đã cài Maven global
mvn spring-boot:run

# Health check
curl http://localhost:8080/api/health
```

## Chạy Tests

```bash
# Chạy toàn bộ bộ kiểm thử (dùng H2 in-memory, không cần PostgreSQL)
./mvnw test

# Hoặc nếu đã cài Maven global
mvn test
```

## Cấu hình Database

Sửa file `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/smart_heritage
    username: postgres
    password: postgres
```

### Biến môi trường

| Biến | Giá trị mặc định | Mô tả |
|------|------------------|-------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/smart_heritage` | URL kết nối PostgreSQL |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Username database |
| `SPRING_DATASOURCE_PASSWORD` | `postgres` | Password database |
| `JWT_SECRET` | `SmartHeritageDevSecretKeyThatIsAtLeast256BitsLong!2024` | Khóa ký JWT (phải >= 256 bits) |
| `JWT_EXPIRATION_MS` | `86400000` | Thời gian hết hạn JWT (ms, mặc định 24 giờ) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8081` | Danh sách origin được phép gọi API (phân cách bằng dấu phẩy) |

Xem file `backend/.env.example` để có mẫu đầy đủ.

Hoặc chạy toàn bộ stack bằng Docker Compose từ thư mục gốc dự án:

```bash
docker-compose up --build -d
```

## Cấu hình CORS

Backend đã cấu hình `CorsConfigurationSource` trong `SecurityConfig`, áp dụng cho pattern `/api/**`.

- CORS được xử lý **trước** bước xác thực JWT. Preflight `OPTIONS` không yêu cầu token.
- Methods cho phép: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- Headers cho phép: `Authorization`, `Content-Type`, `Accept`.
- `allowCredentials = false` (không dùng cookie/session credential).
- Không dùng wildcard origin `*`.
- Danh sách origin được phép đọc từ biến `CORS_ALLOWED_ORIGINS` (property `app.cors.allowed-origins`), mặc định là `http://localhost:5173` (Admin Web Vite) và `http://localhost:8081` (Expo Web).

### CORS Troubleshooting

| Triệu chứng | Nguyên nhân có thể | Cách khắc phục |
|-------------|-------------------|-----------------|
| Trình duyệt báo "Blocked by CORS policy" | Origin chưa được cấu hình | Thêm origin vào `CORS_ALLOWED_ORIGINS` |
| `Authorization` header bị loại bỏ | Header chưa được liệt kê | Header `Authorization` đã được cấu hình trong `allowedHeaders` |
| Cookie không được gửi | `allowCredentials = false` | Nếu cần cookie, bật `allowCredentials = true` và chỉ định origin cụ thể |

