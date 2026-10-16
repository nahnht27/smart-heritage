# Smart Heritage — Admin Web

Admin Web là giao diện quản trị của nền tảng Smart Heritage, được xây dựng bằng **React**, **TypeScript** và **Vite**.

## 1. Yêu cầu môi trường

- Node.js tương thích với phiên bản Vite trong dự án.
- npm.
- Smart Heritage Backend đang chạy nếu cần kiểm thử tích hợp API.

## 2. Cài đặt và chạy dự án

Mở terminal tại thư mục `frontend` và chạy:

```bash
npm install
npm run dev
```

Mở local URL được Vite hiển thị trong terminal để truy cập ứng dụng.

## 3. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Khởi động development server. |
| `npm run build` | Kiểm tra TypeScript và tạo production build. |
| `npm run lint` | Kiểm tra code bằng ESLint. |
| `npm run preview` | Preview production build trên máy local. |

## 4. Admin Layout và Navigation

Ứng dụng sử dụng **React Router** và `AdminLayout` dùng chung, gồm `Sidebar`, `Header` và khu vực hiển thị nội dung chính (`main content area`).

Các mục navigation hiện tại:

- Dashboard
- Heritage Sites
- Artifacts
- Multimedia
- Beacons
- Translations
- Feedback

Trang Dashboard sử dụng `DashboardPage`. Các trang quản lý còn lại hiện sử dụng `PlaceholderPage` để bổ sung chức năng trong các giai đoạn phát triển tiếp theo.

Route `/login` nằm ngoài `AdminLayout`. Route gốc `/` và các route không xác định sẽ redirect đến `/login`.

## 5. API Configuration

API base URL được đọc từ biến môi trường `VITE_API_BASE_URL`.

Để cấu hình trên máy cá nhân, tạo file `.env.local` trong thư mục `frontend`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Thay URL mẫu bằng địa chỉ Backend phù hợp với môi trường đang chạy.

Nếu không khai báo biến này, API client sẽ sử dụng chuỗi rỗng làm base URL. Vì vậy, cần cấu hình biến môi trường chính xác trước khi tích hợp API với Backend.

Sau khi thay đổi environment variables, hãy khởi động lại development server. Không lưu thông tin bí mật trong các biến có tiền tố `VITE_`, vì các giá trị này có thể được đưa vào client-side bundle.

## 6. Login và API Client

Login page cung cấp các trường username và password, kiểm tra dữ liệu bắt buộc, hiển thị lỗi và trạng thái loading.

Hiện tại, chức năng đăng nhập chỉ là UI demo, chưa xác thực với Backend. API client và authentication service đã được chuẩn bị để tích hợp với endpoint dùng chung:

`POST /api/auth/login`

Việc tích hợp thực tế phụ thuộc vào API contract và Backend authentication của dự án.

## 7. Production Build

Tạo production build bằng lệnh:

```bash
npm run build
```

Các file build được lưu trong thư mục `dist`. Để preview bản build trên máy local:

```bash
npm run preview
```

## 8. Project Structure

```text
frontend/
├── public/
├── src/
│   ├── components/
│   │   └── layout/
│   ├── config/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── assets/
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── .gitignore
├── package.json
├── index.html
└── vite.config.ts
```

### Main Directories

- `components/layout/`: Các component bố cục dùng chung như Admin Layout, Sidebar và Header.
- `config/`: Cấu hình môi trường và danh sách navigation.
- `pages/`: Dashboard, Login và các trang quản lý.
- `services/`: API client và authentication service.
- `types/`: Các TypeScript interfaces dùng chung cho API và authentication.
- `assets/`: Hình ảnh và tài nguyên giao diện.

## 9. Notes

- README mô tả cấu trúc và chức năng Frontend hiện tại.
- Ngoài Dashboard và Login, các trang quản lý có thể vẫn là placeholder, chưa triển khai đầy đủ business logic.
- Các chức năng tích hợp API cần Backend đang chạy và `VITE_API_BASE_URL` được cấu hình chính xác.