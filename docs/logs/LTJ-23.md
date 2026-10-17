# Log: Branch LTJ-23

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-23`
- **Tên Task**: React Native project setup and navigation skeleton
- **Mục tiêu chính**: Hoàn thiện cấu trúc dự án React Native (Expo Router), thiết lập khung điều hướng (Navigation Skeleton), chuẩn bị module API Client tái sử dụng và tách biệt Mock Data theo yêu cầu Sprint 2.

## Các công việc đã hoàn thành

1. **Khung điều hướng đồng bộ (Navigation Skeleton)**
   - Cập nhật [mobile/src/app/_layout.tsx](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/src/app/_layout.tsx) với Expo Router Stack:
     - Header mang phong cách di sản (`#1E293B` Deep Navy, font chữ rõ ràng, nút quay lại đồng bộ).
     - Đầy đủ các route: `index` (Login), `home` (Trang chủ), `artifact_list`, `artifact_detail`, `map`, `favorite`, `feedback`.
     - Ẩn header mặc định tại trang Login để thiết kế giao diện landing/welcome chuyên nghiệp; khóa nút back quay lại Login từ Home.

2. **Xây dựng module API Client tái sử dụng (`api.ts`)**
   - Tạo file [mobile/src/services/api.ts](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/src/services/api.ts):
     - Đọc URL backend từ biến môi trường `EXPO_PUBLIC_API_BASE_URL`.
     - Tự động fallback thông minh theo môi trường (Android Emulator: `10.0.2.2:8080`, Web/iOS: `localhost:8080`).
     - Hỗ trợ đầy đủ các phương thức HTTP: `get`, `post`, `put`, `patch`, `delete`.
     - Tích hợp timeout handling (AbortController) và chuẩn hóa định dạng kết quả/mã lỗi.
     - Sẵn sàng nhận JWT Token trong header `Authorization: Bearer <token>` mà không cần hard-code thông tin nhạy cảm.

3. **Tách biệt dữ liệu mẫu (Mock Data)**
   - Tạo file [mobile/src/services/mockData.ts](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/src/services/mockData.ts):
     - Tách riêng toàn bộ dữ liệu mẫu cho khu di sản (`MOCK_HERITAGE_SITE`), hiện vật tiêu biểu (`MOCK_ARTIFACTS`), lịch sử tham quan (`MOCK_VISIT_HISTORY`) và mục yêu thích (`MOCK_FAVORITES`).
     - Đảm bảo mã nguồn UI không bị trộn lẫn dữ liệu cứng, dễ dàng chuyển sang gọi API thật ở các sprint sau.

4. **Cấu hình môi trường & Tài liệu hướng dẫn**
   - Tạo [mobile/.env.example](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/.env.example) hướng dẫn cấu hình `EXPO_PUBLIC_API_BASE_URL`.
   - Cập nhật toàn diện [mobile/README.md](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/README.md) gồm: yêu cầu hệ thống, các bước cài đặt `npm install`, cấu hình `.env`, lệnh khởi chạy `npm start`, cây thư mục và sơ đồ luồng điều hướng.
