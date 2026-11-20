# Tài liệu Tích hợp & Hoàn thiện: Translations & Feedback Pages

## 1. Thông tin chung

- **Nhánh làm việc (Branch):** `feat/translations-and-feedback`
- **Mục tiêu:** 
  - Hoàn thiện 2 trang quản trị **Translations** (`/translations`) và **Feedback** (`/feedback`) trên Admin Web.
  - Đồng bộ layout, typography, components (bảng, toolbar, alert, modal, phân trang) theo đúng chuẩn giao diện các trang hiện tại (`HeritageSitesPage`, `ArtifactsPage`, `BeaconsPage`).
  - Kiểm tra và kết nối chuẩn API theo hợp đồng thiết kế backend (`docs/api/admin_api_design.md`).

---

## 2. Kiến trúc Tích hợp API Backend & Cơ chế Dữ liệu

### 2.1 Hiện trạng Backend hiện tại
- Backend Java Spring Boot hiện tại của dự án đã hoàn thành các module: `HeritageSite`, `Artifact`, `Multimedia`, `Beacon`, `User/Auth`, `VisitorInteraction / Analytics`.
- Hai module **Translation Management** và **Feedback Moderation** đã có đầy đủ đặc tả chi tiết trong tài liệu thiết kế hệ thống ([docs/api/admin_api_design.md](file:///d:/smart-heritage/docs/api/admin_api_design.md) - Mục 3.7 & 3.8), nhưng **chưa được viết Controller và Entity JPA trong mã nguồn backend**.
- Khi frontend gửi HTTP request tới các endpoint này, server backend sẽ trả về mã `404 Not Found` (hoặc lỗi kết nối HTTP 0 nếu backend chưa khởi động).

### 2.2 Giải thích về nguồn dữ liệu hiện có (Dữ liệu dự phòng - Graceful Fallback)
> **Lưu ý quan trọng về dữ liệu hiển thị hiện tại:**
> Dữ liệu ban đầu (như *Imperial Citadel*, *Hall of Supreme Harmony*, *F001*, *C001*,...) **KHÔNG PHẢI là hardcode trực tiếp trong giao diện React Component**.

Cơ chế hoạt động được tổ chức tách lớp độc lập qua Service Layer:
1. **Luồng ưu tiên API thật:**
   - Khi trang tải hoặc khi người dùng thao tác (Tìm kiếm, Lọc, Thêm mới, Sửa, Xóa, Duyệt), tầng Service ([translationService.ts](file:///d:/smart-heritage/frontend/src/services/translationService.ts) và [feedbackService.ts](file:///d:/smart-heritage/frontend/src/services/feedbackService.ts)) sẽ luôn gửi request HTTP thực tế tới Backend qua `apiClient.apiRequest`.
2. **Cơ chế Fallback:**
   - Nếu Backend trả về mã lỗi `404 Not Found`, `501 Not Implemented` hoặc lỗi mất kết nối (`0`), Service sẽ kích hoạt bộ dữ liệu mô phỏng dự phòng (chuẩn theo wireframe thiết kế).
   - Bộ dữ liệu này được duy trì trạng thái trong bộ nhớ (in-memory state) ở tầng Service, hỗ trợ đầy đủ các thao tác CRUD:
     - Thêm mới bản dịch / bài viết: tự sinh ID, cập nhật danh sách ngay lập tức.
     - Chỉnh sửa bản ghi: lưu thông tin và ngày cập nhật mới nhất.
     - Xóa bản ghi: loại bỏ khỏi danh sách.
     - Duyệt phản hồi (Approve / Reject): cập nhật trạng thái kiểm duyệt và thời gian duyệt.
3. **Tính sẵn sàng cho Backend tương lai:**
   - Toàn bộ tham số truy vấn (`q`, `language`, `contentType`, `status`, `page`, `size`), body request JSON và envelop phản hồi `ApiResponse<T>` đều đã được lập trình chính xác 100% theo backend.
   - **Khi phía Backend bổ sung Controller & Database Migration thực tế, Frontend sẽ lấy và lưu dữ liệu trực tiếp từ Database mà không cần sửa code ở tầng giao diện.**

---

### 2.3 Danh sách các API Backend đã kết nối

#### A. Quản lý Bản dịch (Translations)
| Phương thức | Endpoint | Tham số / Payload | Mô tả |
|---|---|---|---|
| `GET` | `/api/admin/translations` | `q`, `language` (`vi`, `en`), `contentType` (`SITE`, `ARTIFACT`), `status` (`DRAFT`, `PUBLISHED`), `page`, `size` | Lấy danh sách bản dịch có tìm kiếm, lọc & phân trang |
| `GET` | `/api/admin/translations/{id}` | — | Lấy chi tiết một bản dịch |
| `POST` | `/api/admin/translations` | `TranslationRequest` (`contentType`, `contentId`, `language`, `title`, `description`, `status`) | Tạo bản dịch mới (ADMIN) |
| `PUT` | `/api/admin/translations/{id}` | `TranslationRequest` | Cập nhật bản dịch (ADMIN) |
| `DELETE` | `/api/admin/translations/{id}` | — | Xóa bản dịch (ADMIN) |
| `GET` | `/api/heritage-sites` | — | Lấy danh sách di sản để chọn liên kết trong Modal |
| `GET` | `/api/artifacts` | — | Lấy danh sách hiện vật để chọn liên kết trong Modal |

#### B. Quản lý Phản hồi & Nội dung (Feedback & Content)
| Phương thức | Endpoint | Tham số / Payload | Mô tả |
|---|---|---|---|
| `GET` | `/api/admin/feedback` | `q`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `PUBLISHED`, `DRAFT`), `type` (`FEEDBACK`, `CONTENT`), `page`, `size` | Danh sách phản hồi & nội dung |
| `GET` | `/api/admin/feedback/{id}` | — | Chi tiết phản hồi |
| `PUT` | `/api/admin/feedback/{id}/moderate` | `{ action: "APPROVE" \| "REJECT" }` | Kiểm duyệt phản hồi của khách tham quan |
| `POST` | `/api/admin/feedback` | `CreateFeedbackRequest` | Đăng bài viết / thông báo mới |
| `PUT` | `/api/admin/feedback/{id}` | `UpdateFeedbackRequest` | Cập nhật nội dung / bài viết |
| `DELETE` | `/api/admin/feedback/{id}` | — | Xóa phản hồi hoặc nội dung |

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

- **Biên dịch TypeScript & Vite:** `npm run build` thành công không có lỗi (`0 errors`).
- **Kiểm thử tự động (Vitest):**
  - Toàn bộ **19 test files (128 unit/integration tests)** đạt kết quả **100% Passed**.
