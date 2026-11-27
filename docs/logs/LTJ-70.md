# Log: LTJ-70 — Physical iBeacon End-to-End Acceptance

## Thông tin chung

- **Task:** LTJ-70 / S6-M3-01 — Physical iBeacon End-to-End Acceptance
- **Nhánh:** `LTJ-70`
- **Phạm vi:** Android physical device + iBeacon thật → Resolve API → artifact detail → `BEACON_TRIGGER`; cooldown/lifecycle.
- **Kết luận nhanh:** Ngày 28/11/2026 các tiêu chí chức năng **PASS trên điện thoại thật với beacon giả lập**. Beacon phần cứng và tắt dịch vụ Vị trí vẫn **NOT VERIFIED**; screenshot/video còn **PENDING**.

> Không đánh dấu physical item là PASS nếu chưa chạy trên thiết bị thật. Unit test,
> Docker API smoke và mock không thay thế hardware acceptance.

## 1. Phụ thuộc

- Backend reachable từ điện thoại qua LAN IP.
- Admin có Beacon A/B mapping tới Artifact A/B.
- Android phone thật; native APK/development build.
- Tối thiểu 1 physical iBeacon; khuyến nghị 2 beacon cùng UUID, khác Minor.
- Quyền Bluetooth/Location và Bluetooth/Location Services đang bật.

Checklist thao tác đầy đủ:
[`docs/testing/sprint-5-beacon-physical-demo-checklist.md`](../testing/sprint-5-beacon-physical-demo-checklist.md).

## 2. Evidence tự động đã có

Từ LTJ-58:

| Evidence | Kết quả |
|---|---|
| Backend unit tests | **PASS** — 154 tests |
| `BeaconResolutionIntegrityIT` trên PostgreSQL 16 | **PASS** — 17 tests |
| Mobile Jest | **PASS** — 12 suites, 108 tests |
| Docker live API resolve/interaction | **PASS** — 200/404, `BEACON_TRIGGER` persisted |
| Android native build/device | **NOT VERIFIED** |

Các test backend xác nhận resolve enabled/disabled/unknown/unmapped, DB constraints,
duplicate identity, FK, delete integrity và concurrent resolve. Không xác nhận BLE
native callback trên điện thoại.

### 2.1. Chuẩn bị M3 — 2026-11-20

| Hạng mục | Kết quả |
|---|---|
| Backend tests trong Docker image `smart-heritage-backend:ltj70-prep` | **PASS** — 154 tests |
| Fresh-DB smoke | **PASS** — migrations V1–V4; admin register/promote; site/artifact/media/beacon CRUD; resolve `200`/unknown `404`; interaction `201` |
| Dev DB drift repair | **PASS** — backup `/tmp/smart_heritage_pre_m3.dump`; V4 applied; backend healthy |
| Dev backend | **PASS** — `http://localhost:8080/api/health` `UP` |
| Demo beacon A | `Demo Beacon A`, UUID `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0`, major `1`, minor `101` → artifact `1` |
| Demo beacon B | `Demo Beacon B`, UUID `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0`, major `1`, minor `102` → artifact `2` |
| Resolve A/B qua API thật | **PASS** — `200`, artifact `1`/`2` |
| `BEACON_TRIGGER` persistence | **PASS FROM API SMOKE** — interaction ID `10`, artifact `1`, beacon `1` |
| Endpoint LAN cho điện thoại | `http://192.168.1.48:8081/api` (Windows Node TCP proxy `0.0.0.0:8081` → `127.0.0.1:8080`) |

Fresh DB chỉ seed role `VISITOR`; phải tạo/promote `ADMIN` thủ công trước khi
dùng Admin Web. Dev DB hiện có dữ liệu demo nên không cần thao tác này lại.

### 2.2. Chạy trên điện thoại — 2026-11-28

- Máy chạy app: Xiaomi Note 11T Pro, Android 13.
- Nguồn phát iBeacon: app Beacon Simulator trên iPhone 13 Pro Max (giả lập, không phải beacon phần cứng).
- APK: `1.1.0 (versionCode 2)`, `SmartHeritage-1.1.0-demo-arm64.apk`, SHA-256 `19e414aeb187e059bbdb967f4f61b02172fb3a0e7cb150761fa54cce5b1c48f0`.
- Người test báo: cài APK thành công, quét beacon thành công, hiện vật hiển thị
  đủ mô tả và video.

Sự kiện trong PostgreSQL từ thiết bị (visitor `500ae5de…`):

| ID | Giờ VN | Loại | Minor | Hiện vật |
|---|---|---|---|---|
| 23 | 03:49:31 | `BEACON_TRIGGER` | 112 | 12 |
| 26 | 03:50:43 | `BEACON_TRIGGER` | 112 | 12 |
| 28 | 03:51:51 | `BEACON_TRIGGER` | 106 | 6 |
| 30 | 03:52:03 | `BEACON_TRIGGER` | 107 | 7 |
| 32 | 03:53:21 | `BEACON_TRIGGER` | 107 | 7 |
| 35 | 04:29:45 | `BEACON_TRIGGER` | 107 | 7 |
| 36 | 04:32:11 | `BEACON_TRIGGER` | 107 | 7 |
| 37 | 04:33:57 | `BEACON_TRIGGER` | 107 | 7 |
| 38 | 04:34:13 | `BEACON_TRIGGER` | 108 | 8 |

Các `VIEW` tương ứng có ID 24, 25, 27, 29, 31. Minor 106 rồi 107 cách nhau 12
giây đều kích hoạt; 107 rồi 108 cách nhau 16 giây cũng vậy. Không có cặp trùng
minor nào dưới 60 giây.

## 3. Acceptance checklist

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Native module đóng gói trong native APK | **PASS (APK)** | APK đã verify có `com/reactnativebeacon/*` và `org/altbeacon/beacon/*` |
| Runtime permission grant/deny trên Android thật | **PASS** | Cấp quyền: quét được. Gỡ quyền trong Cài đặt: app xin lại. Từ chối: app cảnh báo cần bật quyền vị trí để quét |
| Physical Beacon được phát hiện | **PASS (giả lập)** | Sóng BLE thật từ app Beacon Simulator trên iPhone 13 Pro Max; beacon phần cứng NOT VERIFIED |
| UUID/Major/Minor khớp backend | **PASS** | Minor 106, 107, 108, 112 → đúng beacon trong DB |
| Resolve trả đúng Artifact | **PASS** | 106 → 6, 107 → 7, 108 → 8, 112 → 12 |
| Interaction xuất hiện trong PostgreSQL | **PASS** | ID 23, 26, 28, 30, 32, 35–38 từ thiết bị |
| Hai beacon trigger độc lập | **PASS (giả lập)** | 106 rồi 107 trong 12 giây; một máy phát đổi minor, chưa thử hai máy phát cùng lúc |
| Quay lại beacon trong cooldown 60 giây không trigger lại | **PASS (giả lập)** | Người test xác nhận; DB chưa có sự kiện riêng của lượt thử này |
| Tắt Bluetooth khi đang dùng quét beacon | **PASS** | Người test thấy app cảnh báo Bluetooth đang tắt và yêu cầu bật lại |
| Pause/resume/background không duplicate/stale | **PASS (giả lập)** | Ra ngoài app vài giây rồi quay lại: không báo trùng; đổi sang minor 108 thì banner Khuê Văn Các hiện (ID 38) |
| Log/screenshot/video đã redacted | **PENDING** | Chưa có evidence hardware |

## 4. Kịch bản chạy trên thiết bị

1. Cài APK/native build lên Android phone.
2. Dùng APK đã bake `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.48:8081/api`
   (endpoint LAN qua Windows proxy). Nếu đổi Wi-Fi/IP, phải build lại APK với URL mới.
   Không dùng `http://<LAN_IP>:8080/api` trực tiếp vì Windows chỉ bind `8080` trên
   loopback.
3. Bật Bluetooth + Location Services; cấp `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`,
   `ACCESS_FINE_LOCATION`.
4. Bật toggle “Khám phá bằng beacon”; xác nhận scanner chạy.
5. Đưa điện thoại tới Beacon A; xác nhận banner đúng Artifact A.
6. Mở artifact detail; kiểm tra multimedia và navigation.
7. Kiểm tra PostgreSQL có `BEACON_TRIGGER` đúng visitor/artifact/beacon.
8. Nếu có Beacon B: đi từ A sang B; B phải trigger trong vòng 60 giây.
9. Quay lại A trong cooldown; không có trigger duplicate.
10. Blur/background/resume; tắt Bluetooth/Location; kiểm tra lỗi và cleanup.
11. Lưu screenshot/video/log đã redacted và ghi model/Android version.

## 5. Bằng chứng cần điền

| Bằng chứng | Giá trị |
|---|---|
| Device model | Xiaomi Note 11T Pro |
| Android version / API level | Android 13 (API 33) |
| APK version / commit | `1.1.0 (versionCode 2)`, `SmartHeritage-1.1.0-demo-arm64.apk`, SHA-256 `19e414aeb187e059bbdb967f4f61b02172fb3a0e7cb150761fa54cce5b1c48f0`; build từ working tree trên `30aceea` |
| Beacon A UUID/Major/Minor | `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0` / `1` / `106` |
| Beacon B UUID/Major/Minor | `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0` / `1` / `107` |
| Backend URL | `http://192.168.1.48:8081/api` (LAN proxy) |
| Resolve A/B response | **PASS trên thiết bị** — 106 → artifact `6`, 107 → artifact `7` |
| `BEACON_TRIGGER` query | **PASS** — ID `28` (artifact `6`), `30` (artifact `7`) |
| Screenshot/video path | `________________` |
| Tester + thời gian | td041, 28/11/2026 (khoảng 03:49–04:34 giờ Việt Nam) |

## 6. Môi trường demo LAN

- Windows Wi-Fi IP hiện tại: `192.168.1.48`; network category `Public`.
- Windows firewall có inbound allow cho `C:\Program Files\nodejs\node.exe` ở profile
  `Public`.
- Proxy Windows đang chạy: `0.0.0.0:8081` → `127.0.0.1:8080`; health qua
  `http://192.168.1.48:8081/api/health` trả `200`.
- Nếu proxy/Windows restart, chạy lại:
  `powershell.exe -NoProfile -Command "Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'C:\Users\ADMIN\AppData\Local\Temp\smart-heritage-proxy.js' -WindowStyle Hidden"`
- Nếu Windows Wi-Fi IP đổi, cập nhật `EXPO_PUBLIC_API_BASE_URL`, prebuild lại và build
  APK mới.
- Cloudflared quick tunnel cũ `https://doc-sink-wallace-beverage.trycloudflare.com`
  đã hết hiệu lực (`Tunnel not found`); không dùng URL này.

## 7. Kết quả

**PASS (chức năng, beacon giả lập)** — quét, tra hiện vật, ghi DB, hai beacon độc lập,
cooldown, quyền, cảnh báo Bluetooth và pause/resume đạt trên Xiaomi Note 11T Pro.
Chưa kiểm chứng: beacon phần cứng và tắt dịch vụ Vị trí. Chưa đính kèm
screenshot/video.

## 8. Defect cần báo M2 nếu gặp

Gửi kèm request/response, `resolve` query, interaction payload, app log và thời
điểm. Không sửa backend production trong PR mobile.

## 9. Cập nhật 2026-11-28

- UUID beacon ở mục 2.1 và 5 đã được sửa ngày 2026-11-28 cho khớp database dev và
  app: `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0`. App chỉ quét UUID được cấu hình lúc
  build, nên beacon (hoặc app giả lập) phải phát đúng UUID này.
- Hiện có 12 beacon: major `1`, minor `101`–`112`. Bảng ánh xạ và cách giả lập
  bằng điện thoại: [offline-demo.md](../features/offline-demo.md) mục 5.
- Trạng thái nghiệm thu: xem mục 7. Beacon giả lập bằng điện thoại
  không thay thế phần cứng beacon; ghi rõ khi nộp evidence.
