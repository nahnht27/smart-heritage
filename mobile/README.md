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
# Backend API Base URL
# - Trình duyệt Web / iOS Simulator: http://localhost:8080/api/v1
# - Android Emulator:                http://10.0.2.2:8080/api/v1
# - Thiết bị thật qua Wi-Fi nội bộ:  http://<IP_MAY_TINH>:8080/api/v1
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
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

- Mọi dữ liệu mẫu cho hiện vật, khu di sản đều được tập trung trong file `src/services/mockData.ts`.
- Khi các API của Backend sẵn sàng, chỉ cần gọi thông qua `apiClient` từ `src/services/api.ts` mà không cần sửa cấu trúc navigation.
