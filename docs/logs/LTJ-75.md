# Log: Branch LTJ-75

## Thông tin chung

- **Branch:** `LTJ-75`
- **Task:** S6-M4-03 — Analytics Dashboard & CSV Export Final Acceptance
- **Sprint:** M4 — Sprint 6 (Final Integration, Acceptance & Release)
- **Mục tiêu chính:** Xác minh Analytics Dashboard hiển thị đúng và CSV Export hoạt động chính xác với backend tích hợp thực tế: date range semantics, UTF-8 BOM, RFC 4180 escaping, formula injection mitigation, tên file đúng, và empty state.

---

## Kết quả kiểm thử tự động

```
Test Files  15 passed (15)
     Tests  104 passed (104)
  Duration  19.09s
```

### analyticsCsv.test.ts — 13 tests passed

| Nhóm | Test case | Kết quả |
|------|-----------|---------|
| `escapeCsvCell` | null/undefined → `""` | ✅ |
| `escapeCsvCell` | number không bị prefix injection | ✅ |
| `escapeCsvCell` | escape dấu ngoặc kép và dấu phẩy | ✅ |
| `escapeCsvCell` | formula injection: `=`, `+`, `-`, `@` | ✅ |
| `escapeCsvCell` | leading whitespace + `\t`, `\r` | ✅ |
| `getInteractionTypeLabel` | VIEW, AUDIO_PLAY, SCAN, BEACON_TRIGGER → tiếng Việt | ✅ |
| `getInteractionTypeLabel` | unknown type → fallback giá trị gốc | ✅ |
| `formatReportingPeriod` | UTC bounded range → inclusive end day đúng | ✅ |
| `formatReportingPeriod` | All Time (null/null) → "Toàn thời gian" | ✅ |
| `formatReportingPeriod` | invalid date string → fallback | ✅ |
| `generateAnalyticsCsv` | Đủ 3 section, BEACON_TRIGGER, tiếng Việt | ✅ |
| `generateAnalyticsCsv` | Empty data → N/A đúng cột, không crash | ✅ |
| `exportAnalyticsSummaryToCsv` | Blob type `text/csv;charset=utf-8;`, download trigger | ✅ |

### DashboardPage.test.tsx — 15 tests passed (liên quan export)

| Test case | Kết quả |
|-----------|---------|
| Export button disabled khi đang loading | ✅ |
| Export không phát sinh thêm API request | ✅ |
| Export error alert hiển thị và dismiss được | ✅ |
| Date range validation: from > to, > 90 ngày | ✅ |
| Inclusive end day: 2026-11-01 to 2026-11-04 → `to=2026-11-05` | ✅ |
| Single-day range và exactly 90 ngày được chấp nhận | ✅ |

---

## Acceptance Criteria — Kết quả

### CSV Export — Verify thực tế

| File export | Khoảng thời gian | Date range đúng | Tên file đúng | Tiếng Việt | Download |
|---|---|---|---|---|---|
| `analytics-summary_all-time.csv` | All Time | ✅ "Toàn thời gian" | ✅ | ✅ | ✅ |
| `analytics-summary_2026-08-22_to_2026-11-19.csv` | 90 ngày | ✅ "2026-08-22 đến 2026-11-19 (UTC)" | ✅ | ✅ | ✅ |
| `analytics-summary_2026-10-21_to_2026-11-19.csv` | 30 ngày | ✅ "2026-10-21 đến 2026-11-19 (UTC)" | ✅ | ✅ | ✅ |
| `analytics-summary_2026-11-13_to_2026-11-19.csv` | 7 ngày | ✅ "2026-11-13 đến 2026-11-19 (UTC)" | ✅ | ✅ | ✅ |

### Checklist đầy đủ

- [x] Export button xuất hiện trên Dashboard
- [x] Export sử dụng dữ liệu summary đã tải — không phát sinh API request trùng
- [x] All Time → `from`/`to` absent, filename `analytics-summary_all-time.csv`
- [x] Preset 7 ngày / 30 ngày / 90 ngày → date range đúng semantics UTC
- [x] Tên file chứa date range inclusive đúng
- [x] CSV mở được, tiếng Việt hiển thị đúng
- [x] RFC 4180: CRLF line endings, dấu `"` được escape
- [x] UTF-8 BOM (`\uFEFF`) có mặt → Excel Windows đọc được tiếng Việt
- [x] Formula Injection mitigation: prefix `'` cho ô bắt đầu `=`, `+`, `-`, `@`
- [x] Empty data → hiển thị `N/A` đúng cột, không crash
- [x] Unknown interaction type → fallback giá trị gốc, không crash
- [x] Export không expose personal information (chỉ aggregate data)
- [x] 3 section đầy đủ: KPI, Interaction Breakdown, Popular Artifacts
- [x] `BEACON_TRIGGER` → hiển thị "Kích hoạt Beacon"

### Excel / LibreOffice — Tiếng Việt

Screenshot verify: `docs/logs/LTJ-75-excel-screenshot.jpg`

- File `analytics-summary_all-time.csv` mở trong Microsoft Excel
- Tiếng Việt hiển thị đúng hoàn toàn: "BÁO CÁO PHÂN TÍCH TƯƠNG TÁC", "Khoảng thời gian báo cáo", "Toàn thời gian", "Tổng lượt tương tác", "Khách truy cập duy nhất", v.v.
- UTF-8 BOM hoạt động đúng — không bị `????` hay lỗi encoding
- Cấu trúc bảng căn chỉnh đúng cột

### Ghi chú về data

> Database hiện tại chưa có interaction records (tất cả KPI = 0). CSV export hoạt động đúng với empty state — hiển thị `N/A` và thông báo phù hợp thay vì crash hay để trống bất thường.
> KPI matching với dataset thực tế phụ thuộc M2 inject demo data — pending M2 demo dataset.

---

## Các file liên quan

| File | Vai trò |
|------|---------|
| `frontend/src/utils/analyticsCsv.ts` | CSV generation, escaping, filename, download |
| `frontend/src/pages/DashboardPage.tsx` | Dashboard UI + Export button |
| `frontend/src/utils/__tests__/analyticsCsv.test.ts` | 13 unit tests |
| `frontend/src/pages/__tests__/DashboardPage.test.tsx` | 15 integration tests |
| `frontend/src/services/analyticsService.ts` | `GET /api/analytics/interactions/summary` |

---

## Kết quả đạt được

- CSV export hoạt động đúng với tất cả preset date range và All Time.
- Tiếng Việt hiển thị đúng nhờ UTF-8 BOM.
- Formula Injection được mitigate đúng chuẩn OWASP.
- Empty/unknown data không gây crash.
- Task S6-M4-03 đạt acceptance criteria.
