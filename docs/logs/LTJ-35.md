# Log: Branch LTJ-35

## Thông tin chung

- **Branch:** LTJ-35
- **Task:** Heritage Sites, Artifacts and Multimedia Management
- **Sprint:** M4 — Sprint 3: Admin Web Management
- **Goal:** Hoàn thiện giao diện quản lý Heritage Sites, Artifacts và Multimedia, bao gồm các chức năng quản lý dữ liệu, validation và xử lý trạng thái giao diện để chuẩn bị tích hợp với backend API.

## Các công việc đã hoàn thành

### 1. Heritage Sites Management

- Xây dựng giao diện quản lý Heritage Sites.
- Bổ sung validation cho tên di tích và tọa độ địa lý.
- Xử lý các trạng thái loading, error và empty.
- Chuẩn bị giao diện để tích hợp với API quản lý di tích.

### 2. Artifacts Management

- Xây dựng giao diện quản lý Artifacts.
- Bổ sung chức năng tìm kiếm hiện vật và lọc theo Heritage Site ID.
- Xây dựng các luồng Add, View Details, Edit và Delete.
- Tích hợp dropdown lựa chọn Heritage Site từ dữ liệu API.
- Bổ sung validation cho tên hiện vật và Heritage Site được lựa chọn.
- Xử lý các trạng thái loading, error, empty và saving.

### 3. Multimedia Management

- Xây dựng giao diện quản lý Multimedia.
- Xây dựng các luồng Add, View Details, Edit và Delete.
- Tích hợp dropdown lựa chọn Artifact từ dữ liệu API.
- Bổ sung validation cho Artifact ID, type, title và URL.
- Xử lý các trạng thái loading, error, empty và saving.

### 4. Xử lý API và trạng thái giao diện

- Sử dụng API client hiện có của dự án.
- Bổ sung xử lý lỗi khi tải dữ liệu và thực hiện các thao tác quản lý.
- Không sử dụng mock API, dữ liệu giả hoặc thông báo thành công giả.
- Ghi nhận các lỗi API trong quá trình phát triển khi backend chưa sẵn sàng.

## Các công việc chưa hoàn thành

- Chưa kiểm thử CRUD thực tế do backend API chưa sẵn sàng.
- Chưa xác nhận kết quả kiểm thử tích hợp giữa frontend và backend.

## Kết quả đạt được

- Đã xây dựng giao diện quản lý cho ba nhóm dữ liệu: Heritage Sites, Artifacts và Multimedia.
- Các trang đã có form quản lý dữ liệu, validation và xử lý các trạng thái giao diện cơ bản.
- Các dropdown liên kết dữ liệu được thiết kế để lấy danh sách từ API.
- Frontend sử dụng API client hiện có và không phụ thuộc vào dữ liệu giả lập.
- Các chức năng đã được chuẩn bị cho giai đoạn tích hợp và kiểm thử với backend khi API sẵn sàng.
