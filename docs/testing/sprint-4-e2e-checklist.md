# Sprint 4 — Manual Cross-Module E2E Checklist

Checklist này dành cho kiểm thử thủ công trên máy có **Android Emulator / iOS
Simulator** và **trình duyệt**. API smoke test **không** thay thế checklist này.

Trạng thái: `[ ]` chưa chạy · `[x]` pass · `[!]` fail · `[~]` blocked/pending

> Môi trường CI/headless của M1 không chạy được UI, nên các mục dưới đây để
> `[ ]` (PENDING) và cần một thành viên có emulator/browser xác nhận.

## 0. Chuẩn bị

- [ ] `docker compose up -d --build`; `docker compose ps` thấy backend + postgres `healthy`.
      (Máy chỉ có bản legacy thì dùng `docker-compose`.)
- [ ] `curl http://localhost:8080/api/health` → `{"status":"UP",...}`.
- [ ] Có ít nhất 1 heritage site, 1 artifact, 1 multimedia (tạo bằng Admin Web hoặc SQL seed).
- [ ] Có tài khoản VISITOR và ADMIN.
- [ ] Backend reachable từ emulator/thiết bị theo `mobile/.env.example`.

## 1. Visitor Mobile flow

- [ ] Mở Mobile App (Expo), không crash.
- [ ] Trang Home hiển thị danh sách Heritage Sites từ backend (không phải mock).
- [ ] Chọn một Heritage Site.
- [ ] Danh sách Artifacts hiển thị đúng site đã chọn.
- [ ] Mở Artifact Detail, dữ liệu khớp backend.
- [ ] Multimedia của artifact hiển thị.
- [ ] Phát Audio nếu artifact có multimedia type `AUDIO`.
- [ ] Thực hiện hành động hợp lệ (mở/nghe) và xác nhận interaction event được gửi
      (log/network tab, không lộ token).
- [ ] Kiểm tra record mới trong PostgreSQL:
      `SELECT * FROM visitor_interaction ORDER BY interaction_id DESC LIMIT 5;`

Ghi chú: M3 đã merge vào `main`; nếu màn hình tương ứng chưa nối interaction,
đánh dấu `[~]` và ghi rõ màn hình nào còn thiếu.

## 2. Admin Web flow

- [ ] Mở Admin Web (`npm run dev`), truy cập trang login.
- [ ] Đăng nhập bằng ADMIN → vào dashboard.
- [ ] Đăng xuất → token bị xóa, quay về login.
- [ ] Xem danh sách Heritage Sites.
- [ ] Tạo một test Heritage Site.
- [ ] Sửa test Heritage Site vừa tạo.
- [ ] Xóa test Heritage Site (chỉ dữ liệu test do mình tạo).
- [ ] Quản lý Artifacts (list/create/update/delete trên dữ liệu test).
- [ ] Quản lý Multimedia (list/create/update/delete trên dữ liệu test).
- [ ] Mở Analytics Dashboard.
- [ ] Số liệu dashboard khớp `GET /api/analytics/interactions/summary`
      (cùng khoảng thời gian nếu có filter).

## 3. Authorization flow

- [ ] Anonymous mở nội dung public (danh sách site/artifact/multimedia) → OK.
- [ ] Anonymous gọi protected API (`/api/users/me`, analytics) → 401.
- [ ] VISITOR đăng nhập, xem profile → OK.
- [ ] VISITOR gọi analytics → 403.
- [ ] VISITOR thử POST/PUT/DELETE nội dung → 403.
- [ ] ADMIN gọi analytics và content write APIs → OK.
- [ ] Logout xóa token/session; request sau logout không còn Authorization.

## 4. Error / resilience

- [ ] Tắt backend rồi mở app/web → hiển thị thông báo lỗi thân thiện, không crash.
- [ ] Bật lại backend → retry/refresh hoạt động.
- [ ] Token hết hạn/không hợp lệ → app xóa token và yêu cầu đăng nhập lại.

## 5. Kết quả

| Mục | Trạng thái | Ghi chú / người kiểm thử |
|-----|-----------|--------------------------|
| Visitor Mobile flow | PENDING | |
| Admin Web flow | PENDING | |
| Authorization flow | PENDING | |
| Error / resilience | PENDING | |
