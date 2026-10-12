# Log: Branch LTJ-42

## Thông tin chung
- **Nhánh (Branch)**: `LTJ-42`
- **Tên Task**: iBeacon/BLE Flow — Technical Investigation
- **Mục tiêu chính**: Xác định và tài liệu hóa luồng kỹ thuật cho iBeacon/BLE trong Visitor App (React Native).

## Các công việc đã hoàn thành

1. **Thiết kế tài liệu iBeacon/BLE Flow**
   - **Tài liệu**: Tạo file `docs/design/07_ibeacon_ble_flow.md`.
   - **Nội dung bao gồm**:

     a. **Cách Mobile Phát Hiện Beacon**
        - Sử dụng tiêu chuẩn iBeacon (UUID + Major + Minor) kết hợp thư viện `react-native-ble-plx` hoặc `react-native-beacon-ranger`.
        - Quét liên tục theo UUID riêng của hệ thống Smart Heritage.
        - Lọc tín hiệu dựa trên ngưỡng RSSI (dBm) để ước tính khoảng cách.

     b. **Beacon → Artifact Mapping**
        - Cấu trúc định danh: `UUID` (toàn hệ thống) + `Major` (khu di sản) + `Minor` (ID hiện vật).
        - API tra cứu: `GET /api/v1/artifacts/by-beacon?major=&minor=`.
        - Đề xuất chiến lược **cache offline** để hoạt động tốt trong môi trường sóng yếu.

     c. **Cơ chế Trigger thông tin hiện vật**
        - Hiển thị **In-App Banner** (không phải OS Push Notification) khi phát hiện người dùng đến gần.
        - Ghi lại vào **Visit History** và gửi `visitor-interaction` lên Backend sau khi trigger.

     d. **Cách Tránh Duplicate Notification**
        - Cơ chế **Debounce Entry** (2 giây): Chỉ trigger sau khi RSSI ổn định.
        - Cơ chế **Cooldown Timer** (5 phút): Mỗi beacon không trigger lại trong vòng 5 phút.
        - Cơ chế **Exit Detection** (3 giây): Reset trạng thái khi người dùng rời khỏi vùng beacon.
        - Quản lý trạng thái bằng `Map<minor, { state, lastNotifiedAt }>` trong bộ nhớ.
