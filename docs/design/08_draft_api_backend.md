# Draft API — Java Backend (M3 Sprint 1)

Tài liệu này xác định các API cần thiết cho Backend (Java Spring Boot) phục vụ Visitor App.
Đây là bản **Draft** — chưa cần implement đầy đủ, chỉ cần xác định contract để Mobile và Backend phát triển song song.

---

## Quy ước chung

- **Base URL**: `/api/v1`
- **Auth**: JWT Bearer Token trong header `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Phân trang**: `?page=0&size=20` (Spring Pageable)
- **Mã lỗi chuẩn**:

| HTTP Status | Ý nghĩa |
|---|---|
| `200 OK` | Thành công |
| `201 Created` | Tạo mới thành công |
| `400 Bad Request` | Dữ liệu đầu vào không hợp lệ |
| `401 Unauthorized` | Chưa xác thực |
| `403 Forbidden` | Không có quyền |
| `404 Not Found` | Không tìm thấy tài nguyên |

---

## 1. Beacon API

Quản lý iBeacon device và ánh xạ Beacon → Artifact.

### 1.1 Lấy thông tin Artifact theo Beacon signal

```
GET /api/v1/artifacts/by-beacon
```

**Query params:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `uuid` | string | ✅ | UUID của beacon (nhận dạng hệ thống) |
| `major` | int | ✅ | Major ID của beacon (định danh Heritage Site) |
| `minor` | int | ✅ | Minor ID của beacon (định danh Artifact) |

> **Lý do bổ sung `uuid`**: Khóa tra cứu beacon phải là tổ hợp `UUID + major + minor` — nhất quán với logic duplicate-prevention phía Mobile. Dùng chỉ `major + minor` có thể xảy ra xung đột nếu nhiều hệ thống cùng triển khai beacon có giá trị minor trùng nhau.

**Response `200 OK`:**
```json
{
  "artifactId": 101,
  "name": "Trống Đồng Đông Sơn",
  "shortDescription": "Hiện vật tiêu biểu của văn hóa Đông Sơn...",
  "thumbnailUrl": "https://cdn.example.com/artifacts/101/thumb.jpg",
  "heritageId": 1,
  "heritageName": "Bảo tàng Lịch sử Quốc gia"
}
```

---

### 1.2 Lấy danh sách tất cả Beacon (Admin)

```
GET /api/v1/admin/beacons
```

**Response `200 OK`:**
```json
[
  {
    "beaconId": 1,
    "uuid": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
    "major": 1,
    "minor": 101,
    "artifactId": 101,
    "heritageId": 1,
    "location": "Phòng trưng bày A - Tủ số 3",
    "status": "ACTIVE"
  }
]
```

---

### 1.3 Tạo mới Beacon (Admin)

```
POST /api/v1/admin/beacons
```

**Request body:**
```json
{
  "uuid": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
  "major": 1,
  "minor": 101,
  "artifactId": 101,
  "location": "Phòng trưng bày A - Tủ số 3"
}
```

**Response `201 Created`:**
```json
{
  "beaconId": 1,
  "message": "Beacon created successfully"
}
```

---

### 1.4 Cập nhật Beacon (Admin)

```
PUT /api/v1/admin/beacons/{beaconId}
```

### 1.5 Xóa Beacon (Admin)

```
DELETE /api/v1/admin/beacons/{beaconId}
```

---

## 2. Visitor Interaction API

Ghi nhận mỗi lần Visitor tương tác với hệ thống (được trigger bởi Beacon hoặc thao tác thủ công).

### 2.1 Bắt đầu tương tác (BEACON_TRIGGER / MANUAL_VIEW)

```
POST /api/v1/visitor-interactions
```

**Mô tả**: Gọi khi người dùng bước vào vùng beacon hoặc chủ động mở màn hình hiện vật. Ghi nhận `startedAt` và trả về `interactionId` để dùng khi kết thúc tương tác.

**Request body:**
```json
{
  "artifactId": 101,
  "interactionType": "BEACON_TRIGGER",
  "beaconUuid": "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
  "beaconMajor": 1,
  "beaconMinor": 101,
  "startedAt": "2026-10-09T14:30:00Z"
}
```

> **Khi nào gọi**: Ngay khi In-App Banner được hiển thị (BEACON_TRIGGER) hoặc khi người dùng điều hướng đến ArtifactDetail (MANUAL_VIEW).

**`interactionType` enum:**

| Giá trị | Mô tả |
|---|---|
| `BEACON_TRIGGER` | Tự động trigger khi phát hiện iBeacon |
| `MANUAL_VIEW` | Người dùng chủ động mở màn hình Artifact |
| `FAVORITE_ADD` | Người dùng thêm vào Yêu thích |
| `FAVORITE_REMOVE` | Người dùng bỏ Yêu thích |

**Response `201 Created`:**
```json
{
  "interactionId": 5021,
  "message": "Interaction started"
}
```

---

### 2.2 Ghi nhận thời lượng xem (kết thúc tương tác)

```
PATCH /api/v1/visitor-interactions/{interactionId}/end
```

**Mô tả**: Gọi khi người dùng rời khỏi màn hình ArtifactDetail (onUnmount / background) để ghi nhận thời gian thực tế xem nội dung. M5/Analytics dùng `durationSeconds` này tính avg dwell time.

**Request body:**
```json
{
  "endedAt": "2026-10-09T14:32:07Z",
  "durationSeconds": 127
}
```

> **Lưu ý**: `durationSeconds` = `endedAt - startedAt`. Mobile tự tính rồi gửi lên; Backend có thể xác minh lại so với `startedAt` đã lưu. Nếu app bị kill giữa chừng, gọi endpoint này từ `onAppStateChange` (background) với dỏ liệu best-effort.

**Response `200 OK`:**
```json
{
  "interactionId": 5021,
  "durationSeconds": 127,
  "message": "Interaction completed"
}
```

---

### 2.2 Lấy thống kê tương tác (Admin)

```
GET /api/v1/admin/interactions?artifactId=101&startDate=2026-01-01&endDate=2026-12-31
```

**Response `200 OK`:**
```json
{
  "artifactId": 101,
  "totalViews": 342,
  "beaconTriggers": 280,
  "manualViews": 62,
  "avgDurationSeconds": 127
}
```

---

## 3. Visit History API

Lịch sử các Artifact mà Visitor đã tiếp cận (qua Beacon hoặc xem thủ công).

### 3.1 Lấy lịch sử của Visitor đang đăng nhập

```
GET /api/v1/me/history?page=0&size=20
```

**Response `200 OK`:**
```json
{
  "content": [
    {
      "historyId": 201,
      "artifactId": 101,
      "artifactName": "Trống Đồng Đông Sơn",
      "thumbnailUrl": "https://cdn.example.com/artifacts/101/thumb.jpg",
      "visitedAt": "2026-10-09T14:30:00Z",
      "interactionType": "BEACON_TRIGGER"
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "currentPage": 0
}
```

---

### 3.2 Xóa một mục trong lịch sử

```
DELETE /api/v1/me/history/{historyId}
```

**Response `200 OK`:**
```json
{
  "message": "History entry deleted"
}
```

---

### 3.3 Xóa toàn bộ lịch sử

```
DELETE /api/v1/me/history
```

---

## 4. Favorite API

Quản lý danh sách Artifact yêu thích của Visitor.

### 4.1 Lấy danh sách Yêu thích

```
GET /api/v1/me/favorites?page=0&size=20
```

**Response `200 OK`:**
```json
{
  "content": [
    {
      "favoriteId": 55,
      "artifactId": 101,
      "artifactName": "Trống Đồng Đông Sơn",
      "thumbnailUrl": "https://cdn.example.com/artifacts/101/thumb.jpg",
      "savedAt": "2026-10-08T10:00:00Z"
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "currentPage": 0
}
```

---

### 4.2 Thêm Artifact vào Yêu thích

```
POST /api/v1/me/favorites
```

**Request body:**
```json
{
  "artifactId": 101
}
```

**Response `201 Created`:**
```json
{
  "favoriteId": 55,
  "message": "Added to favorites"
}
```

---

### 4.3 Xóa Artifact khỏi Yêu thích

```
DELETE /api/v1/me/favorites/{artifactId}
```

**Response `200 OK`:**
```json
{
  "message": "Removed from favorites"
}
```

---

## 5. Tổng hợp endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/artifacts/by-beacon` | ✅ | Lấy artifact theo beacon signal (uuid+major+minor) |
| `GET` | `/api/v1/admin/beacons` | Admin | Danh sách beacon |
| `POST` | `/api/v1/admin/beacons` | Admin | Tạo beacon mới |
| `PUT` | `/api/v1/admin/beacons/{id}` | Admin | Cập nhật beacon |
| `DELETE` | `/api/v1/admin/beacons/{id}` | Admin | Xóa beacon |
| `POST` | `/api/v1/visitor-interactions` | ✅ | Bắt đầu tương tác, lấy `interactionId` |
| `PATCH` | `/api/v1/visitor-interactions/{id}/end` | ✅ | Kết thúc tương tác, ghi `durationSeconds` |
| `GET` | `/api/v1/admin/interactions` | Admin | Thống kê tương tác (Analytics) |
| `GET` | `/api/v1/me/history` | ✅ | Lịch sử tham quan |
| `DELETE` | `/api/v1/me/history/{id}` | ✅ | Xóa 1 mục lịch sử |
| `DELETE` | `/api/v1/me/history` | ✅ | Xóa toàn bộ lịch sử |
| `GET` | `/api/v1/me/favorites` | ✅ | Danh sách yêu thích |
| `POST` | `/api/v1/me/favorites` | ✅ | Thêm yêu thích |
| `DELETE` | `/api/v1/me/favorites/{artifactId}` | ✅ | Xóa yêu thích |

> **Quy ước URL**: Tất cả endpoint tuân theo prefix `/api/v1/` thống nhất với M2/M4/M5. Admin-only endpoint đặt dưới `/api/v1/admin/`. Endpoint của Visitor đặt dưới `/api/v1/me/` (cá nhân hóa) hoặc `/api/v1/` (tài nguyên chung).
