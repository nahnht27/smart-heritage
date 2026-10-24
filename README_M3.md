# Sprint 3 — M3: Mobile Content Integration & Visitor Events

## Vai trò và mục tiêu
Phụ trách ứng dụng React Native/Expo. Sprint này thay một phần mock data nội dung bằng API backend thật và chuẩn bị ghi nhận hành vi người tham quan. Giữ cấu trúc navigation và UI hiện có; không làm lại app từ đầu.

## Hai task của M3

### S3-M3-01 — Kết nối Mobile với API Heritage Sites và Artifacts

**Phạm vi**
- Đọc lại code hiện tại trong `mobile/` và giữ các thay đổi authentication đã được review.
- Tích hợp API theo contract do M2/M1 xác nhận:
  - Lấy danh sách Heritage Sites.
  - Lấy thông tin chi tiết Heritage Site.
  - Lấy danh sách Artifact theo site và chi tiết Artifact khi endpoint sẵn sàng.
  - Hiển thị Multimedia gắn với Artifact khi API đã được cung cấp.
- Thay mock data ở những màn hình thuộc scope trên bằng dữ liệu backend. Các mock screen ngoài scope cần ghi rõ là mock, không giả vờ dữ liệu đã lấy từ server.
- Bổ sung loading, empty state, lỗi kết nối và nút retry phù hợp.
- Dùng API prefix `/api` và biến `EXPO_PUBLIC_API_BASE_URL` hiện có; không hard-code URL cho một máy cụ thể trong code production.

**Acceptance criteria**
- Danh sách/chi tiết lấy dữ liệu từ backend thật và map đúng DTO.
- Loading, dữ liệu rỗng, lỗi HTTP/network được hiển thị rõ.
- Không làm hỏng login/profile đã có; token chỉ gửi cho endpoint cần xác thực.
- Có hướng dẫn cách cấu hình base URL cho Android emulator/iOS/Web.
- Chạy được typecheck/lint hoặc ghi rõ lỗi môi trường và command thực tế.

### S3-M3-02 — Gửi visitor interaction events từ Mobile

**Phạm vi**
- Tích hợp `POST /api/interactions` **sau khi M5 và M1 chốt contract bằng tài liệu**; không tự thiết kế payload khác.
- MVP ưu tiên ghi nhận tương tác có thể quan sát thật từ UI, ví dụ người dùng mở/đọc Artifact (`MANUAL_VIEW`) nếu được contract phê duyệt.
- Chỉ gửi `FAVORITE_ADD`/`FAVORITE_REMOVE` khi chức năng favorite và contract tương ứng thực sự được triển khai; hiện trạng mock không được coi là backend event thật.
- Không phát sinh `BEACON_TRIGGER` giả khi iBeacon chưa tích hợp.
- Tạo `eventId` đúng quy định của contract, xử lý lỗi gửi event mà không làm crash hoặc chặn việc đọc nội dung; không log token hay dữ liệu cá nhân.

**Acceptance criteria**
- Payload gửi đúng schema được M5/M1 duyệt và backend phản hồi được xử lý đúng.
- Event tương ứng với thao tác người dùng thật, tránh gửi lặp không chủ đích.
- API lỗi không làm hỏng luồng xem nội dung; có xử lý/retry nếu phù hợp với contract.
- Tài liệu nêu event nào đã tích hợp và event nào chưa có vì thiếu tính năng/phần cứng.

## Dependencies và phối hợp
- M2 cung cấp GET APIs và DTO nội dung; không tự giả định field ngoài contract.
- M5 sở hữu backend ingest interactions; M1 điều phối/duyệt contract chung. Chỉ tích hợp event sau khi contract và quy tắc `userId`/guest đã được thống nhất.
- Nếu backend hiện yêu cầu user đã đăng nhập nhưng Mobile đang hỗ trợ guest mode, báo blocker cho M1/M5; không gửi `userId: null` khi schema chưa cho phép.

## Quy ước triển khai
- Chỉ sửa `mobile/` và tài liệu liên quan.
- Giữ API prefix `/api`; không sửa backend hoặc đổi contract của M1/M2/M5.
- Không đưa secrets vào repo; không tuyên bố BLE đã tích hợp khi chưa có BLE implementation.

## Definition of Done
- [ ] Nội dung trong scope lấy từ backend thật, không phải mock.
- [ ] Có loading/empty/error state.
- [ ] Interaction events chỉ gửi theo contract đã duyệt.
- [ ] Typecheck/lint và hướng dẫn chạy được cập nhật với kết quả thực tế.
- [ ] Branch/commit đã push, working tree sạch và PR sẵn sàng review; không tự merge vào `main`.
