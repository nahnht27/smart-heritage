# Bản demo offline — 12 hiện vật, media lưu trong PostgreSQL

## 1. Cách hoạt động

```text
PostgreSQL (multimedia_file) ──> GET /api/offline/manifest
                                 GET /api/multimedia/{id}/file
        │  Wi-Fi nội bộ, tải 1 lần (khoảng 30 MB, không cần Internet)
        ▼
App: bộ nhớ riêng của app ──> xem hiện vật, ảnh, audio, video, quét beacon
        │  tương tác lúc mất mạng được xếp hàng
        ▼
POST /api/interactions khi kết nối lại (eventId giữ nguyên nên không ghi trùng)
```

- Khi đã tải gói, app **ưu tiên dữ liệu trên máy**. Nội dung sửa trên Admin Web
  chỉ xuất hiện sau khi bấm **Cập nhật**.
- Đăng nhập và đăng ký vẫn cần máy chủ. Khi demo offline dùng
  "Tiếp tục với tư cách Khách tham quan".
- Gói chỉ được thay khi tải đủ mọi file; tải dở thì gói cũ vẫn dùng được.
- Admin Web chưa có chức năng upload file. Đổi URL hoặc loại của một mục
  multimedia sẽ xoá file đã lưu của mục đó.

## 2. Chuẩn bị dữ liệu (trên máy chủ demo)

Yêu cầu: Docker, Python 3. Backend đã chạy bản có migration V5.

```bash
docker compose up -d --build

# Chỉ cần Internet cho 2 bước này; kết quả nằm trong demo-content/ (git bỏ qua)
python3 scripts/demo-content/fetch_media.py
docker build -t smart-heritage-media-tool scripts/demo-content
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/repo -w /repo \
  smart-heritage-media-tool python scripts/demo-content/build_media.py

# Sao lưu trước, rồi nạp
mkdir -p backups
docker exec smart-heritage-db pg_dump -U postgres -Fc smart_heritage \
  > "backups/before_seed_$(date +%Y%m%d_%H%M%S).dump"
python3 scripts/demo-content/seed.py          # xem trước
python3 scripts/demo-content/seed.py --apply
```

`seed.py` thay tên, mô tả, địa điểm và **toàn bộ multimedia** của hiện vật có ID
1–12. Tài khoản và lịch sử tương tác không bị đụng tới.

Nội dung nằm ở [`content.json`](../../scripts/demo-content/content.json), nguồn
ảnh ở [`CREDITS.md`](../../scripts/demo-content/CREDITS.md). Audio là giọng đọc
tổng hợp (Piper `vi_VN-vais1000-medium`, huấn luyện từ bộ dữ liệu VAIS-1000);
video dựng từ chính các ảnh đó, không phải phim tư liệu. Mô tả hiện vật được soạn
từ Wikipedia tiếng Việt và thông tin trên Wikimedia Commons — nên rà lại trước
khi công bố ra ngoài buổi demo.

## 3. Build và cài APK

```bash
cd mobile && npm ci --legacy-peer-deps && cd ..
scripts/deployment/build-android-demo.sh http://<IP_LAN>:8081/api
```

File ra ở `mobile/artifacts/`. APK ký bằng debug key và cho phép HTTP, chỉ dùng
demo. Địa chỉ máy chủ đổi được ngay trên điện thoại: **Home → Xem không cần
mạng → Máy chủ**, nhập `IP:cổng`.

## 4. Mạng LAN trên Windows + WSL

Backend trong WSL chỉ nghe được từ `localhost` của Windows, nên điện thoại đi qua
proxy `0.0.0.0:8081 → 127.0.0.1:8080` (xem [LTJ-70](../logs/LTJ-70.md) mục 6).
Kiểm tra bằng trình duyệt điện thoại:
`http://<IP_LAN>:8081/api/health`.

Không có router: bật Mobile Hotspot trên Windows, cho điện thoại kết nối vào và
dùng IP của hotspot.

## 5. Giả lập iBeacon bằng điện thoại thứ hai

App quét vùng `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0`. Trên điện thoại thứ hai cài
một app phát iBeacon (ví dụ "Beacon Simulator" trên Android), tạo beacon:

| Trường | Giá trị |
|---|---|
| Loại | iBeacon |
| UUID | `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0` |
| Major | `1` |
| Minor | `101`–`112` (101 + thứ tự hiện vật − 1) |
| TX power / tần suất | mức cao nhất |

| Minor | Hiện vật |
|---|---|
| 101 | Trống đồng Đông Sơn |
| 102 | Kiếm ngắn núi Nưa |
| 103 | Bia Tiến sĩ |
| 104 | Bia Võ Cạnh |
| 105 | Chuông đồng Văn Miếu |
| 106 | Lư hương gốm Bát Tràng |
| 107 | Thạp đồng Đào Thịnh |
| 108 | Khuê Văn Các |
| 109 | Giếng Thiên Quang |
| 110 | Bình gốm Bát Tràng tích Ngư ông đắc lợi |
| 111 | Tượng Công chúa Lê Thị Ngọc Duyên |
| 112 | Tượng Hoàng hậu Trịnh Thị Ngọc Trúc |

App kích hoạt khi RSSI ≥ −75 dBm liên tục khoảng 2 giây, cooldown 60 giây cho
mỗi beacon, và chỉ quét khi đang ở màn hình Home. Đặt hai điện thoại cách nhau
dưới 1 m nếu không thấy kích hoạt.

Beacon giả lập chứng minh được luồng quét BLE thật trên app, nhưng không thay thế
kiểm thử với phần cứng beacon; khi ghi evidence phải nêu rõ là giả lập.

## 6. Kịch bản kiểm thử trên thiết bị

| # | Bước | Kỳ vọng | Kết quả |
|---|---|---|---|
| 1 | Cài APK, vào với tư cách khách | Home hiện nội dung | |
| 2 | Bấm "Tải về máy" | Thanh tiến độ chạy tới hết, báo 12 hiện vật | |
| 3 | Bật chế độ máy bay, bật lại **Bluetooth** | App vẫn mở được | |
| 4 | Mở lại app, mở danh sách và vài hiện vật | Đủ ảnh, nghe audio, xem video | |
| 5 | Bật quét beacon, phát minor 101 | Banner "Trống đồng Đông Sơn" | |
| 6 | Đổi sang minor 102 trong vòng 60 giây | Kích hoạt hiện vật thứ hai | |
| 7 | Quay lại 101 trong cooldown | Không ghi trùng | |
| 8 | Phát video rồi về Home / đưa app xuống nền | Media tạm dừng, không tự phát lại | |
| 9 | Nối lại Wi-Fi, mở app | Tương tác lúc offline xuất hiện trên Dashboard | |

Một số máy yêu cầu bật dịch vụ Vị trí để quét BLE; định vị không cần Internet.
