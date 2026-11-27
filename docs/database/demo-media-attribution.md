# Demo Media Attribution

Ngày audit: 2026-11-24.

## 1. Kết luận

| Hạng mục | Số lượng |
|---|---:|
| Ảnh bên thứ ba được CLEARED (có bằng chứng giấy phép) | 0 |
| Ảnh gốc (original project-created placeholder) trong cây hiện tại | 20 |
| Ảnh bên thứ ba còn NOT CLEARED trong cây hiện tại | 0 |

20 ảnh JPEG ban đầu (commit `98ebf75`, `798cf5f`) **không có bằng chứng** về
nguồn, tác giả hoặc giấy phép: repo không chứa metadata nguồn, không có EXIF/
XMP/chuỗi bản quyền trong tệp, commit message và tài liệu cũng không ghi nguồn.
Việc ảnh truy cập được công khai hoặc không có watermark không phải là giấy phép.
Vì vậy cả 20 ảnh được phân loại **NOT CLEARED** và đã bị thay thế. Không ảnh nào
được đánh dấu CLEARED chỉ vì đã bị thay.

## 2. Phạm vi

Thư mục: `backend/src/main/resources/static/demo-media/artifacts/`. Mỗi tệp được
tham chiếu bởi đúng một Artifact trong `backend/scripts/seed-demo-data.ps1`
(20 bản ghi Multimedia). Tên tệp và URL `/demo-media/artifacts/<tên>` giữ nguyên.
Ảnh HeritageSite (`demo-media/sites/*`) đã bị loại bỏ trước đó vì không được dùng.

## 3. Audit 20 ảnh gốc ban đầu

Tiêu chí: nguồn gốc, tác giả, giấy phép + phiên bản, quyền tái phân phối trên
repo công khai, điều kiện attribution. Cả 5 mục đều **không xác định được** cho
mọi ảnh.

| # | Tệp | Artifact | Phân loại | Bằng chứng | Xử lý |
|---:|---|---|---|---|---|
| 1 | `artifact_01_01_kinh_thien_stone_dragon.jpg` | Rồng đá thềm điện Kính Thiên | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 2 | `artifact_01_02_thang_long_ancient_ceramics.jpg` | Đồ gốm khai quật tại Hoàng thành Thăng Long | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 3 | `artifact_01_03_ly_phoenix_bodhi_leaf.jpg` | Hình tượng phượng trên lá đề | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 4 | `artifact_01_04_early_le_white_dragon_bowl.jpg` | Bát gốm men trắng | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 5 | `artifact_01_05_thang_long_doan_mon.jpg` | Đoan môn Hoàng thành Thăng Long | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 6 | `artifact_02_01_hue_nine_dynastic_urns.jpg` | Cửu đỉnh Đại Nội Huế | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 7 | `artifact_02_02_nguyen_dynasty_nine_holy_cannons.jpg` | Cửu vị thần công | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 8 | `artifact_02_03_minh_mang_ngo_mon_bell.jpg` | Chuông Ngọ Môn | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 9 | `artifact_02_04_minh_mang_stone_relief.jpg` | Phù điêu đá thời Minh Mạng | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 10 | `artifact_02_05_hue_ngo_mon_gate.jpg` | Cổng Ngọ Môn | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 11 | `artifact_03_01_van_mieu_khue_van_cac.jpg` | Khuê Văn Các | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 12 | `artifact_03_02_van_mieu_doctoral_steles.jpg` | Bia Tiến sĩ | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 13 | `artifact_03_03_van_mieu_thien_quang_well.jpg` | Giếng Thiên Quang | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 14 | `artifact_03_04_van_mieu_dai_thanh_hall.jpg` | Đại Thành môn | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 15 | `artifact_03_05_van_mieu_thai_hoc_house.jpg` | Nhà Thái Học | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 16 | `artifact_04_01_ho_citadel_south_gate.jpg` | Cổng Nam Thành nhà Hồ | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 17 | `artifact_04_02_ho_citadel_north_gate.jpg` | Cổng Bắc Thành nhà Hồ | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 18 | `artifact_04_03_ho_citadel_east_gate.jpg` | Cổng Đông Thành nhà Hồ | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 19 | `artifact_04_04_ho_citadel_west_gate.jpg` | Cổng Tây Thành nhà Hồ | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |
| 20 | `artifact_04_05_ho_citadel_stone_walls.jpg` | Tường thành đá Thành nhà Hồ | NOT CLEARED | Không có nguồn, tác giả hay giấy phép trong repo | Thay bằng placeholder gốc |

## 4. Ảnh hiện tại: placeholder gốc do dự án tạo

| # | Tệp | Artifact | Định dạng | Loại |
|---:|---|---|---|---|
| 1 | `artifact_01_01_kinh_thien_stone_dragon.jpg` | Rồng đá thềm điện Kính Thiên | image/jpeg 1200×800 | Original project-created |
| 2 | `artifact_01_02_thang_long_ancient_ceramics.jpg` | Đồ gốm khai quật tại Hoàng thành Thăng Long | image/jpeg 1200×800 | Original project-created |
| 3 | `artifact_01_03_ly_phoenix_bodhi_leaf.jpg` | Hình tượng phượng trên lá đề | image/jpeg 1200×800 | Original project-created |
| 4 | `artifact_01_04_early_le_white_dragon_bowl.jpg` | Bát gốm men trắng | image/jpeg 1200×800 | Original project-created |
| 5 | `artifact_01_05_thang_long_doan_mon.jpg` | Đoan môn Hoàng thành Thăng Long | image/jpeg 1200×800 | Original project-created |
| 6 | `artifact_02_01_hue_nine_dynastic_urns.jpg` | Cửu đỉnh Đại Nội Huế | image/jpeg 1200×800 | Original project-created |
| 7 | `artifact_02_02_nguyen_dynasty_nine_holy_cannons.jpg` | Cửu vị thần công | image/jpeg 1200×800 | Original project-created |
| 8 | `artifact_02_03_minh_mang_ngo_mon_bell.jpg` | Chuông Ngọ Môn | image/jpeg 1200×800 | Original project-created |
| 9 | `artifact_02_04_minh_mang_stone_relief.jpg` | Phù điêu đá thời Minh Mạng | image/jpeg 1200×800 | Original project-created |
| 10 | `artifact_02_05_hue_ngo_mon_gate.jpg` | Cổng Ngọ Môn | image/jpeg 1200×800 | Original project-created |
| 11 | `artifact_03_01_van_mieu_khue_van_cac.jpg` | Khuê Văn Các | image/jpeg 1200×800 | Original project-created |
| 12 | `artifact_03_02_van_mieu_doctoral_steles.jpg` | Bia Tiến sĩ | image/jpeg 1200×800 | Original project-created |
| 13 | `artifact_03_03_van_mieu_thien_quang_well.jpg` | Giếng Thiên Quang | image/jpeg 1200×800 | Original project-created |
| 14 | `artifact_03_04_van_mieu_dai_thanh_hall.jpg` | Đại Thành môn | image/jpeg 1200×800 | Original project-created |
| 15 | `artifact_03_05_van_mieu_thai_hoc_house.jpg` | Nhà Thái Học | image/jpeg 1200×800 | Original project-created |
| 16 | `artifact_04_01_ho_citadel_south_gate.jpg` | Cổng Nam Thành nhà Hồ | image/jpeg 1200×800 | Original project-created |
| 17 | `artifact_04_02_ho_citadel_north_gate.jpg` | Cổng Bắc Thành nhà Hồ | image/jpeg 1200×800 | Original project-created |
| 18 | `artifact_04_03_ho_citadel_east_gate.jpg` | Cổng Đông Thành nhà Hồ | image/jpeg 1200×800 | Original project-created |
| 19 | `artifact_04_04_ho_citadel_west_gate.jpg` | Cổng Tây Thành nhà Hồ | image/jpeg 1200×800 | Original project-created |
| 20 | `artifact_04_05_ho_citadel_stone_walls.jpg` | Tường thành đá Thành nhà Hồ | image/jpeg 1200×800 | Original project-created |

- Cách tạo: sinh bằng chương trình bởi `scripts/tools/generate-demo-placeholders.py`
  (Pillow, font DejaVu Sans) — hình học đơn giản và chữ; không sao chép, tải về
  hay dựng lại từ ảnh bên thứ ba.
- Tác giả/chủ sở hữu: dự án Smart Heritage (nội dung tự tạo cho đồ án).
- Giấy phép/điều khoản phân phối: repository hiện chưa có tệp LICENSE; chủ dự án
  chưa chọn giấy phép cho các ảnh này. Không áp dụng giấy phép bên thứ ba nào.
  Cần chọn giấy phép repository nếu muốn cho phép tái sử dụng.
- Attribution bắt buộc: không có.
- Mỗi ảnh ghi rõ `ẢNH MINH HỌA` và nêu đây không phải ảnh chụp hiện vật/di tích
  thật. Không dùng làm ảnh tư liệu lịch sử.
- Đây là ảnh minh họa; không phải tài liệu đã được xác minh về hiện vật.

## 5. Hạn chế còn lại

- Nếu muốn dùng ảnh thật, mỗi ảnh phải có nguồn, tác giả, giấy phép (tên + phiên
  bản + liên kết), điều kiện attribution và ngày xác minh trước khi đưa vào repo;
  khi đó ghi riêng là `CLEARED` trong bảng mới. Không suy đoán "public domain"/CC0.
- **Lịch sử Git:** blob của 20 ảnh gốc vẫn tồn tại trong các commit `98ebf75`,
  `798cf5f` (và bản xóa ở `6bea36e`) thuộc nhánh công khai
  `feat/s6-m2-01-demo-seed`/PR #42. Cây hiện tại không còn chứa chúng, nhưng
  lịch sử chưa được viết lại. Xem mô tả PR #42 để biết trạng thái và khuyến nghị.
