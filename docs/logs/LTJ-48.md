# Log: Branch LTJ-48

## Thông tin chung

- **Branch:** LTJ-48
- **Task:** Admin Analytics Dashboard
- **Sprint:** M4 — Sprint 4: End-to-End Integration & Core Business Features
- **Mục tiêu chính:** Xây dựng trang Analytics Dashboard cho quản trị viên theo dõi hành vi và mức độ tương tác của khách tham quan, tích hợp dữ liệu thực tế từ module M5 của Backend.

## Các công việc đã hoàn thành

### 1. Định nghĩa kiểu dữ liệu & API Service (`src/types/analytics.ts`, `src/services/analyticsService.ts`)

- Phân tích và đối chiếu chính xác cấu trúc DTO từ backend (`InteractionSummaryResponse.java`, `InteractionTypeCountResponse.java`, `PopularArtifactResponse.java`).
- Định nghĩa các interface TypeScript: `InteractionSummary`, `InteractionTypeCount`, `PopularArtifact` (đảm bảo đúng tên trường `interactionCount` thay vì `count` để tránh lỗi `undefined`).
- Xây dựng service `getInteractionSummary(params)` tích hợp endpoint `GET /api/analytics/interactions/summary`.
- Xử lý tham số truy vấn `from` và `to` theo định dạng chuẩn ISO-8601 UTC string (`YYYY-MM-DDTHH:mm:ssZ`).

### 2. Giao diện Analytics Dashboard (`src/pages/DashboardPage.tsx`, `src/pages/DashboardPage.css`)

- **4 thẻ chỉ số KPI chính:**
  - **Total Interactions:** Tổng số sự kiện tương tác của khách tham quan trong kỳ.
  - **Unique Visitors:** Số lượng khách tham quan duy nhất (`distinct user_id`).
  - **Avg. Engagement:** Tỉ lệ tương tác trung bình trên mỗi du khách.
  - **Top Interaction Type:** Loại tương tác phổ biến nhất kèm tỉ lệ phần trăm `%`.
- **Bộ lọc thời gian (Date Range Filter):**
  - Cung cấp các nút preset chọn nhanh: `Last 7 Days`, `Last 30 Days` (mặc định), `Last 90 Days`, `All Time`.
  - Hỗ trợ chọn ngày tùy chỉnh (`From` - `To`) với các nút `Apply` và `Reset`.
  - Validate ràng buộc nghiêm ngặt theo backend contract: chặn chọn ngày bắt đầu lớn hơn hoặc bằng ngày kết thúc (`from >= to`), chặn khoảng thời gian vượt quá **90 ngày**.
  - Hiển thị rõ ràng khoảng thời gian đang được thống kê (theo chuẩn UTC đồng bộ với server).
- **Biểu đồ phân loại tương tác (Interaction Breakdown):**
  - Thanh phân bổ tổng hợp (Stacked segment bar) trực quan với màu sắc riêng cho từng loại tương tác (`VIEW`, `AUDIO_PLAY`, `SCAN`).
  - Danh sách chi tiết từng loại kèm số lượt, tỉ lệ phần trăm và thanh tiến trình (progress bar).
- **Bảng xếp hạng Top 10 Hiện vật (Popular Artifacts):**
  - Hiển thị danh sách hiện vật có tương tác cao nhất.
  - Huy hiệu thứ hạng (#1 vàng, #2 bạc, #3 đồng, #4-#10).
  - Hiển thị tên hiện vật, mã hiện vật (`ID: #...`), số lượt tương tác và thanh so sánh tương đối với hiện vật top 1.
- **Nút Refresh & Xử lý trạng thái (UX States):**
  - Nút Refresh góc trên hỗ trợ làm mới dữ liệu thời gian thực có hiệu ứng xoay biểu tượng.
  - Hiệu ứng khung xương tải trang (Loading Skeleton Shimmer).
  - Trạng thái trống (Empty State) thân thiện khi chưa có dữ liệu trong khoảng thời gian được chọn.
  - Xử lý lỗi (Error State) kèm nút Retry, hiển thị cảnh báo từ chối truy cập riêng biệt khi gặp mã lỗi 403 Forbidden.

### 3. Kiểm thử & Đảm bảo chất lượng (Quality Assurance)

- Bổ sung unit tests cho service: `src/services/__tests__/analyticsService.test.ts` (3 tests).
- Bổ sung component tests cho Dashboard: `src/pages/__tests__/DashboardPage.test.tsx` (10 tests: tải dữ liệu, empty state, error retry, 403 forbidden, đổi preset, validate giới hạn 90 ngày, tính ngày kết thúc bao gồm, refresh).
- Toàn bộ test suite của dự án đạt **56/56 tests passed**.
- Kiểm tra kiểu dữ liệu (`npx tsc --noEmit`), linter (`npm run lint`), và build (`npm run build`) đều thành công 100% không có lỗi.
- Không sử dụng dữ liệu giả (mock data) trong giao diện Dashboard thực tế.

## Kết quả đạt được

- Hoàn thành đầy đủ các tiêu chí chấp nhận (Acceptance Criteria) của Task 1 Sprint 4.
- Quản trị viên có thể theo dõi trực quan các chỉ số tương tác thực tế từ hệ thống.
- Đáp ứng tiêu chuẩn phân quyền bảo mật, tự động xử lý khi session hết hạn (401) hoặc không đủ quyền (403).
