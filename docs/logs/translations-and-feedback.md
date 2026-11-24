# Tài liệu Tích hợp & Hoàn thiện: Translations & Feedback Pages

## 1. Thông tin chung

- **Nhánh làm việc (Branch):** `feat/translations-and-feedback`
- **Mục tiêu:** 
  - Hoàn thiện 2 trang quản trị **Translations** (`/translations`) và **Feedback** (`/feedback`) trên Admin Web.
  - Đồng bộ layout, typography, components (bảng, toolbar, alert, modal, phân trang) theo đúng chuẩn giao diện các trang hiện tại (`HeritageSitesPage`, `ArtifactsPage`, `BeaconsPage`).
  - Kiểm tra và kết nối chuẩn API theo hợp đồng thiết kế backend (`docs/api/admin_api_design.md`).

---

## 2. Hợp đồng API, trạng thái backend và cơ chế dữ liệu demo

### 2.1 Hiện trạng Backend (đã kiểm tra sau khi đồng bộ `main`)
- Backend Spring Boot đã triển khai: `HeritageSite`, `Artifact`, `Multimedia`, `Beacon`, `User/Auth`, `VisitorInteraction / Analytics`.
- **Backend CHƯA có Controller, Entity, Repository hay migration cho Translation Management và Feedback Moderation.** Không có bất kỳ endpoint `POST/PUT/DELETE` Translation hoặc Feedback nào trong Spring Boot, và PR này **không thêm** backend persistence cho hai module này.
- Mọi dữ liệu Translation/Feedback hiển thị hiện nay, cùng các thao tác thêm/sửa/xóa/duyệt, **không được lưu vào PostgreSQL**.

### 2.2 Hợp đồng API thiết kế hiện có (`docs/api/admin_api_design.md`)
| Module | Endpoint trong thiết kế | Trạng thái |
|---|---|---|
| Translation (mục 3.7) | `GET` list, `GET` detail, `POST`, `PUT`, `DELETE` `/api/admin/translations[/{id}]` | Đã thiết kế, **chưa triển khai** backend |
| Feedback (mục 3.8) | `GET /api/admin/feedback`, `GET /api/admin/feedback/{id}`, `PUT /api/admin/feedback/{id}/moderate` | Đã thiết kế, **chưa triển khai** backend |

Thiết kế Feedback **không** định nghĩa CRUD nội dung quản trị (tạo/sửa/xóa). Việc tạo feedback thuộc phía Visitor; Admin chỉ xem và kiểm duyệt.

### 2.3 Những gì frontend gọi
| Thao tác | Endpoint mà frontend gọi | Thuộc hợp đồng thiết kế? | Lưu bởi backend? |
|---|---|---|---|
| Translation: list/detail | `GET /api/admin/translations[/{id}]` | Có | Không (chưa triển khai) |
| Translation: tạo/sửa/xóa | `POST/PUT/DELETE /api/admin/translations[/{id}]` | Có | Không (chưa triển khai) |
| Feedback: list/detail | `GET /api/admin/feedback[/{id}]` | Có | Không (chưa triển khai) |
| Feedback: duyệt/từ chối | `PUT /api/admin/feedback/{id}/moderate` | Có | Không (chưa triển khai) |
| Feedback: thêm/sửa/xóa nội dung | `POST/PUT/DELETE /api/admin/feedback[/{id}]` | **Không** — endpoint dự kiến/tương lai, chỉ phục vụ demo | Không |
| Danh sách di sản/hiện vật cho modal | `GET /api/heritage-sites`, `GET /api/artifacts` | Có (đã triển khai) | Có (đọc từ backend thật) |

Chỉ phần đọc danh sách di sản/hiện vật là dữ liệu thật từ backend. Dữ liệu Translation/Feedback chỉ là dữ liệu thật nếu một backend tương lai thực sự trả về chúng.

### 2.4 Cơ chế fallback trong bộ nhớ (demo-only)
- Tầng Service (`translationService.ts`, `feedbackService.ts`) luôn gọi API thật trước qua `apiClient.apiRequest` (tái sử dụng xử lý token hiện có).
- Nếu nhận `404`, `501` hoặc lỗi kết nối (`status 0`), Service chuyển sang dữ liệu mô phỏng lưu **trong bộ nhớ** của tab trình duyệt. Dữ liệu này mất khi tải lại ứng dụng. Các lỗi khác (ví dụ `401`, `403`, `500`) **không** fallback mà hiển thị lỗi.
- Dữ liệu mô phỏng nằm trong tầng Service, không nằm trong component.
- `getAllTranslations()` và `getAllFeedback()` trả về cờ `isDemo`: `true` khi kết quả đến từ fallback, `false` khi đến từ API thật.
- Trang hiển thị thông báo demo khi `isDemo = true` (và không hiển thị khi dữ liệu là thật):
  `Demo mode — backend endpoint is not implemented. Changes are temporary and reset when the application reloads.`
- Sau mỗi thao tác thành công, trang tải lại danh sách và cờ `isDemo` được cập nhật theo kết quả mới.

### 2.5 Quick Stats của Translation
- Không còn giá trị bịa hay giá trị tối thiểu (trước đây: 24/20/4).
- `Total Content` = số nội dung (loại + id) khác nhau trong các bản ghi **đã tải**; `Translated` = số bản ghi `PUBLISHED` đã tải; `Draft` = số bản ghi `DRAFT` đã tải. Danh sách rỗng cho kết quả 0/0/0.
- Khi API báo tổng số kết quả lớn hơn số bản ghi đã tải, khung thống kê ghi rõ `Current page only (X of Y results)`; nếu không, ghi `All loaded results`. Không suy luận thống kê toàn bộ dữ liệu từ một trang.

---

## 3. Chi tiết Giao diện & Các Tinh chỉnh UI

### 3.1 Trang Translations (`TranslationsPage.tsx`)
- **Khung chính:**
  - Header với tiêu đề `Translation` và mô tả chuẩn admin.
  - Toolbar: Tìm kiếm theo từ khóa; Dropdown lọc đa chiều (Ngôn ngữ: Tất cả/Tiếng Anh/Tiếng Việt; Loại: Di sản/Hiện vật; Trạng thái: Published/Draft); Nút `+ Add Translation`.
  - Bảng danh sách: Cột Nội dung, Loại nội dung (badge xanh/tím), Ngôn ngữ, Trạng thái (badge Published/Draft), Ngày cập nhật, Cột Actions.
- **Khung Selected Content & Đối chiếu song ngữ (Bilingual Comparison):**
  - Hiển thị thông tin đối tượng đang chọn (ảnh thumbnail, loại, trạng thái, ngày).
  - Hai khung song song **Vietnamese** và **English** giúp admin đối chiếu văn phong và ngữ nghĩa trước khi duyệt xuất bản.
- **Khung Quick Stats:** Thống kê tổng số nội dung, số lượng đã dịch (`Translated`) và số lượng nháp (`Draft`).

### 3.2 Trang Feedback (`FeedbackPage.tsx`)
- **Khung chính:**
  - Header `Feedback / Content Management` kèm nút `+ Add Content`.
  - Toolbar lọc theo trạng thái (`Pending`, `Approved`, `Rejected`, `Published`, `Draft`) và theo loại (`Feedback`, `Content`).
  - Bảng danh sách hiển thị: ID mã hóa (`F001`, `C001`), Phân loại, Tiêu đề kèm đánh giá số sao (★), Người gửi, Ngày gửi, Trạng thái.
- **Tính năng kiểm duyệt nhanh (Quick Moderation):**
  - Với các mục `Pending`, cột Actions cung cấp nút **Duyệt nhanh (✓ xanh)** và **Từ chối (✕ đỏ)** thực hiện trực tiếp chỉ với 1 click.
- **Modal chi tiết & Modal tạo nội dung:**
  - Xem chi tiết phản hồi đầy đủ kèm nút Duyệt/Từ chối bên trong modal.
  - Thêm mới thông báo hoặc quy định tham quan cho khu di tích.

---

## 4. Danh sách các tệp tin trong lần cập nhật

```text
frontend/
├── src/
│   ├── types/
│   │   ├── translation.ts                    # Khai báo TypeScript types cho Translation
│   │   └── feedback.ts                       # Khai báo TypeScript types cho Feedback & Content
│   ├── services/
│   │   ├── translationService.ts             # Service kết nối API Translations + Graceful Fallback
│   │   ├── feedbackService.ts                # Service kết nối API Feedback + Graceful Fallback
│   │   └── __tests__/
│   │       ├── translationService.test.ts    # Test cases cho translationService
│   │       └── feedbackService.test.ts       # Test cases cho feedbackService
│   ├── pages/
│   │   ├── TranslationsPage.tsx              # Component trang Translations
│   │   ├── TranslationsPage.css              # Style trang Translations
│   │   ├── FeedbackPage.tsx                  # Component trang Feedback & Content
│   │   ├── FeedbackPage.css                  # Style trang Feedback & Content
│   │   └── __tests__/
│   │       ├── TranslationsPage.test.tsx     # Test suite giao diện Translations
│   │       └── FeedbackPage.test.tsx         # Test suite giao diện Feedback
│   └── App.tsx                               # Đăng ký route /translations và /feedback
docs/
└── logs/
    └── translations-and-feedback.md          # Tài liệu mô tả tích hợp và cơ chế hoạt động
```

---

## 5. Kết quả Kiểm thử & Biên dịch

Chạy trong `frontend/`: `npm ci`, `npm run lint`, `npm test`, `npm run build`.

- `npm run lint`: không có lỗi.
- `npm test` (Vitest): **19 test files, 162 tests đều passed** (gồm 2 test trang và 2 test service).
- `npm run build`: thành công.
- Test bổ sung: thống kê rỗng, đếm Published/Draft thực, ngữ nghĩa current-page, không có giá trị mặc định giả, và hiển thị/ẩn thông báo demo.
- Đã đồng bộ `origin/main` bằng merge commit thường; không có xung đột.
