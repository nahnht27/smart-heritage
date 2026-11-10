# Log: Branch LTJ-48

## Thông tin chung

- **Branch:** LTJ-48
- **Task:** Admin Analytics Dashboard
- **Sprint:** M4 — Sprint 4: End-to-End Integration & Core Business Features
- **Mục tiêu chính:** Xây dựng trang Analytics Dashboard cho quản trị viên theo dõi hành vi và mức độ tương tác của khách tham quan, tích hợp dữ liệu thực tế từ module M5 của Backend.

## 1. Hợp đồng backend và API service

### 1.1. Endpoint và quyền truy cập

- Endpoint: `GET /api/analytics/interactions/summary`.
- Yêu cầu role `ADMIN`; request không đủ quyền nhận HTTP 403.
- Controller: `VisitorInteractionController.getSummary`.
- Service: `VisitorInteractionService.getSummary`.

### 1.2. Tham số thời gian

- `from`, `to` là `Instant`, nhận chuỗi ISO-8601 (ví dụ `2026-11-01T00:00:00Z`).
- `from` và `to` phải được truyền cùng nhau; chỉ truyền một tham số trả về HTTP 400.
- Backend yêu cầu `from < to` và khoảng thời gian không vượt quá 90 ngày.
- Truy vấn dùng khoảng nửa mở `[from, to)` trên trường `interactedAt`.
- Không truyền `from`/`to` là chế độ All Time: backend dùng biên không giới hạn và trả `from = null`, `to = null` trong response.

### 1.3. Response fields

Response nằm trong `ApiResponse<InteractionSummaryResponse>` với các trường:

- `from`, `to`: `Instant | null`.
- `totalInteractions`: tổng số interaction trong khoảng.
- `uniqueVisitors`: số lượng visitor duy nhất.
- `interactionTypes`: danh sách `{ interactionType, count }`.
- `popularArtifacts`: tối đa 10 phần tử `{ artifactId, artifactName, interactionCount }`.

### 1.4. Unique visitor và interaction type

- `uniqueVisitors` lấy trực tiếp từ backend aggregation `count(distinct i.visitorId)` trên cột `visitor_interaction.visitor_id`.
- Đây là UUID định danh visitor (anonymous/install-scoped), **không phải** `user_id` và không phải số lượng tài khoản đăng nhập.
- Event của người dùng đã đăng nhập vẫn mang `visitor_id`, nên unique visitor vẫn được tính theo visitor identity này.
- Backend không có enum Java cho interaction type. `interactionType` là `String`, được validate bằng regex `(?i:VIEW|AUDIO_PLAY|SCAN|BEACON_TRIGGER)` và chuẩn hóa uppercase trước khi lưu.
- Các giá trị hợp lệ hiện tại: `VIEW`, `AUDIO_PLAY`, `SCAN`, `BEACON_TRIGGER`.
- Frontend xử lý an toàn interaction type lạ: giữ nguyên label gốc và dùng style/icon fallback `other`, không làm crash dashboard.

### 1.5. API service

- `getInteractionSummary(params)` gọi endpoint trên.
- Chỉ thêm query `from` và `to` khi cả hai cùng tồn tại.
- Chuẩn hóa response với giá trị mặc định an toàn khi thiếu `data`.

## 2. Giao diện Analytics Dashboard (`src/pages/DashboardPage.tsx`, `src/pages/DashboardPage.css`)

- **4 thẻ chỉ số KPI chính:**
  - **Total Interactions:** Tổng số sự kiện tương tác của khách tham quan trong kỳ.
  - **Unique Visitors:** Số visitor duy nhất theo backend `distinct visitor_id`.
  - **Avg. Engagement:** Tỉ lệ tương tác trung bình trên mỗi visitor, tính từ `totalInteractions / uniqueVisitors`.
  - **Top Interaction Type:** Loại tương tác phổ biến nhất kèm tỉ lệ phần trăm `%`.
- **Bộ lọc thời gian (Date Range Filter):**
  - Preset: `Last 7 Days`, `Last 30 Days` (mặc định), `Last 90 Days`, `All Time`.
  - Preset N ngày bao gồm hôm nay; khoảng gửi backend là N ngày trọn vẹn.
  - Custom range chọn ngày bắt đầu/kết thúc theo UTC; ngày kết thúc hiển thị là inclusive và được chuyển thành `to` exclusive là đầu ngày kế tiếp.
  - Single-day range hợp lệ; đúng 90 ngày inclusive được chấp nhận; 91 ngày bị chặn.
  - `All Time` không gửi `from`/`to` và hiển thị “All recorded history”.
  - Hiển thị khoảng thời gian đang thống kê theo UTC.
- **Biểu đồ phân loại tương tác:**
  - Stacked segment bar và breakdown list cho từng loại interaction.
  - Hỗ trợ `VIEW`, `AUDIO_PLAY`, `SCAN`, `BEACON_TRIGGER`; loại lạ dùng fallback an toàn.
- **Bảng xếp hạng Top 10 Hiện vật:**
  - Hiển thị tên, `ID: #...`, số lượt tương tác và thanh so sánh tương đối với hiện vật top 1.
  - Huy hiệu thứ hạng #1 vàng, #2 bạc, #3 đồng, #4–#10.
- **Trạng thái UX:**
  - Loading skeleton, empty state, error state kèm Retry.
  - Cảnh báo riêng khi backend trả 403.
  - Refresh thủ công; request khởi tạo được deduplicate trong React StrictMode.

## 3. Kiểm thử và xác minh

- Service tests: `src/services/__tests__/analyticsService.test.ts` — 3 tests.
- Dashboard component tests: `src/pages/__tests__/DashboardPage.test.tsx` — 12 tests, bao gồm:
  - tải dữ liệu, empty state, error retry, 403 forbidden;
  - preset và custom range;
  - giới hạn 90 ngày, single-day, inclusive end;
  - refresh;
  - `BEACON_TRIGGER`;
  - chống request trùng trong StrictMode.
- Toàn bộ frontend test suite: 48/48 tests passed.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: pass.
- Backend unit tests trên branch LTJ-48: 117 passed, 0 failed.
- PostgreSQL integration tests: 22 passed, 0 failed.
- Backend được chạy bằng Docker Maven 3.9 + Temurin 17 do máy host không có Java/JAVA_HOME.

## Kết quả đạt được

- Dashboard dùng dữ liệu thật từ endpoint analytics hiện tại, không dùng mock data trong UI.
- Contract thời gian, unique visitor và interaction type được ghi nhận đúng theo implementation backend.
- Quản trị viên theo dõi được các chỉ số tương tác thực tế và xử lý được trạng thái lỗi/phân quyền.
