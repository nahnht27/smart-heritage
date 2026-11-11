# iBeacon Mobile Integration — Wave 4

## 1. Trạng thái

- Branch: `feat/mobile-ibeacon-discovery`
- Base: `origin/main` @ `e0ef5388f4e41d4e64d2764780185d524a30224d`
- Phạm vi: foreground iBeacon discovery, beacon → artifact mapping, `BEACON_TRIGGER` interaction.
- Background scanning: **DEFERRED**. Chưa triển khai foreground service hoặc background location.
- Native build/device verification: **CHƯA CHẠY** trong môi trường phát triển này. Không có kết quả phần cứng nào được khẳng định trong tài liệu này.

## 2. Mục tiêu

Cho phép Visitor App:

1. Quét iBeacon trong foreground khi người dùng bật tính năng.
2. Xác định beacon bằng bộ ba `proximity UUID + major + minor`.
3. Resolve beacon thành hiện vật qua backend.
4. Hiển thị banner trong app và cho phép mở chi tiết hiện vật.
5. Ghi một sự kiện `BEACON_TRIGGER` cho mỗi lần vào vùng đã xác nhận.

## 3. Quyết định thư viện

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `react-native-beacon-kit` | `0.12.0` | Ranging iBeacon native, cấu hình scanner, environment state |
| `react-native-permissions` | `5.6.3` | Kiểm tra/xin quyền Bluetooth và vị trí |

`react-native-beacon-kit` được chọn vì API công khai hỗ trợ trực tiếp iBeacon/ranging và có type definitions cho `Beacon`, `BeaconRegion`, `BeaconEnvironmentState`, `onBeaconsRanged`, `onRangingFailed`.

Rủi ro đã biết:

- Đây là thư viện có mức độ phổ biến thấp, chưa được xác minh thực nghiệm trên React Native `0.86.3`/Expo SDK `57` bằng thiết bị thật.
- Không có kết quả native build trong wave này.
- Nếu thư viện không tương thích native, cần thay implementation sau abstraction `src/services/beacon/beaconService.ts` mà không đổi UI/trigger logic.

Cài đặt hiện tại phải dùng `--legacy-peer-deps` do xung đột peer có sẵn giữa `@babel/preset-env@8` và `@babel/core@7`:

```bash
cd mobile
npm install --legacy-peer-deps
```

## 4. Kiến trúc mobile

| File | Trách nhiệm |
|---|---|
| `mobile/src/services/beacon/ibeacon.ts` | Chuẩn hóa/validate UUID, major, minor; tạo region; parse native reading |
| `mobile/src/services/beacon/trigger.ts` | State machine entry/exit, RSSI threshold, debounce, chống trigger lặp |
| `mobile/src/services/beacon/beaconService.ts` | Wrapper native scanner + runtime permissions |
| `mobile/src/services/beacon/beaconApi.ts` | Gọi `GET /api/beacons/resolve` |
| `mobile/src/hooks/use-beacon-discovery.ts` | Vòng đời quét, AppState pause/resume, resolve, ghi interaction, banner |
| `mobile/src/components/beacon-discovery-panel.tsx` | Toggle, trạng thái, banner “Xem chi tiết” |
| `mobile/src/app/home.tsx` | Tích hợp panel và điều hướng tới artifact detail |

Luồng:

```text
Home toggle
  -> request permissions
  -> check Bluetooth/location environment
  -> startBeaconRanging(region)
  -> onBeaconsRanged
  -> BeaconTriggerController.observe
  -> beaconApi.resolve(uuid, major, minor)
  -> banner + POST /api/interactions (BEACON_TRIGGER)
  -> user taps "Xem chi tiết"
  -> artifact_detail
```

### 4.1. Trigger algorithm

| Tham số | Giá trị mặc định |
|---|---|
| RSSI threshold | `-75 dBm` |
| Entry confirmation | `2000 ms` |
| Exit confirmation | `3000 ms` |
| Stale reset | `3000 ms` |
| Banner auto-dismiss | `8000 ms` |

Quy tắc:

- Một beacon chỉ trigger sau khi RSSI ≥ ngưỡng liên tục đủ `entryDelayMs`.
- Không trigger lặp khi người dùng vẫn ở trong vùng.
- State chỉ reset sau khi RSSI dưới ngưỡng liên tục đủ `exitDelayMs`.
- Mỗi beacon được track độc lập bằng key `uuid:major:minor`.
- Mỗi lần trigger tạo một `eventId` mới; retry của cùng lần ghi phải dùng lại `eventId`.

### 4.2. Permission và native config

Local Expo config plugin: `mobile/plugins/with-beacon-permissions.js`.

Android:

- Thêm `ACCESS_FINE_LOCATION`.
- Thêm `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`.
- Khai báo `android.hardware.bluetooth_le` với `required=false`.
- Đánh dấu remove cho `ACCESS_BACKGROUND_LOCATION`, `BLUETOOTH_ADVERTISE`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

iOS:

- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

Không bật background location, background BLE mode hoặc foreground service trong wave này.

Kiểm tra config plugin:

```bash
cd mobile
npx expo config --type introspect
```

Kết quả introspection đã xác nhận các permission Android và Info.plist iOS ở trên được áp dụng.

## 5. Backend

### 5.1. Schema

Migration: `backend/src/main/resources/db/migration/V3__beacon_management.sql`;
`V4__normalize_legacy_schema.sql` chuẩn hoá index/check/default/FK cho database
cũ do Hibernate tạo.

Bảng `beacon`:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `beacon_id` | integer PK | Sequence |
| `name` | varchar(255) | Tên beacon |
| `proximity_uuid` | uuid | iBeacon UUID |
| `major` | integer | `0..65535` |
| `minor` | integer | `0..65535` |
| `enabled` | boolean | Mặc định `true` |
| `artifact_id` | integer FK | Nullable; `ON DELETE` mặc định |

Ràng buộc:

- Unique `(proximity_uuid, major, minor)`.
- Check range cho `major`, `minor`.
- Index `artifact_id`.

`visitor_interaction` thêm:

- `beacon_id integer NULL`.
- FK tới `beacon(beacon_id)` với `ON DELETE SET NULL`.
- Index `beacon_id`.

### 5.2. Public API

```http
GET /api/beacons/resolve?uuid=E2C56DB5-DFFB-48D2-B060-D0F5A71096E0&major=1&minor=2
```

Không yêu cầu JWT. Trả `404` nếu beacon không tồn tại hoặc đang disabled.

Response `data`:

```json
{
  "beaconId": 7,
  "name": "Beacon cổng chính",
  "uuid": "e2c56db5-dffb-48d2-b060-d0f5a71096e0",
  "major": 1,
  "minor": 2,
  "enabled": true,
  "artifactId": 42,
  "artifactName": "Trống đồng Đông Sơn",
  "siteId": 3,
  "siteName": "Khu di tích"
}
```

`artifactId`, `artifactName`, `siteId`, `siteName` có thể là `null` nếu beacon chưa được gán hiện vật.

### 5.3. Admin API

Yêu cầu role `ADMIN`:

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/beacons` | Danh sách beacon |
| `POST` | `/api/admin/beacons` | Tạo beacon, trả `201` |
| `GET` | `/api/admin/beacons/{beaconId}` | Chi tiết beacon |
| `PUT` | `/api/admin/beacons/{beaconId}` | Cập nhật beacon |
| `DELETE` | `/api/admin/beacons/{beaconId}` | Xóa beacon |

`BeaconRequest` gồm `name`, `uuid`, `major`, `minor`, `enabled`, `artifactId`.

Lỗi:

- `400` khi UUID/major/minor/name không hợp lệ.
- `404` khi artifact được gán không tồn tại.
- `409` khi trùng bộ ba `(uuid, major, minor)`.

### 5.4. Interaction contract

`POST /api/interactions` bổ sung:

- `interactionType` cho phép `BEACON_TRIGGER`.
- `beaconId` là optional trong DTO.

Quy tắc:

- `BEACON_TRIGGER` bắt buộc có `beaconId`.
- Beacon phải tồn tại, đang enabled, đã gán artifact và artifact đó phải khớp `artifactId` trong request.
- Interaction type khác không được gửi `beaconId`.
- Idempotency theo `eventId` được kiểm tra trước khi validate beacon.
- Response interaction có thêm `beaconId`.

## 6. Kiểm chứng

### 6.1. Backend

| Check | Kết quả |
|---|---|
| Compile | PASS |
| Unit tests | PASS — 120 tests |
| PostgreSQL integration tests | PASS — 22 tests |
| Flyway V3 trên PostgreSQL 16 | PASS |

Lệnh đã dùng:

```bash
docker run --rm --network host \
  -v "$PWD/backend":/workspace \
  -v "$HOME/.m2":/root/.m2 \
  -w /workspace \
  -e POSTGRES_TEST_URL='jdbc:postgresql://localhost:5432/smart_heritage' \
  -e POSTGRES_TEST_USERNAME='postgres' \
  -e POSTGRES_TEST_PASSWORD='postgres' \
  maven:3.9-eclipse-temurin-17 \
  mvn -q -Ppostgres-integration verify
```

### 6.2. Mobile

| Check | Kết quả |
|---|---|
| TypeScript `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| Jest | PASS — 9 suites, 81 tests |
| Expo config plugin introspection | PASS |
| `npx expo-doctor` | 18/21 checks pass; 2 cảnh báo dependency có sẵn, không do Wave 4 |

### 6.3. Native/device verification

**Chưa thực hiện.** Không có:

- Native development build Android/iOS.
- Thiết bị BLE thật.
- Beacon vật lý với UUID/major/minor thật.
- Kết quả foreground scanning trên thiết bị.
- Kết quả permission flow trên thiết bị.
- Kết quả iOS.

Các test mobile hiện tại là unit tests cho logic thuần và API client; không phải bằng chứng phần cứng.

## 7. Hướng dẫn kiểm thử trên thiết bị

1. Cấu hình beacon vật lý với UUID mong muốn và major/minor.
2. Tạo development build:

```bash
cd mobile
npx expo run:android
```

3. Cấu hình backend URL trong `.env` theo IP LAN của máy chủ.
4. Cấu hình `EXPO_PUBLIC_BEACON_UUID` nếu UUID khác mặc định.
5. Tạo beacon qua Admin API hoặc trực tiếp qua PostgreSQL, gán `artifact_id`.
6. Mở Home, bật “Khám phá bằng beacon”, cấp quyền Bluetooth/vị trí.
7. Đến gần beacon trong khoảng 2 giây, kiểm tra banner và bản ghi interaction.
8. Đi ra xa ít nhất 3 giây rồi quay lại, kiểm tra trigger mới.
9. Kiểm tra các trường hợp: Bluetooth tắt, vị trí tắt, quyền bị từ chối, beacon chưa gán hiện vật, app vào background.

## 8. Rủi ro và giới hạn

1. `react-native-beacon-kit@0.12.0` chưa được xác minh trên thiết bị/Expo SDK 57.
2. Chưa có native build; lỗi Gradle/Pod hoặc native linking có thể còn tồn tại.
3. Chưa có beacon phần cứng để hiệu chỉnh RSSI threshold.
4. Foreground-only; không có background scanning hoặc foreground service.
5. Không có offline cache beacon → artifact; cần mạng để resolve.
6. iOS cần kiểm tra riêng vì môi trường phát triển hiện tại không có macOS.
7. `ACCESS_FINE_LOCATION` vẫn cần trên Android cũ; trên Android 12+ cần Bluetooth runtime permissions.
8. Nếu beacon bị xóa, interaction cũ giữ `beacon_id = NULL` do `ON DELETE SET NULL`.

## 9. Background decision

Background scanning được giữ ở trạng thái **DEFERRED** vì:

- Cần foreground service (Android) và background BLE/location justification (iOS).
- Tăng mức tiêu thụ pin và yêu cầu review permission cao hơn.
- Chưa có nhu cầu/acceptance criteria và chưa thể kiểm chứng trên thiết bị.
- MVP foreground đã đủ cho luồng “đứng gần hiện vật, mở app”.

## 10. Files chính

- `mobile/src/services/beacon/ibeacon.ts`
- `mobile/src/services/beacon/trigger.ts`
- `mobile/src/services/beacon/beaconService.ts`
- `mobile/src/services/beacon/beaconApi.ts`
- `mobile/src/hooks/use-beacon-discovery.ts`
- `mobile/src/components/beacon-discovery-panel.tsx`
- `mobile/src/services/interactionApi.ts`
- `mobile/src/app/home.tsx`
- `mobile/plugins/with-beacon-permissions.js`
- `mobile/app.json`
- `backend/src/main/resources/db/migration/V3__beacon_management.sql`
- `backend/src/main/resources/db/migration/V4__normalize_legacy_schema.sql`
- `backend/src/main/java/com/university/backend/entity/Beacon.java`
- `backend/src/main/java/com/university/backend/service/BeaconService.java`
- `backend/src/main/java/com/university/backend/service/VisitorInteractionService.java`
- `backend/src/main/java/com/university/backend/controller/BeaconController.java`
- `backend/src/main/java/com/university/backend/controller/AdminBeaconController.java`

## 11. Git delivery

- Branch: `feat/mobile-ibeacon-discovery`
- Base: `origin/main` @ `e0ef5388f4e41d4e64d2764780185d524a30224d`
- Commit: `8f3b244` (`feat: add iBeacon visitor discovery flow`)
- PR: https://github.com/nahnht27/smart-heritage/pull/25
- Không tự merge; chờ maintainer review.
