# Sprint 5 — Beacon Physical Demo Checklist

Checklist này dùng cho buổi demo **2 beacon thật → Android app → backend → artifact
detail → `BEACON_TRIGGER`**. API smoke test và unit test **không** thay thế checklist
này.

Trạng thái: `[ ]` chưa chạy · `[x]` pass · `[!]` fail · `[~]` blocked/pending

> **Chưa có kết quả physical nào được xác nhận.** Máy phát triển hiện tại không có
> Android SDK/ADB, thiết bị thật, beacon thật hoặc macOS/Xcode. Không đánh dấu
> `[x]` nếu chưa thực sự chạy trên thiết bị.

## 1. Phạm vi

Trong phạm vi:

- Android physical device (ưu tiên), 2 iBeacon cùng UUID.
- Resolve beacon qua backend thật.
- Banner artifact, mở artifact detail.
- Ghi `BEACON_TRIGGER` và kiểm tra Analytics.
- Multimedia audio/video cơ bản trên artifact detail.

Ngoài phạm vi buổi demo này:

- iOS physical device (ghi `[~]` nếu chưa có thiết bị).
- Background scanning / foreground service.
- Multi-beacon đồng thời.
- Admin Web `/beacons` CRUD đã có từ LTJ-60; dùng UI để tạo/map beacon. API ADMIN
  chỉ là fallback khi UI không dùng được.

## 2. Chuẩn bị

### 2.1 Phần cứng và tài khoản

| Hạng mục | Giá trị demo | Đã có |
|----------|--------------|-------|
| Beacon A | UUID: `________________` · Major: `1` · Minor: `101` | [ ] |
| Beacon B | UUID: `________________` · Major: `1` · Minor: `102` | [ ] |
| Android device | Model / OS: `________________` | [ ] |
| Tài khoản ADMIN | Username: `________________` | [ ] |
| Tài khoản VISITOR | Username: `________________` | [ ] |

Beacon A và B phải dùng **cùng một UUID**, khác `minor`. Ghi lại UUID thật từ app
cấu hình beacon (không đoán).

### 2.2 Backend

- [ ] `docker compose up -d --build`
- [ ] `docker compose ps` thấy `postgres` và `backend` healthy.
- [ ] `curl http://localhost:8080/api/health` trả `{"status":"UP",...}`.
- [ ] Backend reachable từ điện thoại qua LAN IP, không chỉ `localhost`.
      Test: `curl http://<LAN_IP>:8080/api/health` từ máy tính trong cùng Wi-Fi.
- [ ] Firewall cho phép port `8080` từ điện thoại.

Nếu backend restart liên tục do lệch schema dev, dùng database mới hoặc reset có
chủ đích. **Không** chạy `docker compose down -v` khi chưa xác nhận không cần dữ
liệu dev.

### 2.3 Dữ liệu demo

Tạo tối thiểu:

- [ ] 1 Heritage Site.
- [ ] Artifact A (gắn Site) — ví dụ “Trống đồng Đông Sơn”.
- [ ] Artifact B (gắn Site) — ví dụ “Bình gốm cổ”.
- [ ] Multimedia cho Artifact A: 1 audio hợp lệ và/hoặc 1 video hợp lệ.
- [ ] Multimedia cho Artifact B: 1 audio/video hợp lệ.
- [ ] Beacon A map Artifact A.
- [ ] Beacon B map Artifact B.

Kiểm tra mapping:

```bash
curl -s "http://localhost:8080/api/beacons/resolve?uuid=<UUID>&major=1&minor=101" | jq
curl -s "http://localhost:8080/api/beacons/resolve?uuid=<UUID>&major=1&minor=102" | jq
```

Kỳ vọng mỗi response có `data.beaconId`, `data.artifactId`, `data.artifactName`,
`data.siteId`, `data.siteName`.

Tạo/map beacon qua Admin Web `/beacons` (LTJ-60). Nếu UI không dùng được, fallback
bằng API ADMIN:

```bash
# 1. Lấy token ADMIN
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<ADMIN>","password":"<PASSWORD>"}' | jq -r '.data.accessToken')

# 2. Tạo Beacon A
curl -s -X POST http://localhost:8080/api/admin/beacons \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Beacon A","uuid":"<UUID>","major":1,"minor":101,"enabled":true,"artifactId":<ARTIFACT_A_ID>}'

# 3. Tạo Beacon B
curl -s -X POST http://localhost:8080/api/admin/beacons \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Beacon B","uuid":"<UUID>","major":1,"minor":102,"enabled":true,"artifactId":<ARTIFACT_B_ID>}'
```

### 2.4 Mobile build

- [ ] `mobile/.env` có `EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:8080/api`.
- [ ] Không dùng `10.0.2.2` cho điện thoại thật; chỉ dùng cho Android emulator.
- [ ] Cài development build/native build lên Android device.
- [ ] App mở được Home và load dữ liệu từ backend thật.
- [ ] Bật Location Services.
- [ ] Bật Bluetooth.
- [ ] Cấp quyền khi app hỏi: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`,
      `ACCESS_FINE_LOCATION` (Android 12+ có thể yêu cầu location do manifest hiện
      chưa đặt `neverForLocation`).
- [ ] Tắt battery optimization cho app nếu scanner bị dừng khi demo.

## 3. Demo checklist

### 3.1 Khởi động scanner

- [ ] Mở màn hình có panel “Khám phá bằng beacon”.
- [ ] Bật switch quét beacon.
- [ ] Status chuyển sang trạng thái quét, không crash.
- [ ] Nếu Bluetooth/location tắt, app hiển thị thông báo đúng và không crash.

### 3.2 Beacon A → Artifact A

- [ ] Đưa điện thoại lại gần Beacon A (trong khoảng 1–2 m).
- [ ] App resolve được Beacon A.
- [ ] Banner hiển thị đúng tên Artifact A và Site A.
- [ ] Không hiển thị banner của Beacon B.
- [ ] Bấm “Xem chi tiết” mở đúng Artifact A.
- [ ] Artifact detail hiển thị multimedia của Artifact A.

### 3.3 Beacon B → Artifact B

- [ ] Đưa điện thoại lại gần Beacon B.
- [ ] App resolve được Beacon B.
- [ ] Banner hiển thị đúng tên Artifact B và Site B.
- [ ] Bấm “Xem chi tiết” mở đúng Artifact B.
- [ ] Không mở nhầm Artifact A.

### 3.4 Chống spam / cooldown

- [ ] Giữ nguyên gần cùng beacon 10–15 giây.
- [ ] Không có chuỗi request resolve/banner lặp vô hạn trên network log.
- [ ] Không tạo quá nhiều `BEACON_TRIGGER` cho cùng một lần ghé.
- [ ] Cooldown mặc định là **60 giây** (`DEFAULT_TRIGGER_COOLDOWN_MS`).

> Muốn demo “rời đi rồi quay lại” ngay lập tức thì phải đợi hết 60 giây hoặc
> tạm giảm cooldown trong build demo. Không sửa production chỉ để demo.

### 3.5 Rời đi rồi quay lại

- [ ] Rời xa Beacon A, đợi hết cooldown 60 giây.
- [ ] Quay lại Beacon A; banner/resolve xuất hiện lại.
- [ ] `BEACON_TRIGGER` mới được ghi nhận (nếu đã qua cooldown).

### 3.6 Disabled / unmapped beacon

- [ ] Disable Beacon B qua API ADMIN.
- [ ] Đưa điện thoại lại gần Beacon B.
- [ ] App **không** resolve thành Artifact B; status báo không tìm thấy beacon.
- [ ] Bật lại Beacon B; resolve hoạt động lại.
- [ ] Unmap Beacon B (artifactId = null), giữ enabled.
- [ ] App báo “Beacon này chưa được gán với hiện vật”, không mở artifact.

### 3.7 Server/network failure

- [ ] Tắt backend trong lúc scanner đang chạy.
- [ ] App hiển thị lỗi kết nối thân thiện, không crash.
- [ ] Bật lại backend; lần quét sau resolve thành công.

## 4. Multimedia smoke test

Chạy trên artifact detail của Artifact A hoặc B:

- [ ] Audio hiển thị và phát được.
- [ ] Audio pause/play/seek hoạt động.
- [ ] Video hiển thị và phát được.
- [ ] Video pause/play/seek/fullscreen hoạt động.
- [ ] Loading state hiển thị khi media đang tải.
- [ ] URL lỗi/404 hiển thị lỗi thân thiện và nút thử lại.
- [ ] Bấm thử lại khi mạng đã ổn → media phát được.
- [ ] Chuyển từ audio sang video: audio dừng, chỉ một media phát tại một thời điểm.
- [ ] Rời artifact detail: media dừng.
- [ ] Đưa app xuống background: media dừng, không phát tiếp.
- [ ] Quay lại app: media không tự phát nếu trước đó đã pause.
- [ ] `AUDIO_PLAY` chỉ được ghi một lần cho một lượt phát.
- [ ] Media type lạ/`UNKNOWN` hiển thị fallback, không crash.

## 5. Backend / Analytics verification

### 5.1 Interaction vừa tạo

```bash
docker compose exec postgres psql -U postgres -d smart_heritage -c \
  "select interaction_id, beacon_id, artifact_id, interaction_type,
          language_code, interacted_at
     from visitor_interaction
    where interaction_type = 'BEACON_TRIGGER'
    order by interaction_id desc
    limit 10;"
```

- [ ] Có record `BEACON_TRIGGER`.
- [ ] `artifactId` đúng artifact vừa mở.
- [ ] `beaconId` đúng beacon vừa phát hiện.
- [ ] Không có record trùng `event_id`.

### 5.2 Analytics

- [ ] Mở Admin Web → Analytics Dashboard.
- [ ] “Beacon Triggers” tăng sau demo.
- [ ] Số liệu khớp API summary/timeseries trong cùng khoảng thời gian.

Ghi lại số liệu trước/sau demo để tránh nhầm với dữ liệu cũ.

## 6. Bằng chứng cần lưu

| Bằng chứng | Đường dẫn / ghi chú |
|------------|---------------------|
| Ảnh cấu hình Beacon A/B | |
| Screenshot banner Artifact A | |
| Screenshot banner Artifact B | |
| Screenshot artifact detail + multimedia | |
| Screen record luồng beacon | |
| Log app (resolve/request) | |
| Query `BEACON_TRIGGER` | |
| Screenshot Analytics | |
| Thông tin thiết bị + OS version | |

## 7. Kết quả

| Mục | Trạng thái | Người kiểm thử | Ghi chú |
|-----|-----------|----------------|---------|
| Chuẩn bị backend/data | PENDING | | |
| Android build/permissions | PENDING | | |
| Beacon A → Artifact A | PENDING | | |
| Beacon B → Artifact B | PENDING | | |
| Cooldown/retrigger | PENDING | | |
| Disabled/unmapped | PENDING | | |
| Network failure | PENDING | | |
| Multimedia smoke | PENDING | | |
| Interaction DB | PENDING | | |
| Analytics | PENDING | | |
| iOS physical | NOT VERIFIED | | Ngoài phạm vi nếu không có thiết bị |

## 8. Known gaps / lưu ý

- Admin Web `/beacons` đã có CRUD; nếu môi trường đang chạy build cũ, dùng API
  ADMIN làm fallback.
- Android manifest chưa đặt `android:usesPermissionFlags="neverForLocation"`;
  cần kiểm tra lại flow quyền trên Android 12+.
- Background scanning chưa hỗ trợ; chỉ demo khi app foreground.
- Cooldown 60 giây có thể làm “rời đi rồi quay lại” trông như không hoạt động.
- iOS chưa được xác nhận.
- Không kết luận PASS dựa trên unit test, H2 test hoặc API smoke test.
