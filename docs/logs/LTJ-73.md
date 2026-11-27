# Log: S6-M4-01 — Admin Web Final UX & Responsive Polish

## Thông tin chung

- **Branch:** `feat/translations-and-feedback`
- **Task:** S6-M4-01 — Admin Web Final UX & Responsive Polish
- **Sprint:** M4 — Sprint 6 (Final Integration, Acceptance & Release)
- **Mục tiêu:** Rà soát và hoàn thiện giao diện Admin Web nhất quán, hỗ trợ responsive desktop/tablet, chuẩn hóa trạng thái UI, keyboard navigation và kiểm tra chất lượng build/lint/test trước khi release.

---

## Các hạng mục đã hoàn thiện

### 1. Layout & Visual Consistency
- Hoàn thiện và tích hợp 2 trang mới (`TranslationsPage`, `FeedbackPage`) vào `AdminLayout` và routing (`App.tsx`) với cùng cấu trúc header, eyebrow, toolbar, bảng dữ liệu, pagination, alert banners và modal/dialog như các trang hiện có (`HeritageSitesPage`, `ArtifactsPage`, `MultimediaPage`, `BeaconsPage`, `DashboardPage`).
- Giữ nguyên sự nhất quán của bảng dữ liệu (loại bỏ cột checkbox và action thừa ở `TranslationsPage`).

### 2. Responsive & Text Overflow
- Bổ sung breakpoint `@media (max-width: 768px)` trong `TranslationsPage.css` và `FeedbackPage.css`:
  - Tự động xuống dòng header và mở rộng thanh tìm kiếm theo chiều ngang trên viewport nhỏ.
  - Chuyển các hàng form 2 cột (`translations-form-row`, `feedback-form-row`, `feedback-detail-row`) sang 1 cột trên tablet/mobile.
- Bổ sung `overflow-wrap: anywhere` và `word-break: break-word` cho tiêu đề, nội dung bảng và nội dung chi tiết trong modal để tránh tràn ngang / clipping.

### 3. Keyboard Navigation, Accessibility & States
- Bổ sung xử lý phím `Escape` để đóng modal (`TranslationsPage`, `FeedbackPage`), tự động chặn đóng khi đang lưu (`saving`).
- Bổ sung `:focus-visible` outline rõ ràng cho `button`, `select`, `input`, `textarea`.
- Đảm bảo đầy đủ `role="dialog"`, `aria-modal="true"`, `role="status"`, `role="alert"`, `aria-label` cho các nút thao tác và form fields.
- Chuẩn hóa các trạng thái `loading`, `empty`, `error` (kèm nút Retry), `success`, `disabled` khi đang gửi dữ liệu, và banner `demo-mode-notice` khi backend endpoint chưa triển khai.

---

## Kết quả kiểm thử tự động

Chạy tại `frontend/` trên nhánh `feat/translations-and-feedback`:

```bash
cd frontend
npm test -- --run
npx tsc -b
npm run lint
npm run build
```

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm test -- --run` | **PASS** | 19/19 test files, **164/164 tests passed** (bao gồm 8 tests `TranslationsPage`, 8 tests `FeedbackPage` có test phím `Escape`) |
| `npx tsc -b` | **PASS** | 0 errors |
| `npm run lint` | **PASS** | 0 errors (ESLint) |
| `npm run build` | **PASS** | Vite production build thành công (`dist/assets/index-BOYzfjyo.css`, `dist/assets/index-Cv3UxXtR.js`) |

---

## Acceptance Checklist (S6-M4-01)

- [x] Các trang Admin có layout nhất quán.
- [x] Responsive CSS & chống overflow cho desktop và tablet đã được kiểm tra và bổ sung.
- [x] Loading / empty / error / success / disabled states rõ ràng.
- [x] Form có labels, đánh dấu trường bắt buộc (`*`) và thông báo lỗi dễ hiểu.
- [x] Dialog và buttons dùng được bằng keyboard (`Escape` đóng modal, `:focus-visible`, `Tab`).
- [x] Không làm hỏng responsive hay test suite hiện tại (`164/164` tests pass).
