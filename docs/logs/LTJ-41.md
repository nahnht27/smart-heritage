# Log: Branch LTJ-41

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-41`
- **Tên Task**: Mobile navigation workflow
- **Mục tiêu chính**: Phác thảo luồng điều hướng của Mobile App cho khách tham quan và cấu hình Git ban đầu.

## Các công việc đã hoàn thành

1. **Thiết kế Mobile Navigation Workflow**
   - **Tài liệu**: Tạo file `docs/design/06_mobile_navigation_workflow.md`.
   - **Chi tiết**: 
     - Xây dựng sơ đồ tổng quan luồng điều hướng (Navigation Flow) sử dụng Markdown Mermaid.
     - Mô tả chi tiết luồng di chuyển giữa các màn hình chính bao gồm: Đăng nhập/Đăng ký, Trang chủ (Home), Bản đồ (Map), Danh sách và Chi tiết hiện vật (Artifact), Yêu thích (Favorite) & Lịch sử, Phản hồi (Feedback).
     - Xác định điểm tích hợp (trigger) của iBeacon vào luồng chi tiết hiện vật.

2. **Cập nhật cấu hình `.gitignore`**
   - Tạo mới file `.gitignore` tiêu chuẩn bao quát cho cả Frontend (React Native/Node) và Backend (Java Spring Boot).
   - Đã loại bỏ các thư mục build hoặc rác môi trường như `node_modules/`, `target/`, `.idea/`, `.vscode/`, `.DS_Store`.
   - Đã sửa lỗi đưa nhầm các file tự sinh của Expo (`mobile/.expo/`, `mobile/expo-env.d.ts`) lên Git.

3. **Thao tác Git**
   - Hoàn thiện commit và push nhánh `LTJ-41` lên remote repository (`origin`).
