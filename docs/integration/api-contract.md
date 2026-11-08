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

#### Content Discovery – Heritage Site

Endpoint: `GET /api/heritage-sites`

Query parameters:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `keyword` | String | No | Tìm kiếm theo tên di sản, không phân biệt chữ hoa/thường; tự động trim khoảng trắng |
| `page` | Integer | No | Số trang, bắt đầu từ 0 |
| `size` | Integer | No | Số phần tử mỗi trang, mặc định 10, tối đa 100 |
| `sortBy` | String | No | Trường sắp xếp: `name`, `siteId` |
| `direction` | String | No | Chiều sắp xếp: `asc`, `desc`; mặc định `asc` khi có phân trang |

Backward compatibility:
- Không truyền `page` và `size`: trả về `ApiResponse<List<HeritageSiteResponse>>` như contract cũ.
- Có truyền `page` hoặc `size`: trả về `ApiResponse<PageResponse<HeritageSiteResponse>>`.
- Nếu chỉ truyền một trong hai tham số phân trang, tham số còn thiếu sử dụng giá trị mặc định.

#### Pagination response

`data` có cấu trúc:

| Field | Type | Description |
|---|---|---|
| `content` | List | Danh sách kết quả |
| `page` | Integer | Trang hiện tại, bắt đầu từ 0 |
| `size` | Integer | Kích thước trang |
| `totalElements` | Long | Tổng số kết quả |
| `totalPages` | Integer | Tổng số trang |

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

**Ràng buộc khi xóa:**
- Không thể xóa HeritageSite khi còn Artifact liên quan.
- Nếu vi phạm ràng buộc dữ liệu, trả về `409 Conflict`.
- Các bản ghi Artifact liên quan được giữ nguyên.

---

### 2.4 Artifact (M2) — GET công khai, ghi/xóa yêu cầu `ADMIN`

| Method | Endpoint | Request Body | Response | Mô tả |
|--------|----------|--------------|----------|-------|
| `GET` | `/api/artifacts?siteId={siteId}` | — | `ApiResponse<List<ArtifactResponse>>` (200) | Liệt kê hiện vật (lọc theo `siteId`) |
| `GET` | `/api/artifacts/{artifactId}` | — | `ApiResponse<ArtifactResponse>` (200) | Chi tiết hiện vật |
| `POST` | `/api/artifacts` | `ArtifactRequest` | `ApiResponse<ArtifactResponse>` (201) | Tạo hiện vật (ADMIN) |
| `PUT` | `/api/artifacts/{artifactId}` | `ArtifactRequest` | `ApiResponse<ArtifactResponse>` (200) | Cập nhật hiện vật (ADMIN) |
| `DELETE` | `/api/artifacts/{artifactId}` | — | `ApiResponse<Void>` (200) | Xóa hiện vật (ADMIN) |

#### Content Discovery – Artifact

Endpoint: `GET /api/artifacts`

Query parameters:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `siteId` | Integer | No | Lọc hiện vật theo di sản |
| `keyword` | String | No | Tìm kiếm theo tên hiện vật, không phân biệt chữ hoa/thường; tự động trim khoảng trắng |
| `page` | Integer | No | Số trang, bắt đầu từ 0 |
| `size` | Integer | No | Số phần tử mỗi trang, mặc định 10, tối đa 100 |
| `sortBy` | String | No | Trường sắp xếp: `name`, `artifactId` |
| `direction` | String | No | Chiều sắp xếp: `asc`, `desc` |

Backward compatibility:
- Không truyền `page` và `size`: trả về `ApiResponse<List<ArtifactResponse>>` như contract cũ.
- Có truyền `page` hoặc `size`: trả về `ApiResponse<PageResponse<ArtifactResponse>>`.
- Có thể kết hợp `siteId`, `keyword`, phân trang và sắp xếp.
- Nếu chỉ truyền một trong hai tham số phân trang, tham số còn thiếu sử dụng giá trị mặc định.

Pagination response sử dụng cùng cấu trúc `PageResponse` được mô tả tại mục 2.3.

**ArtifactRequest:**

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `siteId` | Integer | `@NotNull`, `@Positive` (ID di sản cha) |
| `name` | String | `@NotBlank`, `@Size(max=255)` |
| `description` | String | Tùy chọn |

**ArtifactResponse:** `artifactId`, `siteId`, `siteName`, `name`, `description`.

Phân quyền: POST/PUT/DELETE yêu cầu `hasRole('ADMIN')`. GET công khai.

**Ràng buộc khi xóa:**
- Không thể xóa Artifact khi còn Multimedia, VisitorInteraction hoặc Beacon liên quan.
- Nếu vi phạm ràng buộc dữ liệu, trả về `409 Conflict`.
- Các bản ghi liên quan được giữ nguyên, không thực hiện cascade delete.

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

**Validation và quan hệ dữ liệu:**
- `artifactId` phải tham chiếu đến Artifact đang tồn tại.
- Nếu Artifact không tồn tại, trả về `404 Not Found`.
- Dữ liệu request không hợp lệ trả về `400 Bad Request`.

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
| `visitorId` | UUID | `@NotNull` | UUID ẩn danh, ổn định theo thiết bị; dùng cho `uniqueVisitors` |
| `artifactId` | Integer | `@NotNull`, `@Positive` | ID hiện vật tương tác |
| `beaconId` | Integer | Tùy chọn; bắt buộc với `BEACON_TRIGGER`, `@Positive` | ID beacon đã resolve; chỉ hợp lệ với `BEACON_TRIGGER` |
| `interactionType` | String | `@NotBlank`, `@Pattern(?i:VIEW\|AUDIO_PLAY\|SCAN\|BEACON_TRIGGER)` | Loại tương tác |
| `languageCode` | String | `@NotBlank`, `@Size(max=16)`, `@Pattern([A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*)` | Mã ngôn ngữ (ví dụ `vi`, `en`) |
| `startedAt` | Instant | `@NotNull` | Thời điểm bắt đầu tương tác |
| `endedAt` | Instant | Tùy chọn | Thời điểm kết thúc tương tác |
| `interactedAt` | Instant | `@NotNull` | Thời điểm sự kiện xảy ra |

Request: `POST /api/interactions`. Endpoint công khai: khách ẩn danh không cần token.
Nếu có header `Authorization: Bearer <accessToken>` hợp lệ, backend gán `user_id` theo principal.
Client **không** gửi `userId`; nếu body có `userId` thì backend bỏ qua, không tin giá trị client.

**Response:**

| Trạng thái | Mô tả |
|-----------|-------|
| `201 Created` | Tạo sự kiện tương tác mới thành công |
| `200 OK` | Sự kiện đã tồn tại theo `eventId` (idempotency), trả về bản ghi hiện có |
| `400 Bad Request` | Dữ liệu không hợp lệ (validation, `endedAt` trước `startedAt`, `interactionType` không hợp lệ, v.v.) |
| `404 Not Found` | `artifactId`/`beaconId` không tồn tại (hoặc user trong token không tồn tại) |
| `409 Conflict` | `eventId` đã được dùng bởi user/visitor khác, hoặc vi phạm unique constraint `event_id` khi request đồng thời |

**Quy tắc idempotency:** Gửi cùng `eventId` nhiều lần chỉ tạo **một** bản ghi trong database. Lần đầu trả về `201 Created`, lần sau trả về `200 OK` với thông báo `"Interaction event was already recorded"`.
Retry hợp lệ khi cùng danh tính: user đã đăng nhập trùng username (không bắt buộc trùng `visitorId`), hoặc khách ẩn danh trùng `visitorId`.
Nếu `eventId` đã được dùng bởi user/visitor khác, trả về `409 Conflict`.

**Giới hạn race condition:** Nếu hai request cùng `eventId` đến gần cùng một lúc, cả hai có thể thấy `eventId` chưa tồn tại và cùng cố insert. Một trong hai sẽ vi phạm unique constraint `event_id` và nhận `409 Conflict` với thông báo `"The submitted eventId has already been recorded."`. Do đó, trong trường hợp race condition, client có thể nhận `201 Created` (lần đầu) hoặc `409 Conflict` (lần bị chặn bởi unique constraint). Client nên xem cả hai mã trạng thái là thành công (sự kiện đã được ghi).

**Ví dụ request:**

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "visitorId": "11111111-1111-4111-8111-111111111111",
  "artifactId": 1,
  "beaconId": null,
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
    "beaconId": null,
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

Với `BEACON_TRIGGER`, request phải gửi `beaconId` lấy từ response resolve; backend kiểm tra beacon enabled, đã gán artifact và artifact khớp `artifactId`.

#### 2.7.2 Beacon resolve và quản trị beacon (Wave 4)

##### GET `/api/beacons/resolve` — public

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uuid` | UUID | Có | Proximity UUID của iBeacon |
| `major` | Integer | Có | `0..65535` |
| `minor` | Integer | Có | `0..65535` |

Không yêu cầu JWT. Trả `404 Not Found` nếu beacon không tồn tại hoặc đang disabled.

**Response `data`:**

```json
{
  "beaconId": 7,
  "name": "Beacon cổng chính",
  "uuid": "e2c56db5-dffb-48d2-b060-d0f5a71096e0",
  "major": 1,
  "minor": 2,
  "enabled": true,
  "artifactId": 42,
  "artifactName": "Trống đồng Đông Sơn",
  "siteId": 3,
  "siteName": "Khu di tích"
}
```

`artifactId`, `artifactName`, `siteId`, `siteName` có thể null nếu beacon chưa được gán hiện vật.

##### `/api/admin/beacons` — ADMIN

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/admin/beacons` | Danh sách beacon |
| `POST` | `/api/admin/beacons` | Tạo beacon, trả `201` |
| `GET` | `/api/admin/beacons/{beaconId}` | Chi tiết beacon |
| `PUT` | `/api/admin/beacons/{beaconId}` | Cập nhật beacon |
| `DELETE` | `/api/admin/beacons/{beaconId}` | Xóa beacon |

`BeaconRequest`: `name` (`@NotBlank`, max 255), `uuid` (`@NotNull`), `major`/`minor` (`0..65535`), `enabled` (optional), `artifactId` (optional, positive).

Lỗi: `400` validation, `404` artifact/beacon không tồn tại, `409` trùng `(uuid, major, minor)`.

#### 2.7.3 GET `/api/analytics/interactions/summary` — thống kê tương tác (ADMIN)

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
| `uniqueVisitors` | long | Số visitor duy nhất (distinct `visitorId`) |
| `interactionTypes` | List | Danh sách `{interactionType, count}` |
| `popularArtifacts` | List | Top 10 artifact phổ biến nhất `{artifactId, artifactName, count}` |

Nếu không có dữ liệu, các danh sách trả về rỗng và các số là 0.

#### 2.7.4 GET `/api/analytics/interactions/timeseries` — chuỗi thời gian theo ngày (ADMIN)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `from` | Instant (ISO-8601) | Có | Thời điểm bắt đầu khoảng lọc |
| `to` | Instant (ISO-8601) | Có | Thời điểm kết thúc khoảng lọc |

Yêu cầu header `Authorization: Bearer <accessToken>` và role `ADMIN`.

**Quy tắc:**
- `from` và `to` đều bắt buộc; thiếu một trong hai trả `400 Bad Request`.
- `from` phải sớm hơn `to`; khoảng không vượt quá **90 ngày**.
- Khoảng lọc là `[from, to)`.
- Mỗi ngày được nhóm theo **UTC calendar date**; response luôn chứa đủ mọi ngày trong khoảng, kể cả ngày không có dữ liệu (giá trị `0`).
- Ngày cuối cùng là UTC date của `to - 1 nanosecond`; nếu `to` là đúng nửa đêm thì ngày đó không thuộc khoảng.

**Response:** `ApiResponse<List<DailyInteractionResponse>>`

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `date` | LocalDate (`YYYY-MM-DD`) | Ngày UTC |
| `totalInteractions` | long | Tổng số sự kiện trong ngày |
| `uniqueVisitors` | long | Số `visitorId` duy nhất trong ngày |

**Ví dụ:**

```http
GET /api/analytics/interactions/timeseries?from=2026-10-01T00:00:00Z&to=2026-10-04T00:00:00Z
Authorization: Bearer <ADMIN_TOKEN>
```

```json
{
  "success": true,
  "message": "Daily interaction time-series retrieved successfully",
  "data": [
    { "date": "2026-10-01", "totalInteractions": 2, "uniqueVisitors": 2 },
    { "date": "2026-10-02", "totalInteractions": 0, "uniqueVisitors": 0 },
    { "date": "2026-10-03", "totalInteractions": 1, "uniqueVisitors": 1 }
  ],
  "timestamp": "...",
  "path": "/api/analytics/interactions/timeseries",
  "errors": null
}
```

#### 2.7.5 GET `/api/analytics/interactions/languages` — thống kê theo ngôn ngữ (ADMIN)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `from` | Instant (ISO-8601) | Có | Thời điểm bắt đầu khoảng lọc |
| `to` | Instant (ISO-8601) | Có | Thời điểm kết thúc khoảng lọc |

Yêu cầu header `Authorization: Bearer <accessToken>` và role `ADMIN`.

**Quy tắc:**
- `from` và `to` đều bắt buộc; `from < to`; khoảng tối đa **90 ngày**; lọc theo `[from, to)`.
- `languageCode` được trim; giá trị null/rỗng được gom vào bucket `UNKNOWN`.
- Kết quả sắp xếp giảm dần theo `interactionCount`, sau đó tăng dần theo `languageCode`.

**Response:** `ApiResponse<List<LanguageCountResponse>>`

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `languageCode` | String | Mã ngôn ngữ đã chuẩn hóa hoặc `UNKNOWN` |
| `interactionCount` | long | Số sự kiện tương ứng |

**Ví dụ:**

```json
{
  "success": true,
  "message": "Language analytics retrieved successfully",
  "data": [
    { "languageCode": "vi", "interactionCount": 3 },
    { "languageCode": "en", "interactionCount": 2 },
    { "languageCode": "UNKNOWN", "interactionCount": 1 }
  ],
  "timestamp": "...",
  "path": "/api/analytics/interactions/languages",
  "errors": null
}
```

---

### 2.8 Visitor Interaction / Analytics / Beacon — trạng thái triển khai

Backend đã có implementation cho `POST /api/interactions`, ba endpoint analytics (`summary`, `timeseries`, `languages`), public beacon resolve và admin beacon CRUD. Mobile ghi `VIEW` khi mở chi tiết hiện vật và `BEACON_TRIGGER` khi foreground beacon discovery xác nhận người dùng vào vùng. Native/device verification của beacon chưa được thực hiện; xem `docs/features/ibeacon-mobile-integration.md`.

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
| `409 Conflict` | Vi phạm ràng buộc dữ liệu hoặc xung đột khi thực hiện thao tác |

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

## 6. Checklist integration smoke test (M1–Wave 4)

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
| 19 | Ghi sự kiện ẩn danh | `POST /api/interactions` không có token, có `visitorId` | `201 Created` |
| 20 | Xem analytics summary (ADMIN) | `GET /api/analytics/interactions/summary?from=..&to=..` + token ADMIN | `200 OK`, `totalInteractions`, `uniqueVisitors`, ... |
| 21 | Xem analytics summary (VISITOR) | `GET /api/analytics/interactions/summary` + token VISITOR | `403 Forbidden` |
| 22 | Xem analytics summary (không token) | `GET /api/analytics/interactions/summary` không có token | `401 Unauthorized` |
| 23 | Analytics range không hợp lệ | `GET /api/analytics/interactions/summary?from=..&to=..` với `from > to` | `400 Bad Request` |
| 24 | Analytics khoảng thời gian > 90 ngày | `GET /api/analytics/interactions/summary?from=..&to=..` > 90 ngày | `400 Bad Request` |
| 25 | Timeseries theo ngày (ADMIN) | `GET /api/analytics/interactions/timeseries?from=..&to=..` + token ADMIN | `200 OK`, đủ mọi ngày UTC, ngày trống có giá trị `0` |
| 26 | Timeseries thiếu tham số | `GET /api/analytics/interactions/timeseries` + token ADMIN | `400 Bad Request` |
| 27 | Timeseries (VISITOR) | `GET /api/analytics/interactions/timeseries?from=..&to=..` + token VISITOR | `403 Forbidden` |
| 28 | Timeseries (không token) | `GET /api/analytics/interactions/timeseries?from=..&to=..` | `401 Unauthorized` |
| 29 | Language analytics (ADMIN) | `GET /api/analytics/interactions/languages?from=..&to=..` + token ADMIN | `200 OK`, sắp xếp count giảm dần |
| 30 | Language analytics bucket UNKNOWN | Ghi sự kiện có `languageCode` null/rỗng rồi gọi languages | `200 OK`, có `UNKNOWN` |
| 31 | Language analytics range sai | `GET /api/analytics/interactions/languages?from=..&to=..` với `from >= to` | `400 Bad Request` |
| 32 | Resolve beacon công khai | `GET /api/beacons/resolve?uuid=..&major=..&minor=..` | `200 OK`, `data.beaconId`, `data.artifactId` |
| 33 | Resolve beacon không tồn tại/disabled | `GET /api/beacons/resolve` với beacon unknown hoặc disabled | `404 Not Found` |
| 34 | Tạo beacon (ADMIN) | `POST /api/admin/beacons` + token ADMIN | `201 Created`, `data.beaconId` |
| 35 | Tạo beacon trùng identity | `POST /api/admin/beacons` cùng `uuid`/`major`/`minor` | `409 Conflict` |
| 36 | Tạo beacon (VISITOR) | `POST /api/admin/beacons` + token VISITOR | `403 Forbidden` |
| 37 | Ghi `BEACON_TRIGGER` hợp lệ | `POST /api/interactions` với `beaconId` đúng artifact | `201 Created`, `data.beaconId` |
| 38 | Ghi `BEACON_TRIGGER` thiếu/sai beacon | `POST /api/interactions` thiếu `beaconId`, beacon disabled hoặc khác artifact | `400 Bad Request` / `404 Not Found` |

---

## 7. Ghi chú cho M3–M5

- M3 (Mobile) tạo `eventId` UUID cho mỗi lượt xem, lưu `visitorId` UUID ổn định trong AsyncStorage, gửi Bearer token nếu có, và ghi `VIEW` khi màn hình chi tiết hiện vật tải thành công. Không ghi từ màn hình mock (yêu thích/lịch sử) và chưa ghi `SCAN`/`AUDIO_PLAY` khi tính năng thật chưa tồn tại.
- M5 (Visitor Interaction / Analytics) đã có implementation backend: entity `VisitorInteraction`, repository, service, controller, DTO, exception handler, và tests. Các endpoint: `POST /api/interactions`, `GET /api/analytics/interactions/summary`, `GET /api/analytics/interactions/timeseries`, `GET /api/analytics/interactions/languages`.
- Timeseries và languages dùng chung quy tắc range `[from, to)`, tối đa 90 ngày và yêu cầu role `ADMIN`. Unique visitors luôn tính theo `visitorId`, không theo `userId`.
- Wave 4 thêm beacon resolve/admin CRUD và `BEACON_TRIGGER`; native build/device verification vẫn là bước tiếp theo, không được suy diễn từ unit tests.
- Nếu M3/M5/Wave 4 cần thêm endpoint, hãy mở PR và cập nhật tài liệu này kèm theo.
