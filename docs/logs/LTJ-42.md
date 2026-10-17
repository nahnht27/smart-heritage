# Log: Branch LTJ-42

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-42`
- **Tên Task**: iBeacon/BLE Flow — Technical Investigation
- **Mục tiêu chính**: Xác định và tài liệu hóa luồng kỹ thuật cho iBeacon/BLE trong Visitor App (React Native).

## Các công việc đã hoàn thành

1. **Thiết kế tài liệu iBeacon/BLE Flow**
   - **Tài liệu**: Tạo file `docs/design/07_ibeacon_ble_flow.md`.
   - **Nội dung bao gồm**:

     a. **Cách Mobile Phát Hiện Beacon & Thư viện**
        - Sử dụng tiêu chuẩn iBeacon (UUID + Major + Minor).
        - Làm rõ hạn chế của `react-native-ble-plx` (không hỗ trợ iBeacon chuyên biệt, cần tự parse raw packet, chưa xác minh trên thiết bị thật).
        - Đề xuất thư viện khả thi hơn: `react-native-beacons-manager`, đồng thời xác định yêu cầu bắt buộc phải dùng **Expo Development Build** (native build) thay vì Expo Go.
        - Quét liên tục theo UUID riêng của hệ thống Smart Heritage.
        - Lọc tín hiệu dựa trên ngưỡng RSSI (dBm) để ước tính khoảng cách.

     b. **Beacon → Artifact Mapping**
        - Cấu trúc định danh: `UUID` (toàn hệ thống) + `Major` (khu di sản) + `Minor` (ID hiện vật).
        - API tra cứu: `GET /api/v1/artifacts/by-beacon?uuid=&major=&minor=`.
        - Đề xuất chiến lược **cache offline** để hoạt động tốt trong môi trường sóng yếu.

     c. **Cơ chế Trigger thông tin hiện vật**
        - Hiển thị **In-App Banner** (không phải OS Push Notification) khi phát hiện người dùng đến gần.
        - Ghi lại vào **Visit History** và gửi `visitor-interaction` lên Backend sau khi trigger.

     d. **Cách Tránh Duplicate Notification**
        - Cơ chế **Debounce Entry** (2 giây): Chỉ trigger sau khi RSSI ổn định.
        - Cơ chế **Exit Detection** (3 giây): Người dùng phải rời khỏi vùng (RSSI dưới ngưỡng) rồi đi vào lại mới được trigger tiếp. Không trigger lại theo cooldown nếu vẫn đứng yên trong vùng.
        - Quản lý trạng thái bằng khóa phức hợp: `Map<"UUID:major:minor", { state, notifiedAt }>` trong bộ nhớ, tránh xung đột giữa các beacon.
