# Log: Branch LTJ-61

## Thông tin chung

- **Branch:** `LTJ-61`
- **Task:** S5-M4-02 — Analytics Dashboard Export & Usability
- **Sprint:** M4 — Sprint 5
- **Mục tiêu chính:** Bổ sung tính năng xuất dữ liệu analytics ra file CSV từ trang Dashboard, toàn bộ tiêu đề và nhãn hiển thị tiếng Việt, căn chỉnh layout bảng ngay ngắn trong Excel, đảm bảo an toàn công thức (CSV Formula Injection), hỗ trợ tiếng Việt (UTF-8 BOM), và không gọi lại API khi export.

---

## Các công việc đã hoàn thành

### 1. Utility module `analyticsCsv.ts` 

**File:** `frontend/src/utils/analyticsCsv.ts`

Tạo mới module độc lập chứa toàn bộ logic xuất CSV, không phụ thuộc vào bất kỳ component nào.

#### Hàm xuất khẩu (exports)

| Hàm | Mục đích |
|-----|---------|
| `escapeCsvCell(value)` | Escape cell theo RFC 4180, ngăn chặn CSV Formula Injection |
| `getInteractionTypeLabel(type)` | Trả về nhãn cho các loại tương tác: Lượt xem hiện vật, Nghe thuyết minh audio, Quét QR/Beacon, Kích hoạt Beacon |
| `formatReportingPeriod(from, to)` | Chuyển đổi khoảng `[from, to)` sang dạng hiển thị tiếng Việt bao gồm ngày cuối (hoặc "Toàn thời gian") |
| `getAnalyticsCsvFilename(from, to)` | Sinh tên file theo date range (ví dụ: `analytics-summary_2026-10-08_to_2026-11-06.csv`) |
| `generateAnalyticsCsv(summary, options?)` | Tạo toàn bộ nội dung CSV tiếng Việt dạng string RFC 4180 với layout chuẩn hóa |
| `exportAnalyticsSummaryToCsv(summary, options?)` | Kích hoạt download file trên trình duyệt qua Blob + anchor |

#### Cải tiến Layout & Căn chỉnh hiển thị Excel

- **Phân nhóm mục rõ ràng:** Sử dụng các nhãn phân mục có đánh số `[1]`, `[2]`, `[3]` giúp các khối dữ liệu tách biệt trực quan.
- **Khắc phục xô lệch cột:**
  - Bổ sung cột `Đơn vị tính` cho khối KPI (3 cột: `Chỉ số`, `Giá trị`, `Đơn vị tính`) giúp bảng KPI cân đối và không làm xô lệch các cột bảng 4 cột phía dưới.
  - Khi chưa có dữ liệu (Empty State), các ô được điền giá trị `N/A` và thông báo trải dài đầy đủ các cột, không để trống ngắt quãng giữa chừng gây cảm giác đứt gãy bảng.
- **CSV Formula Injection (OWASP):** Mọi ô có chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r` (kể cả sau khoảng trắng đầu dòng) sẽ được tự động prefix dấu nháy đơn `'` trước khi bọc ngoặc kép, ngăn spreadsheet hiểu nhầm là công thức.
- **RFC 4180 Escaping:** Bọc mọi ô trong `"..."`, escape dấu ngoặc kép bên trong thành `""`, dùng CRLF (`\r\n`) làm dấu xuống dòng giữa các hàng.
- **UTF-8 BOM (`\uFEFF`):** Chèn vào đầu Blob để Microsoft Excel trên Windows tự nhận diện UTF-8, hiển thị đúng tiếng Việt có dấu (ví dụ: *Trống đồng Đông Sơn*, *Thạp đồng Đào Thịnh*).
- **Tên file thông minh:** Đặt tên file theo date range inclusive, fallback `analytics-summary_all-time.csv` cho Toàn thời gian.

#### Cấu trúc nội dung CSV 

```
BÁO CÁO PHÂN TÍCH TƯƠNG TÁC — SMART HERITAGE
Khoảng thời gian báo cáo, 2026-10-13 đến 2026-11-11 (UTC)
Thời điểm xuất báo cáo (UTC),     2026-11-11 11:33:26 UTC

[1] CHỈ SỐ HIỆU QUẢ CHÍNH (KPIs)
Chỉ số,                      Giá trị,   Đơn vị tính
Tổng lượt tương tác,         1420,      lượt
Khách truy cập duy nhất,     350,       khách
Tương tác trung bình / khách, 4.1,      lượt / khách

[2] CHI TIẾT THEO LOẠI TƯƠNG TÁC
Mã tương tác, Tên hiển thị,       Số lượng, Tỷ lệ
VIEW,         Lượt xem hiện vật,  900,      63%
...

[3] DANH SÁCH HIỆN VẬT PHỔ BIẾN
Thứ hạng, Mã hiện vật, Tên hiện vật,         Số lượt tương tác
1,        101,         Trống đồng Đông Sơn,  520
...
```

---

### 2. Tích hợp nút Export CSV vào Dashboard UI

**File thay đổi:** `frontend/src/pages/DashboardPage.tsx`

- **Import thêm** `exportAnalyticsSummaryToCsv` từ `../utils/analyticsCsv`.
- **Thêm 2 state:** `isExporting` và `exportError` để quản lý trạng thái export.
- **Handler `handleExportCsv`:** Gọi `exportAnalyticsSummaryToCsv(summary)` với dữ liệu đang có trong state, không phát sinh thêm API request. Bắt lỗi và cập nhật `exportError` nếu thất bại.
- **Nút "Export CSV"** đặt trong `analytics-header-actions` cạnh nút Refresh:
  - `disabled` khi: đang loading, đang refreshing, chưa có summary, hoặc đang export.
  - Hiển thị `"Exporting..."` trong khi export đang xử lý.
  - Có `aria-label` và `title` đầy đủ cho accessibility.
- **Export Error Alert:** Hiển thị `<section role="alert">` báo lỗi xuất file, có nút Dismiss để ẩn.

---

### 3. Style cho nút Export CSV

**File thay đổi:** `frontend/src/pages/DashboardPage.css`

- Thêm class `.export-button` với style đồng bộ hoàn toàn với `.refresh-button` hiện tại.
- Thêm class `.export-icon` cho SVG download icon (16×16).
- Thêm pseudo-class `:hover:not(:disabled)` và `:disabled` (opacity 0.6, cursor not-allowed).

---

### 4. Kiểm thử

#### 4.1. Unit tests cho CSV utility 

**File:** `frontend/src/utils/__tests__/analyticsCsv.test.ts` — **13 tests**

| Nhóm | Test case |
|------|-----------|
| `escapeCsvCell` | null/undefined → `""`; number không bị prefix; escape dấu ngoặc kép và dấu phẩy; formula injection với `=`, `+`, `-`, `@`; leading whitespace + `\t`, `\r` |
| `getInteractionTypeLabel` | Tất cả 4 loại chuẩn tiếng Việt (Lượt xem hiện vật, Nghe thuyết minh audio, Quét QR/Beacon, Kích hoạt Beacon) + fallback unknown type |
| `formatReportingPeriod & filename` | UTC bounded range (tính đúng ngày cuối inclusive); Toàn thời gian null/null; invalid date string |
| `generateAnalyticsCsv` | Toàn bộ các section tiếng Việt với BEACON_TRIGGER và tên hiện vật tiếng Việt; empty data căn chỉnh chuẩn `N/A` |
| `exportAnalyticsSummaryToCsv` | Mock `URL.createObjectURL`, `appendChild`, `removeChild`, kiểm tra Blob type `text/csv;charset=utf-8;` |

#### 4.2. Integration tests bổ sung vào Dashboard

**File:** `frontend/src/pages/__tests__/DashboardPage.test.tsx` — **+3 tests** (tổng 15 tests)

| Test case | Nội dung kiểm tra |
|-----------|------------------|
| `disables export button while loading` | Nút Export disabled trong lúc fetch, enabled sau khi có data |
| `exports without re-fetching analytics` | Click Export → `exportAnalyticsSummaryToCsv` được gọi đúng 1 lần với đúng dữ liệu; `getInteractionSummary` không được gọi lại |
| `displays error alert and allows dismissing` | Khi export throw Error → hiển thị "Export Failed" + message; click Dismiss → ẩn alert |

---

### 5. Kết quả kiểm thử & Build

```
Test Files  13 passed (13)
     Tests  74 passed (74)
  Duration  ~10s
```

- `npm run lint` → **0 errors, 0 warnings**
- `npm run build` → **0 TypeScript errors**, build thành công 

---

## Kết quả đạt được

- Trang Dashboard Admin có thêm nút **Export CSV** nằm ngay cạnh nút Refresh, cho phép xuất nhanh toàn bộ dữ liệu analytics đang hiển thị ra file CSV.
- Dữ liệu được bảo vệ khỏi lỗ hổng **CSV Formula Injection** (OWASP).
- Export không phát sinh thêm bất kỳ API request nào.
- Toàn bộ **74/74 tests passed**, lint và build sạch không có lỗi.
