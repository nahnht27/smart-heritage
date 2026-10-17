# Log: Branch LTJ-24

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-24`
- **Tên Task**: Implement initial Login/Home screens for MOBILE APP
- **Mục tiêu chính**: Hiện thực hóa màn hình Đăng nhập (Login) và Trang chủ (Home) theo đúng chuẩn giao diện dành cho khách tham quan (Visitor App), tích hợp validation, xử lý các trạng thái loading/error và hiển thị dữ liệu mẫu tách biệt theo yêu cầu Sprint 2.

## Các công việc đã hoàn thành

1. **Màn hình Đăng nhập (Login Screen — `mobile/src/app/index.tsx`)**
   - **Giao diện nhận diện thương hiệu**: Header mang phong cách di sản (`#0F172A`), biểu tượng ứng dụng và lời chào thân thiện.
   - **Trường nhập liệu**:
     - Email hoặc Tên đăng nhập.
     - Mật khẩu kèm nút bật/tắt ẩn hiện mật khẩu (Eye toggle).
   - **Cơ chế Validation**:
     - Kiểm tra không được để trống trường đăng nhập.
     - Kiểm tra định dạng email hợp lệ nếu người dùng nhập email.
     - Kiểm tra độ dài mật khẩu tối thiểu 6 ký tự.
     - Hiển thị thông báo lỗi chi tiết ngay dưới từng trường nhập liệu.
   - **Quản lý trạng thái (State Management)**:
     - Trạng thái `isLoading`: Hiển thị `ActivityIndicator` và vô hiệu hóa nút bấm khi người dùng nhấn Đăng nhập.
     - Banner thông báo lỗi chung (`errorBanner`) khi xảy ra lỗi.
   - **Luồng xác thực**:
     - Tuân thủ phạm vi Sprint 2: Xác thực giả lập UI-only (không tự tạo cơ chế backend riêng; sẵn sàng gắn API auth chính thức của M1 khi có contract).
     - Cung cấp nút *"Tiếp tục với tư cách Khách tham quan →"* cho phép du khách vào thẳng trang chủ trải nghiệm ứng dụng mà không bắt buộc đăng nhập.

2. **Màn hình Trang chủ (Home Screen — `mobile/src/app/home.tsx`)**
   - **Landing Page Khu di sản**: Hiển thị Banner tổng quan của *Bảo tàng Lịch sử Quốc gia* (tên, slogan, địa chỉ, giờ mở cửa) kết nối từ `mockData.ts`.
   - **Trạng thái iBeacon Radar**: Thẻ trạng thái mô phỏng radar BLE đang quét tìm hiện vật xung quanh (chuẩn bị cho tích hợp BLE ở Sprint 3).
   - **Lưới điều hướng nhanh (Quick Actions)**:
     - 🏛️ Hiện vật (`/artifact_list`)
     - 🗺️ Bản đồ số (`/map`)
     - ⭐ Yêu thích & Lịch sử (`/favorite`)
     - ✍️ Đánh giá & Góp ý (`/feedback`)
   - **Bảo vật Tiêu biểu (Featured Artifacts)**:
     - Hiển thị danh sách hiện vật nổi bật (Trống Đồng Đông Sơn, Kiếm Cổ Thời Trần, Bình Gốm Chu Đậu).
     - Có gắn nhãn **`Mock Data`** rõ ràng theo đúng tiêu chí Definition of Done.
     - Click vào từng hiện vật sẽ điều hướng sang màn hình Chi tiết hiện vật kèm tham số ID và tên.
   - **Tác vụ tài khoản**: Nút đăng xuất / chuyển tài khoản quay về màn hình Login.

3. **Tích hợp đồng bộ các màn hình phụ**
   - Cập nhật [artifact_list.tsx](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/src/app/artifact_list.tsx) và [artifact_detail.tsx](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/src/app/artifact_detail.tsx) để sử dụng dữ liệu chuẩn từ `mockData.ts` (có hình ảnh, niên đại, phân loại, vị trí trưng bày trong bảo tàng).
   - Cập nhật [favorite.tsx](file:///c:/Users/ADMIN/Documents/smart-heritage/mobile/src/app/favorite.tsx) hiển thị danh sách yêu thích và lịch sử tham quan mẫu.

4. **Kiểm thử kỹ thuật**
   - Chạy kiểm tra tĩnh TypeScript bằng lệnh `npx tsc --noEmit` đạt kết quả: **0 lỗi**.
