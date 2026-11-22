# Demo Media Attribution

## 1. Phạm vi

Tài liệu này theo dõi nguồn gốc, giấy phép và attribution của media demo được
công bố cùng backend Smart Heritage.

Thư mục hiện tại:

```text
backend/src/main/resources/static/demo-media/artifacts/
```

Có 20 ảnh JPEG được seed thành 20 bản ghi Multimedia. Mỗi ảnh được tham chiếu
bởi đúng một Artifact trong `backend/scripts/seed-demo-data.ps1`.

Hai ảnh HeritageSite trước đây (`demo-media/sites/site_01_thang_long_citadel.jpg`
và `demo-media/sites/site_02_hue_imperial_city.jpg`) đã được loại bỏ khỏi bundle
vì model HeritageSite không có trường ảnh và frontend/mobile không tham chiếu
đến chúng.

## 2. Trạng thái xác minh

Repository không chứa metadata nguồn, tác giả hoặc giấy phép cho các ảnh demo.
Không có giấy phép nào được suy đoán hoặc ghi nhận thay cho chủ sở hữu.

Trạng thái chung:

```text
PENDING — chưa xác minh nguồn và quyền sử dụng
```

Các ảnh chỉ được dùng cho môi trường demo nội bộ. Không công bố, phát hành hoặc
dùng ngoài phạm vi đồ án cho đến khi từng ảnh được đối chiếu với nguồn và giấy
phép tương ứng.

## 3. Inventory

| # | Tệp | Artifact trong seed | Kiểu | Trạng thái |
|---:|---|---|---|---|
| 1 | `artifact_01_01_kinh_thien_stone_dragon.jpg` | Rồng đá thềm điện Kính Thiên | image/jpeg | PENDING |
| 2 | `artifact_01_02_thang_long_ancient_ceramics.jpg` | Đồ gốm khai quật tại Hoàng thành Thăng Long | image/jpeg | PENDING |
| 3 | `artifact_01_03_ly_phoenix_bodhi_leaf.jpg` | Hình tượng phượng trên lá đề | image/jpeg | PENDING |
| 4 | `artifact_01_04_early_le_white_dragon_bowl.jpg` | Bát gốm men trắng | image/jpeg | PENDING |
| 5 | `artifact_01_05_thang_long_doan_mon.jpg` | Đoan môn Hoàng thành Thăng Long | image/jpeg | PENDING |
| 6 | `artifact_02_01_hue_nine_dynastic_urns.jpg` | Cửu đỉnh Đại Nội Huế | image/jpeg | PENDING |
| 7 | `artifact_02_02_nguyen_dynasty_nine_holy_cannons.jpg` | Cửu vị thần công | image/jpeg | PENDING |
| 8 | `artifact_02_03_minh_mang_ngo_mon_bell.jpg` | Chuông Ngọ Môn | image/jpeg | PENDING |
| 9 | `artifact_02_04_minh_mang_stone_relief.jpg` | Phù điêu đá thời Minh Mạng | image/jpeg | PENDING |
| 10 | `artifact_02_05_hue_ngo_mon_gate.jpg` | Cổng Ngọ Môn | image/jpeg | PENDING |
| 11 | `artifact_03_01_van_mieu_khue_van_cac.jpg` | Khuê Văn Các | image/jpeg | PENDING |
| 12 | `artifact_03_02_van_mieu_doctoral_steles.jpg` | Bia Tiến sĩ | image/jpeg | PENDING |
| 13 | `artifact_03_03_van_mieu_thien_quang_well.jpg` | Giếng Thiên Quang | image/jpeg | PENDING |
| 14 | `artifact_03_04_van_mieu_dai_thanh_hall.jpg` | Đại Thành môn | image/jpeg | PENDING |
| 15 | `artifact_03_05_van_mieu_thai_hoc_house.jpg` | Nhà Thái Học | image/jpeg | PENDING |
| 16 | `artifact_04_01_ho_citadel_south_gate.jpg` | Cổng Nam Thành nhà Hồ | image/jpeg | PENDING |
| 17 | `artifact_04_02_ho_citadel_north_gate.jpg` | Cổng Bắc Thành nhà Hồ | image/jpeg | PENDING |
| 18 | `artifact_04_03_ho_citadel_east_gate.jpg` | Cổng Đông Thành nhà Hồ | image/jpeg | PENDING |
| 19 | `artifact_04_04_ho_citadel_west_gate.jpg` | Cổng Tây Thành nhà Hồ | image/jpeg | PENDING |
| 20 | `artifact_04_05_ho_citadel_stone_walls.jpg` | Tường thành đá Thành nhà Hồ | image/jpeg | PENDING |

## 4. Thông tin cần bổ sung trước khi công bố

Với mỗi ảnh, cần ghi rõ:

- URL hoặc tài liệu nguồn.
- Tác giả/chủ sở hữu.
- Tên giấy phép và liên kết điều khoản.
- Nội dung attribution bắt buộc.
- Ngày xác minh và người xác minh.

Cho đến khi hoàn tất, cột trạng thái phải giữ `PENDING`. Không thay bằng
"public domain", "CC0" hoặc giấy phép khác khi chưa có bằng chứng.
