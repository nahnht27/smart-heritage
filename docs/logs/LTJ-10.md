# Log: Branch LTJ-10

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-10`
- **Tên Task**: Setup React Native wireframe screens
- **Mục tiêu chính**: Khởi tạo cấu trúc dự án React Native (bằng Expo) và phác thảo mã nguồn khung giao diện (wireframe) cho các màn hình chính của Visitor App.

## Các công việc đã hoàn thành

1. **Khởi tạo dự án Mobile (React Native + Expo)**
   - Tạo thư mục `mobile/` và cấu hình các file cơ sở của Expo/React Native như `package.json`, `app.json`, `tsconfig.json`.
   - Thiết lập cấu trúc thư mục quy chuẩn: `src/app/` (sử dụng Expo Router cho điều hướng), `src/components/`, `src/hooks/`, `src/constants/`.
   - Bổ sung sẵn các file assets (ảnh, icons) và thư viện UI cơ bản.

2. **Xây dựng Wireframe Code cho các màn hình chính**
   - Đã tạo các file đại diện cho luồng điều hướng của người dùng:
     - **`src/app/index.tsx`**: Màn hình khởi chạy / Đăng nhập.
     - **`src/app/_layout.tsx`**: Cấu hình Navigation (Stack/Tabs).
     - **`src/app/home.tsx`**: Trang chủ (Home / Heritage Site).
     - **`src/app/artifact_list.tsx` & `src/app/artifact_detail.tsx`**: Trang danh sách và chi tiết hiện vật.
     - **`src/app/map.tsx`**: Trang bản đồ.
     - **`src/app/favorite.tsx`**: Trang lưu trữ mục yêu thích / lịch sử.
     - **`src/app/feedback.tsx`**: Trang phản hồi.
   - *Lưu ý:* Các file này được xây dựng ở mức wireframe (khung Layout cơ bản, giả lập flow) để phục vụ test luồng điều hướng, chưa có UI hoàn chỉnh.

3. **Thiết lập Git Ignore**
   - Thêm file `.gitignore` ở thư mục gốc (root) cũng như trong thư mục `mobile/`.
   - Loại bỏ các file rác tự sinh, bộ nhớ đệm (cache), và `node_modules/` để giữ repository gọn nhẹ.
