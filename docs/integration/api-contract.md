# API Contract & Integration — Smart Heritage Backend

Tài liệu tổng hợp hợp đồng API (contract) của backend Smart Heritage và hướng dẫn tích hợp từ phía frontend (Admin Web, Expo Mobile). Tài liệu này được viết dựa trên implementation thực tế trong nhánh `main` và `LTJ-29`.

## 1. Nguyên tắc chung

| Mục | Giá trị |
|-----|---------|
| Prefix API | `/api` (không phải `/api/v1`) |
| Response envelope | `ApiResponse<T>` = `{ success, message, data, timestamp, path, errors }` |
| Content-Type | `application/json` |
| Xác thực | JWT Bearer token (`Authorization: Bearer <accessToken>`) |
| Session | Stateless (không dùng session/cookie) |
| Mã hóa mật khẩu | BCrypt (mật khẩu không lưu dưới dạng plain text) |

Tất cả payload lỗi đều tuân thủ cùng envelop `ApiResponse<T>` với `success = false`.

### Ví dụ envelop thành công

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": { ... },
  "timestamp": "2026-10-22T13:55:00Z",
  "path": "/api/auth/login",
  "errors": null
}
```

### Ví dụ envelop lỗi

```json
{
  "success": false,
  "message": "Request validation failed",
  "data": null,
  "timestamp": "2026-10-22T13:55:00Z",
  "path": "/api/auth/register",
  "errors": [
    { "field": "username", "message": "Username is required" }
  ]
}
```

---

## 2. API Contract tổng hợp

### 2.1 Auth (M1) — không yêu cầu xác thực

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `POST` | `/api/auth/register` | `RegisterRequest` | `ApiResponse<UserResponse>` (201) | Đăng ký khách |
| `POST` | `/api/auth/login` | `LoginRequest` | `ApiResponse<LoginResponse>` (200) | Đăng nhập, trả về `accessToken` |

**RegisterRequest:**

| Trường | Kiểu | Ràng buộc | Mô tả |
|--------|------|-----------|-------|
| `username` | String | `@NotBlank`, `@Size(3,100)` | Tên đăng nhập |
| `email` | String | `@NotBlank`, `@Email`, `@Size(max=255)` | Email |
| `password` | String | `@NotBlank`, `@Size(6,100)` | Mật khẩu |

**LoginRequest:**

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `username` | String | `@NotBlank` |
| `password` | String | `@NotBlank` |

**LoginResponse (trong `data`):**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `accessToken` | String | JWT access token |
| `tokenType` | String | `"Bearer"` |
| `expiresIn` | long | Thời gian hết hạn (giây) |
| `user` | `UserResponse` | Thông tin người dùng |

**UserResponse:**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `userId` | Integer | ID người dùng |
| `username` | String | Tên đăng nhập |
| `email` | String | Email |
| `role` | String | Vai trò (`VISITOR`, `ADMIN`) |
| `preferredLanguageId` | Integer | ID ngôn ngữ ưu tiên (có thể null) |

Mật khẩu được mã hóa bằng BCrypt trước khi lưu, không bao giờ trả về trong response.

---

### 2.2 User (M1) — yêu cầu JWT Bearer token

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/users/me` | — | `ApiResponse<UserResponse>` (200) | Xem profile người dùng hiện tại |
| `PUT` | `/api/users/me` | `UpdateProfileRequest` | `ApiResponse<UserResponse>` (200) | Cập nhật profile |

**UpdateProfileRequest:**

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `username` | String | `@Size(3,100)` (tùy chọn) |
| `preferredLanguageId` | Integer | Tùy chọn |

Header yêu cầu: `Authorization: Bearer <accessToken>`.

---

### 2.3 Heritage Site (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/heritage-sites` | — | `ApiResponse<List<HeritageSiteResponse>>` (200) | Liệt kê di sản |
| `GET` | `/api/heritage-sites/{siteId}` | — | `ApiResponse<HeritageSiteResponse>` (200) | Chi tiết di sản |
| `POST` | `/api/heritage-sites` | `HeritageSiteRequest` | `ApiResponse<HeritageSiteResponse>` (201) | Tạo di sản (ADMIN) |
| `PUT` | `/api/heritage-sites/{siteId}` | `HeritageSiteRequest` | `ApiResponse<HeritageSiteResponse>` (200) | Cập nhật di sản (ADMIN) |
| `DELETE` | `/api/heritage-sites/{siteId}` | — | `ApiResponse<Void>` (200) | Xóa di sản (ADMIN) |

**HeritageSiteRequest:**

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `name` | String | `@NotBlank`, `@Size(max=255)` |
| `description` | String | Tùy chọn |
| `address` | String | `@Size(max=500)` (tùy chọn) |
| `latitude` | BigDecimal | `@DecimalMin(-90)`, `@DecimalMax(90)` (tùy chọn) |
| `longitude` | BigDecimal | `@DecimalMin(-180)`, `@DecimalMax(180)` (tùy chọn) |

**HeritageSiteResponse:** `siteId`, `name`, `description`, `address`, `latitude`, `longitude`.

Phân quyền: POST/PUT/DELETE yêu cầu `hasRole('ADMIN')`. GET công khai.

---

### 2.4 Artifact (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/artifacts?siteId={siteId}` | — | `ApiResponse<List<ArtifactResponse>>` (200) | Liệt kê hiện vật (lọc theo `siteId`) |
| `GET` | `/api/artifacts/{artifactId}` | — | `ApiResponse<ArtifactResponse>` (200) | Chi tiết hiện vật |
| `POST` | `/api/artifacts` | `ArtifactRequest` | `ApiResponse<ArtifactResponse>` (201) | Tạo hiện vật (ADMIN) |
| `PUT` | `/api/artifacts/{artifactId}` | `ArtifactRequest` | `ApiResponse<ArtifactResponse>` (200) | Cập nhật hiện vật (ADMIN) |
| `DELETE` | `/api/artifacts/{artifactId}` | — | `ApiResponse<Void>` (200) | Xóa hiện vật (ADMIN) |

**ArtifactRequest:**

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `siteId` | Integer | `@NotNull`, `@Positive` (ID di sản cha) |
| `name` | String | `@NotBlank`, `@Size(max=255)` |
| `description` | String | Tùy chọn |

**ArtifactResponse:** `artifactId`, `siteId`, `siteName`, `name`, `description`.

Phân quyền: POST/PUT/DELETE yêu cầu `hasRole('ADMIN')`. GET công khai.

---

### 2.5 Multimedia (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/multimedia?artifactId={artifactId}` | — | `ApiResponse<List<MultimediaResponse>>` (200) | Liệt kê multimedia (lọc theo `artifactId`) |
| `GET` | `/api/multimedia/{multimediaId}` | — | `ApiResponse<MultimediaResponse>` (200) | Chi tiết multimedia |
| `POST` | `/api/multimedia` | `MultimediaRequest` | `ApiResponse<MultimediaResponse>` (201) | Tạo multimedia (ADMIN) |
| `PUT` | `/api/multimedia/{multimediaId}` | `MultimediaRequest` | `ApiResponse<MultimediaResponse>` (200) | Cập nhật multimedia (ADMIN) |
| `DELETE` | `/api/multimedia/{multimediaId}` | — | `ApiResponse<Void>` (200) | Xóa multimedia (ADMIN) |

**MultimediaRequest:**

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `artifactId` | Integer | `@NotNull`, `@Positive` (ID hiện vật cha) |
| `type` | String | `@NotBlank`, `@Size(max=20)` (ví dụ `IMAGE`, `VIDEO`, `AUDIO`) |
| `title` | String | `@Size(max=255)` (tùy chọn) |
| `url` | String | `@NotBlank` (URL tài nguyên) |

**MultimediaResponse:** `multimediaId`, `artifactId`, `artifactName`, `type`, `title`, `url`.

Phân quyền: POST/PUT/DELETE yêu cầu `hasRole('ADMIN')`. GET công khai.

---

### 2.6 Health

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/health` | Health check, không yêu cầu xác thực |

Trả về: `{"status":"UP","timestamp":"..."}` (dạng `Map`, không dùng envelop `ApiResponse`).

---

### 2.7 Visitor Interaction & Analytics (M5)

#### 2.7.1 POST `/api/interactions` — ghi sự kiện tương tác

| Trường | Kiểu | Ràng buộc | Mô tả |
|--------|------|-----------|-------|
| `eventId` | UUID | `@NotNull` | UUID định danh sự kiện, dùng để tránh ghi trùng (idempotency) |
| `artifactId` | Integer | `@NotNull`, `@Positive` | ID hiện vật tương tác |
| `interactionType` | String | `@NotBlank`, `@Pattern(VIEW\|AUDIO_PLAY\|SCAN)` | Loại tương tác |
| `languageCode` | String | `@NotBlank`, `@Size(max=16)`, `@Pattern([A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*)` | Mã ngôn ngữ (ví dụ `vi`, `en`) |
| `startedAt` | Instant | `@NotNull` | Thời điểm bắt đầu tương tác |
| `endedAt` | Instant | Tùy chọn | Thời điểm kết thúc tương tác |
| `interactedAt` | Instant | `@NotNull` | Thời điểm sự kiện xảy ra |

Request: `POST /api/interactions`, header `Authorization: Bearer <accessToken>`.

**Response:**

| Trạng thái | Mô tả |
|-----------|-------|
| `201 Created` | Tạo sự kiện tương tác mới thành công |
| `200 OK` | Sự kiện đã tồn tại theo `eventId` (idempotency), trả về bản ghi hiện có |
| `400 Bad Request` | Dữ liệu không hợp lệ (validation, `endedAt` trước `startedAt`, `interactionType` không hợp lệ, v.v.) |
| `401 Unauthorized` | Chưa đăng nhập |
| `404 Not Found` | `artifactId` không tồn tại hoặc user không tồn tại |
| `409 Conflict` | `eventId` đã được dùng bởi user khác, hoặc vi phạm unique constraint `event_id` khi request đồng thời |

**Quy tắc idempotency:** Gửi cùng `eventId` nhiều lần chỉ tạo **một** bản ghi trong database. Lần đầu trả về `201 Created`, lần sau trả về `200 OK` với thông báo `"Interaction event was already recorded"`. Nếu `eventId` đã được dùng bởi user khác, trả về `409 Conflict`.

**Giới hạn race condition:** Nếu hai request cùng `eventId` đến gần cùng một lúc, cả hai có thể thấy `eventId` chưa tồn tại và cùng cố insert. Một trong hai sẽ vi phạm unique constraint `event_id` và nhận `409 Conflict` với thông báo `"The submitted eventId has already been recorded."`. Do đó, trong trường hợp race condition, client có thể nhận `201 Created` (lần đầu) hoặc `409 Conflict` (lần bị chặn bởi unique constraint). Client nên xem cả hai mã trạng thái là thành công (sự kiện đã được ghi).

**Ví dụ request:**

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "artifactId": 1,
  "interactionType": "VIEW",
  "languageCode": "vi",
  "startedAt": "2026-10-20T10:00:00Z",
  "endedAt": "2026-10-20T10:00:30Z",
  "interactedAt": "2026-10-20T10:00:00Z"
}
```

**Ví dụ response (201 Created):**

```json
{
  "success": true,
  "message": "Interaction recorded successfully",
  "data": {
    "interactionId": 1,
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "artifactId": 1,
    "interactionType": "VIEW",
    "languageCode": "vi",
    "startedAt": "2026-10-20T10:00:00Z",
    "endedAt": "2026-10-20T10:00:30Z",
    "durationSeconds": 30,
    "interactedAt": "2026-10-20T10:00:00Z"
  },
  "timestamp": "...",
  "path": "/api/interactions",
  "errors": null
}
```

`durationSeconds` được tính tự động từ `startedAt` và `endedAt` (giây, `long`). Nếu `endedAt` null thì `durationSeconds` null.

#### 2.7.2 GET `/api/analytics/interactions/summary` — thống kê tương tác (ADMIN)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `from` | Instant (ISO-8601) | Không | Thời điểm bắt đầu khoảng lọc |
| `to` | Instant (ISO-8601) | Không | Thời điểm kết thúc khoảng lọc |

Yêu cầu header `Authorization: Bearer <accessToken>` và role `ADMIN`.

**Quy tắc:**
- `from` và `to` phải được cung cấp cùng lúc.
- `from` phải sớm hơn `to`.
- Khoảng thời gian không được vượt quá **90 ngày**.
- Khoảng lọc là `[from, to)` (bao gồm `from`, không bao gồm `to`).

**Response:** `ApiResponse<InteractionSummaryResponse>`

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `from` | Instant | Thời điểm bắt đầu lọc |
| `to` | Instant | Thời điểm kết thúc lọc |
| `totalInteractions` | long | Tổng số sự kiện trong khoảng |
| `uniqueVisitors` | long | Số visitor duy nhất (distinct `userId`) |
| `interactionTypes` | List | Danh sách `{interactionType, count}` |
| `popularArtifacts` | List | Top 10 artifact phổ biến nhất `{artifactId, artifactName, count}` |

Nếu không có dữ liệu, các danh sách trả về rỗng và các số là 0.

#### 2.7.3 GET `/api/analytics/interactions/timeseries` — Daily Interaction Time-Series (ADMIN)

This endpoint provides daily interaction statistics, including total interactions and unique visitors, within a specified date range.

**Authentication:** JWT Bearer token with `ADMIN` role.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | Instant (ISO-8601) | Yes | Start timestamp (inclusive) |
| `to` | Instant (ISO-8601) | Yes | End timestamp (exclusive) |

**Validation Rules:**

- Both `from` and `to` must be provided.
- `from` must be earlier than `to`.
- The date range must not exceed 90 days.
- The filtering interval is `[from, to)`.
- All daily aggregations use UTC.
- Days without interactions are included with zero counts.
- Results are returned in ascending chronological order.
- Aggregation is performed directly in PostgreSQL.

**Response:** `ApiResponse<List<DailyInteractionResponse>>`

| Field | Type | Description |
|-------|------|-------------|
| `date` | LocalDate | Calendar date in UTC (`yyyy-MM-dd`) |
| `totalInteractions` | long | Total number of interactions for the day |
| `uniqueVisitors` | long | Number of distinct visitors for the day |

**Example Request:**

```http
GET /api/analytics/interactions/timeseries?from=2025-06-01T00:00:00Z&to=2025-06-04T00:00:00Z
Authorization: Bearer <accessToken>
```

**Example Response (200 OK):**

```json
{
  "success": true,
  "message": "Daily interaction time-series retrieved successfully",
  "data": [
    {
      "date": "2025-06-01",
      "totalInteractions": 3,
      "uniqueVisitors": 2
    },
    {
      "date": "2025-06-02",
      "totalInteractions": 0,
      "uniqueVisitors": 0
    },
    {
      "date": "2025-06-03",
      "totalInteractions": 1,
      "uniqueVisitors": 1
    }
  ],
  "timestamp": "...",
  "path": "/api/analytics/interactions/timeseries",
  "errors": null
}
```

---

#### 2.7.4 GET `/api/analytics/interactions/languages` — Language Analytics (ADMIN)

This endpoint provides interaction statistics grouped by language code within a specified date range.

**Authentication:** JWT Bearer token with `ADMIN` role.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | Instant (ISO-8601) | Yes | Start timestamp (inclusive) |
| `to` | Instant (ISO-8601) | Yes | End timestamp (exclusive) |

**Validation Rules:**

- Both `from` and `to` must be provided.
- `from` must be earlier than `to`.
- The date range must not exceed 90 days.
- The filtering interval is `[from, to)`.
- Results are grouped by `languageCode`.
- Language codes may include `vi`, `en`, `fr`, and other supported codes.
- Results are ordered by interaction count descending.
- Equal counts are ordered by language code ascending.
- Aggregation is performed directly in the database.
- An empty result set returns `[]`.

**Response:** `ApiResponse<List<LanguageCountResponse>>`

| Field | Type | Description |
|-------|------|-------------|
| `languageCode` | String | Language code associated with interactions |
| `interactionCount` | long | Total number of interactions for the language |

**Example Request:**

```http
GET /api/analytics/interactions/languages?from=2025-07-01T00:00:00Z&to=2025-07-02T00:00:00Z
Authorization: Bearer <accessToken>
```

**Example Response (200 OK):**

```json
{
  "success": true,
  "message": "Language analytics retrieved successfully",
  "data": [
    {
      "languageCode": "vi",
      "interactionCount": 2
    },
    {
      "languageCode": "en",
      "interactionCount": 1
    },
    {
      "languageCode": "fr",
      "interactionCount": 1
    }
  ],
  "timestamp": "...",
  "path": "/api/analytics/interactions/languages",
  "errors": null
}
```

---

#### 2.7.5 Advanced Analytics — HTTP Status Codes

The following HTTP status codes apply to both the Time-Series and Language Analytics endpoints.

| HTTP Status | Description |
|-------------|-------------|
| `200 OK` | Analytics data retrieved successfully |
| `400 Bad Request` | Missing parameters, invalid date range, or range exceeding 90 days |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | Authenticated user does not have the `ADMIN` role |

**Security Requirements:**

- Both endpoints are protected by `@PreAuthorize("hasRole('ADMIN')")`.
- Unauthenticated requests must return HTTP 401.
- Requests from `VISITOR` accounts must return HTTP 403.
- Only authenticated `ADMIN` accounts can retrieve analytics data.

**Database and Performance Considerations:**

- Data aggregation is executed directly in PostgreSQL.
- Daily statistics use SQL `GROUP BY` and `COUNT(DISTINCT user_id)`.
- Language statistics use JPQL aggregation with `GROUP BY`.
- The backend does not load all interaction records into memory for aggregation.
- The maximum date range is limited to 90 days to control query size.

**Integration Testing Results:**

The following PostgreSQL integration scenarios have been verified:

- Daily interaction aggregation and unique visitor counting.
- UTC-based date grouping.
- Zero-filled dates without interaction records.
- Chronological ordering of daily results.
- Language grouping and interaction counting.
- Date range boundary filtering.
- Authentication and role-based authorization.
- Invalid date range rejection.
- Maximum 90-day range validation.

**Full Regression Test Results — November 6, 2026:**

```text
Tests run: 23, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

All 23 tests in `VisitorInteractionPostgresIT` passed against PostgreSQL.

---


---


### 2.8 Visitor Interaction / Analytics — Implementation Status

The Smart Heritage backend currently implements four Visitor Interaction and Analytics endpoints.

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| `POST` | `/api/interactions` | Record visitor interaction events | Authenticated user |
| `GET` | `/api/analytics/interactions/summary` | Retrieve interaction summary statistics | ADMIN |
| `GET` | `/api/analytics/interactions/timeseries` | Retrieve daily interaction and unique visitor statistics | ADMIN |
| `GET` | `/api/analytics/interactions/languages` | Retrieve interaction statistics grouped by language | ADMIN |

**Implementation Status:**

- Backend controllers, services, repositories, and DTOs are implemented.
- PostgreSQL aggregation queries are implemented and tested.
- JWT authentication and ADMIN authorization are enforced.
- Date filtering and maximum 90-day validation are implemented.
- Existing API endpoints remain backward compatible.
- PostgreSQL integration testing completed successfully with 23/23 tests passing.

**Frontend Integration:**

The Admin Web frontend can consume the analytics endpoints to display daily interaction trends and language distribution statistics.

The Mobile application currently includes an interaction API service layer at `mobile/src/services/interactionApi.ts`. Actual UI integration must be verified separately.

The API contract should be shared with the M1 and M4 teams before frontend integration.

---

## 3. Mã trạng thái HTTP

| Code | Ý nghĩa |
|------|---------|
| `200 OK` | Thành công (GET/PUT) |
| `201 Created` | Tạo mới thành công (POST) |
| `400 Bad Request` | Lỗi validation / body malformed |
| `401 Unauthorized` | Thiếu hoặc token không hợp lệ |
| `403 Forbidden` | Đã xác thực nhưng không có quyền `ADMIN` |
| `404 Not Found` | Resource không tồn tại |
| `500 Internal Server Error` | Lỗi không mong đợi |

---

## 4. Cách cấu hình frontend gọi backend

### 4.1 Base URL

Backend chạy tại cổng `8080`. Tất cả endpoint có prefix `/api`.

> **Quan trọng:** hai client dùng quy ước biến môi trường khác nhau:
> - **Admin Web** (`VITE_API_BASE_URL`) là **origin**, KHÔNG gồm `/api`
>   (code tự thêm `/api` vào path).
> - **Mobile** (`EXPO_PUBLIC_API_BASE_URL`) là **API base URL đầy đủ**, CÓ `/api`
>   (service tự nối endpoint tương đối).
>
> Không đặt `http://localhost:8080/api` vào `VITE_API_BASE_URL` để tránh `/api/api`.

| Môi trường | Biến | Giá trị |
|------------|------|---------|
| Admin Web (Vite dev) | `VITE_API_BASE_URL` | `http://localhost:8080` |
| Expo Web | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8080/api` |
| Android Emulator | `EXPO_PUBLIC_API_BASE_URL` | `http://10.0.2.2:8080/api` |
| iOS Simulator | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8080/api` |
| Thiết bị thật (LAN) | `EXPO_PUBLIC_API_BASE_URL` | `http://<IP_MAY_CHUYEN_BE>:8080/api` |

### 4.2 Giải thích `localhost` vs `10.0.2.2`

- **`localhost` / `127.0.0.1`**: Dùng khi frontend và backend chạy trên **cùng một máy** (trình duyệt web, iOS Simulator, Expo Web).
- **`10.0.2.2`**: Địa chỉ đặc biệt của Android Emulator để truy cập máy chủ host (máy chạy backend). Không dùng `localhost` trên Android Emulator vì nó trỏ về chính emulator, không phải máy host.

### 4.3 Ví dụ cấu hình

**Admin Web (Vite) — `vite.config.ts` (tuỳ chọn, nếu dùng proxy):**

```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

**Expo Mobile — biến môi trường:**

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api
```

Trên code, đọc qua `process.env.EXPO_PUBLIC_API_BASE_URL` và nối path endpoint (ví dụ `${API_BASE_URL}/auth/login`).

---

## 5. Cấu hình CORS

Backend cấu hình CORS qua bean `CorsConfigurationSource` trong `SecurityConfig`, áp dụng cho pattern `/api/**`.

### Cách hoạt động

- CORS được xử lý **trước** bước xác thực JWT trong chuỗi filter Spring Security.
- Preflight `OPTIONS` không yêu cầu JWT token.
- Các origin được phép đọc từ biến môi trường `CORS_ALLOWED_ORIGINS` (property `app.cors.allowed-origins`).
- Default (local development): `http://localhost:5173` (Admin Web Vite), `http://localhost:8081` (Expo Web).
- Methods cho phép: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- Headers cho phép: `Authorization`, `Content-Type`, `Accept`.
- `allowCredentials = false` (không dùng cookie/session credential).
- Không dùng wildcard origin `*`.

### Biến môi trường

| Biến | Giá trị mặc định | Mô tả |
|------|------------------|-------|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8081` | Danh sách origin được phép, phân cách bằng dấu phẩy |

Ví dụ chạy Docker Compose với origin tùy chỉnh:

```yaml
environment:
  - CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,https://admin.example.com
```

### CORS Troubleshooting

| Triệu chứng | Nguyên nhân có thể | Cách khắc phục |
|-------------|-------------------|-----------------|
| Trình duyệt báo "Blocked by CORS policy" | Origin chưa được cấu hình trong `allowed-origins` | Thêm origin vào `CORS_ALLOWED_ORIGINS` |
| Preflight `OPTIONS` trả về 403 | Endpoint yêu cầu auth nhưng preflight không kèm token | CORS xử lý preflight trước auth, nên không bị 403 do auth. Kiểm tra lại origin/method. |
| `Authorization` header bị loại bỏ | Header chưa được liệt kê trong `allowedHeaders` | Thêm `Authorization` vào `allowedHeaders` (đã cấu hình) |
| Cookie không được gửi | `allowCredentials = false` | Nếu cần cookie, bật `allowCredentials = true` và chỉ định origin cụ thể (không dùng `*`) |

---

## 6. Checklist integration smoke test (M1–M5)

| # | Kịch bản | Endpoint | Kết quả mong đợi |
|---|----------|----------|------------------|
| 1 | Backend khởi động | `GET /api/health` | `200 OK`, `status: UP` |
| 2 | Đăng ký khách | `POST /api/auth/register` | `201 Created`, `success: true`, `data.role = VISITOR` |
| 3 | Đăng nhập | `POST /api/auth/login` | `200 OK`, `data.accessToken` không rỗng |
| 4 | Xem profile (có token) | `GET /api/users/me` + `Authorization: Bearer <token>` | `200 OK`, `data.username` đúng |
| 5 | Xem profile (không token) | `GET /api/users/me` | `401 Unauthorized` |
| 6 | CORS preflight (Admin Web) | `OPTIONS /api/auth/login` + `Origin: http://localhost:5173` | `200 OK`, `Access-Control-Allow-Origin: http://localhost:5173` |
| 7 | CORS origin không được phép | `OPTIONS /api/auth/login` + `Origin: http://evil.example.com` | Không có header `Access-Control-Allow-Origin` |
| 8 | Tạo di sản (ADMIN) | `POST /api/heritage-sites` + token ADMIN | `201 Created` |
| 9 | Tạo di sản (VISITOR) | `POST /api/heritage-sites` + token VISITOR | `403 Forbidden` |
| 10 | Xem danh sách di sản (công khai) | `GET /api/heritage-sites` | `200 OK` |
| 11 | Tạo hiện vật (ADMIN) | `POST /api/artifacts` + token ADMIN | `201 Created` |
| 12 | Lọc hiện vật theo di sản | `GET /api/artifacts?siteId={siteId}` | `200 OK`, danh sách hiện vật của di sản |
| 13 | Tạo multimedia (ADMIN) | `POST /api/multimedia` + token ADMIN | `201 Created` |
| 14 | Sai mật khẩu | `POST /api/auth/login` + mật khẩu sai | `401 Unauthorized` |
| 15 | Validation lỗi | `POST /api/auth/register` + thiếu trường | `400 Bad Request`, `errors` không rỗng |
| 16 | Ghi sự kiện tương tác (visitor) | `POST /api/interactions` + token visitor + `eventId` mới | `201 Created`, `success: true` |
| 17 | Ghi sự kiện trùng `eventId` (visitor) | `POST /api/interactions` + cùng `eventId` lần 2 | `200 OK`, `"Interaction event was already recorded"` |
| 18 | Ghi sự kiện trùng `eventId` (user khác) | `POST /api/interactions` + cùng `eventId`, token user khác | `409 Conflict` |
| 19 | Ghi sự kiện không xác thực | `POST /api/interactions` không có token | `401 Unauthorized` |
| 20 | Xem analytics summary (ADMIN) | `GET /api/analytics/interactions/summary?from=..&to=..` + token ADMIN | `200 OK`, `totalInteractions`, `uniqueVisitors`, ... |
| 21 | Xem analytics summary (VISITOR) | `GET /api/analytics/interactions/summary` + token VISITOR | `403 Forbidden` |
| 22 | Xem analytics summary (không token) | `GET /api/analytics/interactions/summary` không có token | `401 Unauthorized` |
| 23 | Analytics range không hợp lệ | `GET /api/analytics/interactions/summary?from=..&to=..` với `from > to` | `400 Bad Request` |
| 24 | Analytics khoảng thời gian > 90 ngày | `GET /api/analytics/interactions/summary?from=..&to=..` > 90 ngày | `400 Bad Request` |

| 25 | Daily Time-Series (ADMIN) | `GET /api/analytics/interactions/timeseries?from=..&to=..` + ADMIN token | `200 OK`, daily statistics returned |
| 26 | Language Analytics (ADMIN) | `GET /api/analytics/interactions/languages?from=..&to=..` + ADMIN token | `200 OK`, language statistics returned |
| 27 | Daily Time-Series (VISITOR) | `GET /api/analytics/interactions/timeseries` + VISITOR token | `403 Forbidden` |
| 28 | Language Analytics (VISITOR) | `GET /api/analytics/interactions/languages` + VISITOR token | `403 Forbidden` |
| 29 | Advanced Analytics without authentication | GET either new analytics endpoint without token | `401 Unauthorized` |
| 30 | Advanced Analytics invalid date range | GET either new analytics endpoint with date range > 90 days | `400 Bad Request` |
| 31 | Advanced Analytics missing parameters | GET either new analytics endpoint without `from` or `to` | `400 Bad Request` |

---

## 7. Ghi chú cho M3–M5

- M3 (Mobile) có service layer `mobile/src/services/interactionApi.ts` để gọi `POST /api/interactions` (tạo `eventId` UUID, gửi Bearer token từ `authStorage`). **Chưa có màn hình UI gọi thực sự** tại thời điểm viết tài liệu này. Không gọi API tương tác từ màn hình mobile cho đến khi có luồng quét/iBeacon/Xem thực tế.
- M5 (Visitor Interaction / Analytics) has implemented the backend entity `VisitorInteraction`, repository, service, controller, DTOs, exception handling, and integration tests. The available endpoints are:
  - `POST /api/interactions`
  - `GET /api/analytics/interactions/summary`
  - `GET /api/analytics/interactions/timeseries`
  - `GET /api/analytics/interactions/languages`

- Nếu M3/M5 cần thêm endpoint, hãy mở PR và cập nhật tài liệu này kèm theo.
