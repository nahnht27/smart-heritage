# Smart Heritage — Visitor Mobile App (React Native & Expo)

Ứng dụng di động dành cho khách tham quan (Visitor App) thuộc hệ thống **Smart Heritage**, xây dựng bằng **React Native** kết hợp **Expo Router**.

---

## 1. Yêu cầu hệ thống

- **Node.js**: phiên bản `>= 18.x`
- **npm** hoặc **yarn**
- **Expo Go** (trên điện thoại vật lý) hoặc **Android Studio Emulator** / **iOS Simulator**

---

## 2. Cài đặt & Cấu hình

### Bước 1: Cài đặt dependencies

```bash
cd mobile
npm install
```

### Bước 2: Cấu hình biến môi trường

Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Nội dung `.env` mẫu:

```env
# Backend API Base URL (prefix chuẩn là /api, không phải /api/v1)
# - Trình duyệt Web / iOS Simulator: http://localhost:8080/api
# - Android Emulator:                http://10.0.2.2:8080/api
# - Thiết bị thật qua Wi-Fi nội bộ:  http://<IP_MAY_TINH>:8080/api
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

> **Lưu ý**: Các biến bắt đầu bằng `EXPO_PUBLIC_` sẽ tự động được Expo nhúng vào mã nguồn client khi chạy. Không lưu trữ secret/password cá nhân trong file này.

---

## 3. Khởi chạy ứng dụng

Chạy lệnh start để mở Expo CLI:

```bash
npm start
```

Tại giao diện terminal của Expo:
- Nhấn phím `w` để mở giao diện Web trên trình duyệt.
- Nhấn phím `a` để mở trên Android Emulator (nếu đang chạy).
- Nhấn phím `i` để mở trên iOS Simulator (trên máy macOS).
- Hoặc dùng ứng dụng **Expo Go** trên điện thoại để quét mã QR xuất hiện trên màn hình terminal.

---

## 4. Cấu trúc thư mục

```
mobile/
├── .env.example              # File cấu hình biến môi trường mẫu
├── app.json                  # Cấu hình Expo project
├── package.json              # Danh sách thư viện phụ thuộc
├── tsconfig.json             # Cấu hình TypeScript
└── src/
    ├── app/                  # File-based routing (Expo Router)
    │   ├── _layout.tsx       # Khung điều hướng chung (Navigation Stack)
    │   ├── index.tsx         # Màn hình Đăng nhập (Login Screen)
    │   ├── home.tsx          # Màn hình Trang chủ (Visitor Landing Page)
    │   ├── artifact_list.tsx # Danh sách hiện vật
    │   ├── artifact_detail.tsx # Chi tiết hiện vật
    │   ├── map.tsx           # Bản đồ số khu di sản
    │   ├── favorite.tsx      # Hiện vật yêu thích & Lịch sử tham quan
    │   └── feedback.tsx      # Đánh giá & Góp ý
    ├── services/
    │   ├── api.ts            # Reusable API Client module (fetch wrapper, timeout, auth)
    │   ├── authStorage.ts    # Lưu JWT access token (AsyncStorage)
    │   ├── heritageApi.ts    # Heritage Sites / Artifacts / Multimedia API
    │   ├── interactionApi.ts # Visitor Interaction API (VIEW/AUDIO_PLAY/SCAN)
    │   └── mockData.ts       # Dữ liệu mẫu (chỉ còn dùng cho favorite/feedback)
    ├── components/
    │   └── multimedia-player.tsx # Image/Audio/Video player có xử lý lỗi
    ├── utils/
    │   ├── id.ts             # Sinh UUID cho eventId
    │   └── media.ts          # Chuẩn hóa type media + kiểm tra URL
    └── constants/            # Định nghĩa theme, màu sắc
```

---

## 5. Luồng điều hướng (Navigation Skeleton)

```
[Màn hình Đăng nhập (index)]
          │ (Đăng nhập / Khám phá ngay)
          ▼
 [Trang chủ Di sản (home)]
   ├──> Danh sách hiện vật (artifact_list) ──> Chi tiết hiện vật (artifact_detail)
   ├──> Bản đồ khu di sản (map)
   ├──> Yêu thích & Lịch sử (favorite)
   └──> Đánh giá & Góp ý (feedback)
```

---

## 6. Ghi chú về API Backend & Interaction Tracking

### Endpoint Backend đã tích hợp
- Prefix chuẩn: `/api` (không phải `/api/v1`).
- `POST /api/auth/register`, `POST /api/auth/login` — Đăng ký / đăng nhập.
- `GET /api/users/me`, `PUT /api/users/me` — Profile (cần Bearer token).
- `GET /api/heritage-sites`, `GET /api/heritage-sites/{id}` — Di sản (công khai).
- `GET /api/artifacts`, `GET /api/artifacts?siteId={id}`, `GET /api/artifacts/{id}` — Hiện vật (công khai).
- `GET /api/multimedia?artifactId={id}` — Multimedia (công khai).
- `POST /api/interactions` — Ghi nhận tương tác (Bearer token).

### Luồng nội dung (LTJ-46)
- Home tải danh sách Heritage Site và Artifact từ API thật; chọn địa điểm sẽ truyền `siteId` động sang Artifact List.
- Artifact List hỗ trợ tìm kiếm phía client; khi không có `siteId` sẽ tải toàn bộ artifact thay vì hardcode.
- Artifact Detail hiển thị image/audio/video từ backend, có fallback khi thiếu ảnh, kiểm tra URL và báo lỗi media không phát được.
- Multimedia dùng `expo-audio` và `expo-video` (SDK 57); player tự giải phóng tài nguyên khi unmount.

### Visitor Interaction Tracking (LTJ-47)
- Gọi `POST /api/interactions` với Bearer JWT lấy từ `authStorage`.
- Chỉ dùng `VIEW`, `AUDIO_PLAY`, `SCAN`.
- Payload: `eventId`, `artifactId`, `interactionType`, `languageCode`, `startedAt`, `endedAt`, `interactedAt`. Backend tự xác định user từ JWT và tự tính duration.
- `eventId` được tạo một lần và giữ nguyên khi retry; VIEW chỉ gửi sau khi artifact tải thành công; AUDIO_PLAY chỉ gửi khi audio thực sự phát.
- Backend đã triển khai `POST /api/interactions`: request mới trả `201`, request lặp cùng `eventId` trả `200` với cùng `interactionId`; backend tự tính `durationSeconds`.
- Lỗi gửi event không chặn luồng xem nội dung và không log token.

### Chức năng vẫn dùng Mock Data
- Yêu thích & Lịch sử tham quan (`favorite`) — chưa có API backend.
- Đánh giá & Góp ý (`feedback`) — chỉ hiển thị UI, chưa gọi API.

### iBeacon / BLE
- Tính năng quét beacon/QR thực tế **chưa được tích hợp**, nên `SCAN` chưa được gửi.
- Không có thư viện BLE/iBeacon native trong `package.json`.
