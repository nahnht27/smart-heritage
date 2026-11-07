# Smart Heritage — Visitor Mobile App (React Native & Expo)

Ứng dụng di động dành cho khách tham quan (Visitor App) thuộc hệ thống **Smart Heritage**, xây dựng bằng **React Native** kết hợp **Expo Router**.

---

## 1. Yêu cầu hệ thống

- **Node.js**: phiên bản `>= 18.x`
- **npm** hoặc **yarn**
- **Expo Go** cho UI không dùng native BLE.
- **Native development build** (`npx expo run:android` / `npx expo run:ios`) cho iBeacon/BLE.
- **Android Studio Emulator** hoặc **iOS Simulator**; beacon cần thiết bị BLE thật để kiểm chứng.

---

## 2. Cài đặt & Cấu hình

### Bước 1: Cài đặt dependencies

```bash
cd mobile
npm install --legacy-peer-deps
```

`--legacy-peer-deps` là cần thiết do xung đột peer có sẵn giữa `@babel/preset-env@8` và `@babel/core@7`.

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

# UUID của iBeacon fleet; bỏ trống để dùng mặc định trong code.
# EXPO_PUBLIC_BEACON_UUID=E2C56DB5-DFFB-48D2-B060-D0F5A71096E0
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

> **Quan trọng:** Expo Go không chạy được native BLE/iBeacon. Để kiểm thử beacon, tạo development build:
>
> ```bash
> cd mobile
> npx expo run:android
> ```
>
> iOS cần macOS/Xcode. Xem hướng dẫn kiểm thử thiết bị trong [`docs/features/ibeacon-mobile-integration.md`](../docs/features/ibeacon-mobile-integration.md).

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
    │   ├── beacon/           # iBeacon parsing, trigger state machine, native wrapper, API
    │   └── mockData.ts       # Dữ liệu mẫu (tách biệt rõ ràng với API thật)
    ├── components/           # Các component UI tái sử dụng
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

## 6. Ghi chú về Mock Data & API Backend

### Endpoint Backend M1 (đã tích hợp)
- Prefix chuẩn: `/api` (không phải `/api/v1`).
- `POST /api/auth/register` — Đăng ký (body: `username`, `email`, `password`).
- `POST /api/auth/login` — Đăng nhập (body: `username`, `password`); trả về `accessToken`.
- `GET /api/users/me` — Lấy profile (cần Bearer token).
- `PUT /api/users/me` — Cập nhật profile (cần Bearer token).

### Chức năng vẫn dùng Mock Data (chưa có API backend trong M1)
- Danh sách / Chi tiết hiện vật (`artifact_list`, `artifact_detail`).
- Yêu thích & Lịch sử tham quan (`favorite`).
- Đánh giá & Góp ý (`feedback`) — chỉ hiển thị UI, chưa gọi API.
- Tất cả dữ liệu mẫu tập trung trong `src/services/mockData.ts`, rõ ràng tách biệt với API thật.

### iBeacon / BLE (Wave 4)
- Foreground discovery đã được tích hợp qua `react-native-beacon-kit@0.12.0` và `react-native-permissions@5.6.3`.
- Home có toggle “Khám phá bằng beacon”; khi bật, app xin quyền Bluetooth/vị trí, quét iBeacon và resolve qua `GET /api/beacons/resolve`.
- Banner trong app cho phép mở chi tiết hiện vật; app ghi `BEACON_TRIGGER` với `beaconId`.
- Native permissions được cấu hình bởi `plugins/with-beacon-permissions.js`.
- Background scanning và foreground service **chưa triển khai**.
- Native build/device verification **chưa chạy** trong môi trường hiện tại; không dùng Expo Go để kết luận beacon hoạt động.
- Chi tiết: [`docs/features/ibeacon-mobile-integration.md`](../docs/features/ibeacon-mobile-integration.md).

### Cấu trúc thư mục (bổ sung)
```
mobile/
    ├── services/
    │   ├── api.ts            # Reusable API Client (fetch wrapper, timeout, auth header)
    │   ├── authStorage.ts    # Lưu JWT access token (AsyncStorage)
    │   ├── beacon/           # iBeacon parsing, trigger, native wrapper, resolve API
    │   └── mockData.ts       # Dữ liệu mẫu (tách biệt rõ ràng với API thật)
```
