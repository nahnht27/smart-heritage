# Log: Branch LTJ-75

## Thông tin chung

- **Branch:** `LTJ-75`
- **Task:** S6-M4-03 — Analytics Dashboard & CSV Export Final Acceptance
- **Sprint:** M4 — Sprint 6 (Final Integration, Acceptance & Release)
- **Mục tiêu:** Xác minh Analytics Dashboard và CSV Export ở các mặt: date-range semantics, UTF-8 BOM, RFC 4180 escaping, formula-injection mitigation, filename và empty state.
- **Cập nhật audit:** Đã merge `origin/main` (`5989871`) vào branch bằng merge commit `56ff551`.

---

## Phạm vi evidence

- **Automated tests:** kiểm chứng UI, request params, CSV string/Blob, filename và error handling.
- **Manual screenshot:** một lần mở file `analytics-summary_all-time.csv` bằng Microsoft Excel với dữ liệu rỗng.
- **Chưa có:** live data verification với interaction records thật, và chưa mở thủ công file CSV cho preset 7/30/90 ngày trong audit này.

Screenshot đã được **redact email tài khoản** trước khi lưu vào repo.

---

## Kết quả kiểm thử tự động

### Full frontend suite — 105/105 passed

```
Test Files  15 passed (15)
     Tests  105 passed (105)
  Duration  12.68s
```

Lệnh đã chạy:

```bash
cd frontend
npm test -- --run
npx tsc -b
npm run lint
npm run build
git diff --check
```

- `npx tsc -b` → **0 errors**
- `npm run lint` → **0 errors**
- `npm run build` → **thành công**
- `git diff --check` → **sạch**

Ghi chú: jsdom in cảnh báo không fail `Not implemented: navigation to another Document`; không có test nào thất bại.

### analyticsCsv.test.ts — 14 tests passed

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
| `generateAnalyticsCsv` | Empty data → `N/A` đúng cột, không crash | ✅ |
| `exportAnalyticsSummaryToCsv` | Blob type, anchor click, revoke URL | ✅ |
| `exportAnalyticsSummaryToCsv` | Blob thực tế có UTF-8 BOM bytes, CRLF, filename download | ✅ |

### DashboardPage.test.tsx — 15 tests, trong đó 3 test trực tiếp cho Export

12 test còn lại kiểm chứng Dashboard analytics:

- Loading skeleton, KPI, interaction breakdown và popular artifacts.
- Empty state khi mọi KPI bằng 0.
- Network/server error + retry.
- 403 Forbidden không hiện retry.
- Preset 7/90 ngày và All Time.
- Custom date validation: from > to, > 90 ngày, single-day, đúng 90 ngày, 91 ngày bị chặn.
- Inclusive end day: `2026-11-01` → `2026-11-04` gửi `to=2026-11-05`.
- BEACON_TRIGGER label.
- Không duplicate request trong StrictMode.

3 test trực tiếp cho Export:

| Test case | Kết quả |
|-----------|---------|
| Export button disabled khi loading, enabled khi có data | ✅ |
| Export dùng summary hiện tại, không phát sinh thêm API request | ✅ |
| Export error alert hiển thị và dismiss được | ✅ |

Không có test component nào thực sự mở file CSV; phần Blob/filename được kiểm chứng ở `analyticsCsv.test.ts`.

---

## Date range và filename — automated evidence

Các giá trị dưới đây được kiểm chứng bằng unit test của `formatReportingPeriod`/`getAnalyticsCsvFilename` và request-param tests của Dashboard:

| Trường hợp | Automated date semantics | Automated filename | Mở file thủ công |
|-----------|--------------------------|--------------------|------------------|
| All Time | `null/null` → "Toàn thời gian" | `analytics-summary_all-time.csv` | ✅ Screenshot Excel |
| Bounded range | Inclusive end day đúng theo contract `[from, to)` | `analytics-summary_<from>_to_<inclusive-end>.csv` | ❌ Chưa có evidence |
| 7 ngày | Dashboard gửi đúng exclusive `to`, đủ 7 ngày UTC | Filename sinh theo cùng semantics | ❌ Chưa có evidence |
| 30 ngày | Preset sử dụng cùng date-range logic | Filename sinh theo cùng semantics | ❌ Chưa có evidence |
| 90 ngày | Chấp nhận đúng 90 ngày, chặn 91 ngày | Filename sinh theo cùng semantics | ❌ Chưa có evidence |

---

## Excel screenshot — All Time, empty data

Screenshot: `docs/logs/LTJ-75-excel-screenshot.jpg`

Đã xác minh trực quan:

- File mở trong Microsoft Excel với tên `analytics-summary_all-time.csv`.
- Tiếng Việt hiển thị đúng: "BÁO CÁO PHÂN TÍCH TƯƠNG TÁC", "Khoảng thời gian báo cáo", "Toàn thời gian", "Tổng lượt tương tác", v.v.
- Không có lỗi encoding `????`.
- Cấu trúc 3 section và các cột căn đúng.
- Empty state hiển thị `N/A`, "Chưa có tương tác ghi nhận trong kỳ", "Chưa có hiện vật nào ghi nhận tương tác trong kỳ".

Screenshot này **chỉ** chứng minh All Time + empty data; không dùng để tuyên bố đã verify thủ công các preset 7/30/90 ngày.

---

## Checklist acceptance

### CSV Export

- [x] Export button xuất hiện trên Dashboard.
- [x] Export sử dụng summary đã tải, không phát sinh API request trùng.
- [x] All Time → `from`/`to` absent, filename `analytics-summary_all-time.csv`.
- [x] Bounded date range dùng UTC `[from, to)` và hiển thị inclusive end day.
- [x] Filename chứa date range inclusive đúng.
- [x] RFC 4180: CRLF line endings, dấu `"` được escape — có test trên CSV string và Blob thực tế.
- [x] UTF-8 BOM (`EF BB BF`) có trong Blob — có test byte-level.
- [x] Formula injection mitigation: prefix `'` cho ô bắt đầu `=`, `+`, `-`, `@` (kể cả leading whitespace/tab/CR).
- [x] Empty data → `N/A` đúng cột, không crash.
- [x] Unknown interaction type → fallback giá trị gốc, không crash.
- [x] Export chỉ chứa aggregate data, không có personal information.
- [x] Đủ 3 section: KPI, Interaction Breakdown, Popular Artifacts.
- [x] `BEACON_TRIGGER` → "Kích hoạt Beacon".
- [x] Dashboard hiển thị đúng loading/empty/error/403 states.
- [x] Custom date validation: from > to, > 90 ngày, single-day, exactly 90 ngày.

### Điều kiện live data còn lại

- [ ] KPI khớp với interaction records thật trong database — **pending M2 demo dataset**.
- [ ] Export file có data thật (không chỉ empty state) — **pending M2 demo dataset**.
- [ ] Mở thủ công CSV cho preset 7/30/90 ngày — **chưa thực hiện**.

---

## Ghi chú về data

Database hiện tại chưa có interaction records nên screenshot có tất cả KPI = 0 và empty state. CSV export xử lý đúng trường hợp này; việc so khớp KPI với dataset thực tế phụ thuộc M2 demo data.

---

## Các file liên quan

| File | Vai trò |
|------|---------|
| `frontend/src/utils/analyticsCsv.ts` | CSV generation, escaping, filename, download |
| `frontend/src/pages/DashboardPage.tsx` | Dashboard UI + Export button |
| `frontend/src/utils/__tests__/analyticsCsv.test.ts` | 14 unit tests |
| `frontend/src/pages/__tests__/DashboardPage.test.tsx` | 15 tests, 3 trực tiếp cho Export |
| `frontend/src/services/analyticsService.ts` | `GET /api/analytics/interactions/summary` |
| `docs/logs/LTJ-75-excel-screenshot.jpg` | Manual evidence: All Time + empty state, email đã redact |

---

## Kết quả đạt được

- **105/105 frontend tests passed**; TypeScript, lint và production build sạch.
- CSV logic có automated evidence cho escaping, BOM, CRLF, filename, date semantics và error handling.
- Có manual evidence cho All Time + empty data trong Excel.
- Chưa tuyên bố live-data acceptance hoặc đã mở thủ công 7/30/90 ngày khi chưa có evidence tương ứng.
