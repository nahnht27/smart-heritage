# Log: S6-M4-01 — Admin Web Final UX & Responsive Polish

## Thông tin chung

- **Branch:** `LTJ-73` (PR #47)
- **Task:** S6-M4-01 — Admin Web Final UX & Responsive Polish
- **Sprint:** M4 — Sprint 6 (Final Integration, Acceptance & Release)
- **Mục tiêu:** Rà soát và hoàn thiện giao diện Admin Web nhất quán, hỗ trợ responsive desktop/tablet, chuẩn hóa trạng thái UI, keyboard navigation và kiểm tra chất lượng build/lint/test trước khi release.

---

## Các hạng mục đã hoàn thiện

### 1. Phạm vi (scope)
- Task này polish 2 trang `FeedbackPage` và `TranslationsPage` (`.tsx`, `.css` và test tương ứng).
- Các trang `HeritageSitesPage`, `ArtifactsPage`, `MultimediaPage`, `BeaconsPage`, `DashboardPage` **không thay đổi trong task này**.

### 2. Responsive & Text Overflow
- Bổ sung breakpoint `@media (max-width: 768px)` trong `TranslationsPage.css` và `FeedbackPage.css`:
  - Tự động xuống dòng header và mở rộng thanh tìm kiếm theo chiều ngang trên viewport nhỏ.
  - Chuyển các hàng form 2 cột (`translations-form-row`, `feedback-form-row`, `feedback-detail-row`) sang 1 cột trên tablet/mobile.
- Bổ sung `overflow-wrap: anywhere` và `word-break: break-word` để tránh tràn ngang / clipping:
  - `TranslationsPage.css`: `.translations-content-cell` (ô nội dung trong bảng), `.translations-lang-box p` (khung so sánh đa ngôn ngữ).
  - `FeedbackPage.css`: `.feedback-title-text` (tiêu đề trong bảng), `.feedback-detail-text-box`, `.feedback-detail-value` (modal chi tiết).
- CSS breakpoint 768px đã thêm; kiểm tra thủ công trên trình duyệt (desktop/tablet viewport): **NOT VERIFIED** — chưa có screenshot/evidence.

### 3. Keyboard Navigation
- Bổ sung xử lý phím `Escape` để đóng modal (`TranslationsPage`, `FeedbackPage`); modal form không đóng bằng `Escape` khi đang lưu (`saving`).
- Bổ sung `:focus-visible` outline cho `button`, `select`, `input`, `textarea` trong 2 trang.
- Mỗi trang thêm 1 test cho phím `Escape`.

---

## Đã có từ trước (không thuộc diff task này)

Các mục sau đã có trên `main` từ PR #44 (commit `50132ea`):

- Tích hợp `TranslationsPage`, `FeedbackPage` vào routing (`App.tsx`), hiển thị trong `AdminLayout` (layout route đã tồn tại trước PR #44).
- `role="dialog"`, `aria-modal="true"`, `role="status"`, `role="alert"`; `aria-label` cho các nút thao tác và bộ lọc.
- Trạng thái `loading`, `empty`, `error` (kèm nút Retry), `success`, `disabled` khi đang gửi dữ liệu, và banner `demo-mode-notice`.
- Form có `label`, đánh dấu trường bắt buộc (`*`) và thông báo lỗi.

---

## Kết quả kiểm thử tự động

Chạy tại `frontend/` trên HEAD sau khi sync `main`: `96a3af45af0264534e4662ffd8a970cfa4140601` (nhánh `LTJ-73`, đã merge `main` tại `76a721f`).

Môi trường: Linux (WSL2), Node.js v24.15.0, npm 11.12.1. Locale: `en-US` (mặc định, `LANG=C.UTF-8`) và `vi-VN` (đặt `LC_ALL`/`LANG=vi_VN.UTF-8`; locale hệ thống không có trong `locale -a`, Node/ICU nhận `vi-VN`). Chưa chạy trên Windows.

```bash
cd frontend
npm ci
npx vitest run
LC_ALL=vi_VN.UTF-8 LANG=vi_VN.UTF-8 npx vitest run
npx tsc -b
npm run lint
npm run build
```

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm ci` | **PASS** | 265 packages, 0 vulnerabilities |
| `npx vitest run` (`en-US`) | **PASS** | 20/20 test files, **167/167 tests passed** (gồm 8 tests `TranslationsPage`, 8 tests `FeedbackPage`) |
| `npx vitest run` (`vi-VN`) | **PASS** | 20/20 test files, **167/167 tests passed** |
| `npx tsc -b` | **PASS** | exit 0 |
| `npm run lint` | **PASS** | exit 0 (ESLint) |
| `npm run build` | **PASS** | Vite production build thành công (`dist/assets/index-BOYzfjyo.css`, `dist/assets/index-B0ToOvvN.js`) |

---

## Acceptance Checklist (S6-M4-01)

- [ ] Các trang Admin có layout nhất quán. — Task này chỉ thay đổi `FeedbackPage` và `TranslationsPage`; layout nhất quán giữa các trang Admin: **NOT VERIFIED**.
- [ ] Responsive CSS & chống overflow cho desktop và tablet đã được kiểm tra. — CSS đã bổ sung; kiểm tra thủ công: **NOT VERIFIED**.
- [x] Loading / empty / error / success / disabled states rõ ràng. (Đã có từ trước, PR #44)
- [x] Form có labels, đánh dấu trường bắt buộc (`*`) và thông báo lỗi dễ hiểu. (Đã có từ trước, PR #44)
- [ ] Dialog và buttons dùng được bằng keyboard. — `Escape` đóng modal (có test) và `:focus-visible` (CSS) đã bổ sung; điều hướng `Tab`: **NOT VERIFIED**, chưa có focus trap.
- [x] Không làm hỏng test suite hiện tại (`167/167` tests pass). Responsive: **NOT VERIFIED** (manual).

---

## Known limitations

- `Escape` không trả focus về nút đã mở modal.
- Modal chưa có focus trap.
- Listener `keydown` được gắn ở `window`.
