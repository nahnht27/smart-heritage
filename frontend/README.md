# Smart Heritage — Admin Web

Admin Web là giao diện quản trị của nền tảng Smart Heritage, được xây dựng bằng **React**, **TypeScript** và **Vite**.

## 1. Yêu cầu môi trường

- Node.js tương thích với phiên bản Vite được khai báo trong dự án.
- npm.
- Smart Heritage Backend đang chạy nếu cần kiểm thử tích hợp Auth API.

## 2. Cài đặt và chạy dự án

Mở terminal tại thư mục `frontend` rồi chạy:

```bash
npm install
npm run dev
```

Mở URL local được Vite hiển thị trong terminal để truy cập ứng dụng.

## 3. Available Scripts

| Command | Description |
| --- | --- |
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

Trang Dashboard sử dụng `DashboardPage`. Các trang quản lý còn lại hiện sử dụng `PlaceholderPage` để làm khung giao diện cho các giai đoạn phát triển tiếp theo.

Route `/login` nằm ngoài `AdminLayout`. Route gốc `/` được điều hướng về `/dashboard`, còn các route không xác định được điều hướng về `/login`.

## 5. API Configuration

API base URL được đọc từ biến môi trường `VITE_API_BASE_URL`.

Để cấu hình trên máy cá nhân, tạo file `.env.local` trong thư mục `frontend`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Địa chỉ trên chỉ là ví dụ. Thay bằng base URL của Backend trong môi trường đang sử dụng.

Nếu không khai báo biến này, API client sử dụng chuỗi rỗng làm base URL. Hãy cấu hình biến môi trường chính xác trước khi kiểm thử tích hợp API.

Sau khi thay đổi biến môi trường, khởi động lại development server. Không lưu token, mật khẩu hoặc thông tin bí mật trong các biến có tiền tố `VITE_`, vì giá trị của chúng có thể được đưa vào client-side bundle.

## 6. Login và API Client

Login page cung cấp trường username và password, kiểm tra dữ liệu bắt buộc, hiển thị lỗi và trạng thái loading khi submit.

Khi gửi form, trang gọi `authService.login()` tới endpoint:

`POST /api/auth/login`

Request body theo contract hiện tại của frontend:

```json
{
  "username": "...",
  "password": "..."
}
```

Frontend xử lý các tình huống lỗi phổ biến, gồm không kết nối được server, `401` (thông tin đăng nhập không hợp lệ), `403` (không có quyền) và các lỗi khác từ Backend. Chi tiết request/response cần thống nhất với Auth API của Backend trước khi xem tích hợp là hoàn tất.

### Phạm vi hiện tại

- Login đang gửi thông tin đăng nhập tới Auth API của Backend; frontend không tự xác thực bằng một hệ thống riêng.
- Khi đăng nhập thành công, trang hiển thị thông báo `Login successful`.
- Theo phạm vi hiện tại, `accessToken` chưa được lưu, chưa tự động điều hướng sau đăng nhập và các route admin chưa được bảo vệ bằng route guard.
- Việc quản lý session/token, route guard và logout thực sự cần được triển khai ở bước tiếp theo sau khi API contract được xác nhận.
- Giao diện kiểm tra role `ADMIN`; đây chỉ là kiểm tra phía client để hỗ trợ trải nghiệm sử dụng. Backend vẫn phải xác thực danh tính và kiểm tra quyền ở mọi API cần bảo vệ. Không xem kiểm tra phía client là cơ chế phân quyền bảo mật.

### API client

- `src/services/apiClient.ts`: hàm `apiRequest()` dùng chung và lớp `ApiError`; base URL lấy từ `VITE_API_BASE_URL`.
- `src/services/authService.ts`: các hàm gọi Auth API.
- Header xác thực, chẳng hạn `Authorization: Bearer <token>`, có thể được bổ sung vào `apiRequest()` khi contract và luồng session được thống nhất.

### Chạy cùng Backend

Backend cần đang chạy và `VITE_API_BASE_URL` phải trỏ đúng địa chỉ. Nếu trình duyệt báo lỗi CORS khi gọi từ Vite sang Backend, hãy cấu hình CORS ở Backend hoặc thiết lập proxy trong `vite.config.ts` theo cấu hình của nhóm.

## 7. Production Build

Tạo production build bằng lệnh:

```bash
npm run build
```

Các file đầu ra được lưu trong thư mục `dist`. Để preview bản build trên máy local:

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

- `components/layout/`: các component bố cục dùng chung như Admin Layout, Sidebar và Header.
- `config/`: cấu hình môi trường và danh sách navigation.
- `pages/`: Dashboard, Login và các trang quản lý.
- `services/`: API client và authentication service.
- `types/`: TypeScript interfaces dùng chung cho API và authentication.
- `assets/`: hình ảnh và tài nguyên giao diện.

## 9. Notes

- README mô tả cấu trúc và phạm vi hiện tại của Frontend.
- Ngoài Dashboard và Login, các trang quản lý hiện vẫn là placeholder, chưa triển khai business logic.
- Việc tích hợp Auth API phụ thuộc vào Backend đang chạy và `VITE_API_BASE_URL` được cấu hình chính xác.
- Trước khi xác nhận tích hợp hoàn tất, cần kiểm thử request/response thực tế và thống nhất contract với nhóm Backend.
