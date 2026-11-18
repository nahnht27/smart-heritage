# LTJ-67 — Chuẩn bị dữ liệu Demo và Seed Database

## 1. Tiến độ đã hoàn thành

### Kiểm tra cấu trúc dữ liệu
- Đã kiểm tra các Entity: HeritageSite, Artifact, Multimedia, Beacon và VisitorInteraction.
- Xác nhận mỗi Artifact phải thuộc một HeritageSite.
- Xác nhận mỗi Multimedia phải thuộc một Artifact.
- Beacon có định danh duy nhất theo bộ ba Proximity UUID, Major và Minor.
- Beacon có thể được ánh xạ tới Artifact; quan hệ này có thể để trống.
- VisitorInteraction yêu cầu eventId duy nhất, visitorId, Artifact, loại tương tác, ngôn ngữ và thời gian hợp lệ.

### Kiểm tra nghiệp vụ tương tác
- BEACON_TRIGGER bắt buộc có Beacon đang bật.
- Beacon phải được ánh xạ tới đúng Artifact trong lượt tương tác.
- Các loại tương tác khác không được truyền beaconId.
- eventId được sử dụng để kiểm soát gửi sự kiện trùng lặp.

### Kiểm tra Analytics
- Số lượng khách truy cập duy nhất được tính theo visitorId.
- Dữ liệu Timeseries được nhóm theo ngày UTC.
- Các ngày không có tương tác vẫn được trả về với giá trị 0.
- Khoảng thời gian truy vấn sử dụng quy ước [from, to).
- Thống kê ngôn ngữ được chuẩn hóa bằng cách loại bỏ khoảng trắng đầu và cuối.

### Kiểm tra và cập nhật Database
- Đã tạo bản sao lưu PostgreSQL trước khi chạy migration.
- Đã áp dụng thành công Flyway V3 và V4 trên PostgreSQL local.
- Đã xác minh Flyway Schema History cập nhật thành công đến V4.
- Đã xác minh bảng Beacon và các ràng buộc khóa ngoại, khóa duy nhất, giới hạn Major/Minor.
- Đã xác minh VisitorInteraction có visitorId và beaconId theo thiết kế.
- Đã xác nhận các bảng dữ liệu nghiệp vụ hiện chưa có dữ liệu demo.

### Kiểm tra Backend
- Đã build Docker image Backend thành công.
- Kết quả kiểm thử: 154 tests, không có lỗi hoặc thất bại.

### Kiểm thử truy cập media demo
- Đã thêm DemoMediaAccessTest kiểm tra truy cập /demo-media/test-image.png không cần JWT.
- Kết quả: BUILD SUCCESS; 1 test chạy, 0 lỗi, 0 thất bại.
- Xác nhận response có content type tương thích image/png.
- Test chạy bằng Maven container maven:3.9.6-eclipse-temurin-17, sử dụng profile test và H2; không ghi dữ liệu vào PostgreSQL demo.


### Chuẩn bị ảnh demo cho HeritageSite và Artifact
- Đã bổ sung 2 ảnh HeritageSite và 8 ảnh Artifact vào src/main/resources/static/demo-media/.
- Ảnh được phân chia thành hai thư mục sites/ và artifacts/.
- Đã kiểm tra danh sách file: đủ 10 file, tất cả có dung lượng lớn hơn 0 byte.
- Đã xác minh URL truy cập thực tế của cả 10 ảnh trên Docker Backend, tất cả trả HTTP 200 và image/jpeg.
- Nguồn gốc và giấy phép sử dụng của từng ảnh vẫn chưa được xác minh.


### Xác minh truy cập Demo Media trên Docker Backend

- Đã rebuild image `laptrinh-java-backend` sau khi cập nhật `SecurityConfig`.
- Đã khởi động lại service backend bằng Docker Compose.
- Đã kiểm tra GET trực tiếp toàn bộ 10 ảnh trong `demo-media/sites/` và `demo-media/artifacts/`.
- Kết quả: cả 10 URL đều trả về HTTP 200 và Content-Type `image/jpeg`.
- Các URL `/demo-media/**` truy cập được mà không cần JWT.
- Chưa xác minh nguồn gốc và giấy phép sử dụng của từng ảnh; cần hoàn tất việc này trước khi công bố dữ liệu demo.

### Đối chiếu Schema và DTO phục vụ Demo Seed

- Đã kiểm tra trực tiếp các migration V1, V2, V3 và V4.
- Xác nhận quan hệ khóa ngoại HeritageSite → Artifact → Multimedia.
- Xác nhận VisitorInteraction hỗ trợ khách ẩn danh với user_id có thể NULL và visitor_id bắt buộc.
- Xác nhận Beacon có unique constraint trên (proximity_uuid, major, minor).
- Xác nhận Major và Minor có CHECK constraint trong khoảng 0–65535.
- Xác nhận Beacon mặc định enabled = true và visitor_interaction.beacon_id sử dụng ON DELETE SET NULL.
- Đã đối chiếu các Entity HeritageSite, Artifact, Multimedia, Beacon và VisitorInteraction với schema.
- Đã kiểm tra CreateInteractionRequest: các loại sự kiện hợp lệ gồm VIEW, AUDIO_PLAY, SCAN và BEACON_TRIGGER.
- Xác nhận languageCode tuân thủ định dạng ngôn ngữ và eventId, visitorId là UUID bắt buộc.

### Kiểm tra trạng thái dữ liệu PostgreSQL trước khi Seed

- Đã truy vấn số lượng bản ghi trên PostgreSQL database smart_heritage.
- heritage_site: 0 bản ghi.
- artifact: 0 bản ghi.
- multimedia: 0 bản ghi.
- beacon: 0 bản ghi.
- visitor_interaction: 0 bản ghi.
- Chưa thực hiện thao tác ghi dữ liệu demo vào PostgreSQL.

### Kiểm tra cấu hình và cơ chế khởi tạo dữ liệu

- Đã kiểm tra application.yml: Flyway được bật, baseline-on-migrate=false, Hibernate ddl-auto=validate và Flyway clean-disabled=true.
- Chưa tìm thấy seed script hoặc initializer riêng trong src/main qua kiểm tra tên file.
- Định hướng triển khai seed độc lập, chạy chủ động, không tự động nạp dữ liệu khi Backend khởi động và không ảnh hưởng môi trường production.
### Kiểm tra vị trí đặt Demo Seed Script
- Đã kiểm tra thư mục backend/scripts/ tại thời điểm thực hiện.
- Kết quả: thư mục chưa tồn tại, chưa có seed script tại vị trí này.
- Chưa tạo script và chưa ghi dữ liệu vào PostgreSQL.
- Hướng triển khai tiếp theo: tạo script seed độc lập, chạy thủ công và hỗ trợ chạy lặp an toàn.


### Kiểm tra Index, Constraint và Trigger trên PostgreSQL
- Đã kiểm tra pg_indexes trên 5 bảng demo.
- Xác nhận unique index uk_beacon_identity trên (proximity_uuid, major, minor).
- Xác nhận unique index uk_visitor_interaction_event_id trên event_id.
- Xác nhận các index hỗ trợ truy vấn Artifact, Beacon, VisitorInteraction và Analytics.
- Xác nhận CHECK constraint Major/Minor trong khoảng 0–65535.
- Không phát hiện trigger trên 5 bảng HeritageSite, Artifact, Multimedia, Beacon và VisitorInteraction.
- Chưa tạo seed script và chưa ghi dữ liệu demo vào PostgreSQL.
