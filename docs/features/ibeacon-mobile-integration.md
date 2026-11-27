# iBeacon Mobile Integration — Wave 4

## 1. Trạng thái

- Branch kiểm chứng: `LTJ-58` (trên nền implementation Wave 4)
- Base Wave 4: `origin/main` @ `e0ef5388f4e41d4e64d2764780185d524a30224d`
- Phạm vi: foreground iBeacon discovery, beacon → artifact mapping, `BEACON_TRIGGER` interaction.
- Background scanning: **DEFERRED**. Chưa triển khai foreground service hoặc background location.
- Native build/device verification: **CHƯA CHẠY** trong môi trường phát triển này (không có Android SDK/ADB/Gradle, không có macOS/Xcode, không có beacon vật lý). Không có kết quả phần cứng nào được khẳng định trong tài liệu này.
- LTJ-58 bổ sung: cooldown chống ghi trùng, dừng scanner khi rời màn hình, xử lý thay đổi Bluetooth/vị trí/quyền khi đang quét. API contract backend không đổi.
- Sprint 6: LTJ-72 đã chuẩn bị app identity `com.university.smartheritage`, EAS demo profile và hướng dẫn build APK. LTJ-70 physical beacon acceptance vẫn **NOT VERIFIED**; xem [`docs/logs/LTJ-70.md`](../logs/LTJ-70.md).

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
| Trigger cooldown | `60000 ms` (mỗi beacon) |
| Banner auto-dismiss | `8000 ms` |

Quy tắc:

- Một beacon chỉ trigger sau khi RSSI ≥ ngưỡng liên tục đủ `entryDelayMs`.
- Không trigger lặp khi người dùng vẫn ở trong vùng.
- State chỉ reset sau khi RSSI dưới ngưỡng liên tục đủ `exitDelayMs`.
- Mỗi beacon được track độc lập bằng key `uuid:major:minor`.
- **Cooldown** `cooldownMs` chặn trigger thứ hai cho cùng beacon trong 60 giây. Cooldown **không** bị xoá bởi `reset()`, nên app vào nền / rời màn hình rồi quay lại khi vẫn đứng cạnh beacon sẽ không resolve lại và không ghi thêm `BEACON_TRIGGER`.
- Cooldown được giữ theo từng instance controller (một phiên app). Tắt rồi bật lại toggle trong cùng phiên vẫn nằm trong cooldown.
- Mỗi lần trigger mới tạo một `eventId` mới; backend deduplicate theo `eventId`, nên retry cùng một event phải dùng lại `eventId`.

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

### 4.3. Vòng đời scanner (LTJ-58)

Scanner chỉ chạy khi **đồng thời**:

1. Người dùng bật toggle “Khám phá bằng beacon”.
2. Màn hình Home đang được focus.
3. App đang ở trạng thái `active`.
4. Quyền Bluetooth/vị trí và môi trường Bluetooth/vị trí đều sẵn sàng.

Scanner dừng và giải phóng subscription/timer khi:

- Người dùng tắt toggle (`disable`).
- Home mất focus (push sang `artifact_detail`/màn hình khác). Home vẫn mounted trong navigation stack, nên `useFocusEffect` là cơ chế dừng thực tế; cleanup chỉ theo unmount là không đủ.
- App vào background; khi quay lại foreground và Home còn focus thì tự khởi động lại.
- Component unmount.

Thay đổi môi trường khi đang quét được xử lý qua `Beacon.onScannerStateChanged`:

- Bluetooth bị tắt → dừng quét, toggle tắt, trạng thái `bluetooth_off`.
- Dịch vụ vị trí bị tắt → dừng quét, toggle tắt, trạng thái `location_off`.
- Quyền bị thu hồi → dừng quét, toggle tắt, trạng thái `permission_denied`.

`canScanInForeground` được dùng để kiểm tra quyền thay vì `permissionsGranted`, vì `permissionsGranted` của thư viện có bao gồm `ACCESS_BACKGROUND_LOCATION` — permission mà bản foreground-only này chủ động không xin.

Khi resolve beacon:

- HTTP `404` → thông báo “không tìm thấy hiện vật cho beacon này”.
- Lỗi mạng/timeout/5xx → thông báo “không thể kết nối máy chủ để xác định hiện vật”.
- Nhiều beacon trigger gần nhau: chỉ response mới nhất được cập nhật banner; mỗi trigger hợp lệ vẫn được ghi interaction (không bị response cũ “nuốt” mất).
- Response resolve còn in-flight khi blur/background/disable bị bỏ qua theo scan-session token; không cập nhật banner và không ghi interaction của phiên cũ.
- AppState `background` lặp lại chỉ dừng scanner một lần khi scanner đang thực sự chạy.

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

### 6.1. Backend (bằng chứng Wave 4, không chạy lại trong LTJ-58)

| Check | Kết quả |
|---|---|
| Compile | PASS |
| Unit tests | PASS — 154 tests (final M3 audit) |
| PostgreSQL integration tests | `BeaconResolutionIntegrityIT` PASS — 17 tests; full suite requires Docker for migration suites |
| Flyway V3 trên PostgreSQL 16 | PASS |

Lưu ý: đây là bằng chứng lịch sử của Wave 4/LTJ-58. Final M3 audit chạy lại backend unit tests và `BeaconResolutionIntegrityIT`; xem mục 11 của `docs/logs/LTJ-58.md`.

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
| `npm ci --legacy-peer-deps` | PASS — khôi phục đúng lockfile (trước đó `expo-crypto`, `react-native-beacon-kit`, `react-native-permissions` chưa được cài) |
| Source TypeScript (`tsc` chỉ trên `src/**`) | PASS |
| `npx tsc --noEmit` toàn repo | PASS (final M3 audit) |
| `npm run lint` | PASS |
| Jest | PASS — 12 suites, 108 tests (final M3 audit) |
| Expo config plugin introspection | PASS — `ACCESS_FINE_LOCATION`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, các permission background/FGS bị remove |
| `npx expo-doctor` | 19/21 checks pass; 2 cảnh báo dependency có sẵn (`expo-asset` peer của `expo-audio`, version drift), không do LTJ-58 |

Không upgrade Expo/React Native/runtime dependency nào. Final M3 audit chỉ thêm `test-renderer@1.3.0` làm devDependency cho hook tests. `react-native-beacon-kit@0.12.0` khai báo peer `react-native: "*"` và được build với RN 0.83.x; project dùng RN 0.86.3, nên khả năng tương thích native vẫn **cần native build xác minh**.

### 6.3. Backend + Docker verification (LTJ-58)

Dev stack hiện có volume PostgreSQL bị lệch schema (`duration_seconds` là `int4` trong DB nhưng entity mong đợi `bigint`), nên backend restart loop. Không xoá volume dev; thay vào đó kiểm chứng bằng một Compose project cô lập, volume mới:

```bash
cd /home/td041/coding/smart-heritage
cat > /tmp/ltj58-names.yml <<'YAML'
services:
  postgres:
    container_name: ltj58-db
  backend:
    container_name: ltj58-backend
YAML
BACKEND_PORT=18080 POSTGRES_PORT=15432 \
  docker compose -p ltj58 -f docker-compose.yml -f /tmp/ltj58-names.yml \
  up -d --build --wait --wait-timeout 420
```

Kết quả thực tế:

| Check | Kết quả |
|---|---|
| `GET http://localhost:18080/api/health` | `200`, body `{"status":"UP"}` |
| `GET /api/beacons/resolve?...` với beacon không tồn tại | `404`, `"Beacon not found or disabled"` |
| Seed site/artifact/beacon rồi resolve đúng UUID/major/minor | `200`, trả đúng `beaconId`, `artifactId`, `artifactName`, `siteId`, `siteName` |
| `POST /api/interactions` với `BEACON_TRIGGER` | `201` |
| Gửi lại cùng `eventId` | `200` (`"Interaction event was already recorded"`) |
| Đếm row theo `eventId` | 1 row — idempotency đúng |

Lưu ý: đây là bằng chứng Docker lịch sử của Wave 4. Máy kiểm chứng final M3 audit không có Docker daemon, nên chỉ chạy được PostgreSQL cục bộ cho `BeaconResolutionIntegrityIT`; CI là nguồn xác nhận đầy đủ cho migration/schema suites.

### 6.4. Native build verification (LTJ-58)

**KHÔNG CHẠY ĐƯỢC trong môi trường hiện tại.**

- `ANDROID_HOME` / `ANDROID_SDK_ROOT` trống.
- Không có `adb`, `gradle`, Android SDK, Android Studio.
- Không có macOS/Xcode cho iOS.
- `mobile/android` và `mobile/ios` không tồn tại (Continuous Native Generation); muốn build phải `npx expo prebuild`/`npx expo run:android` trên máy có SDK.

Vì vậy **native build result: NOT VERIFIED**. Không có kết luận nào về việc native module load thành công trên thiết bị.

### 6.5. Native/device verification

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

### 7.1. Checklist thiết bị vật lý (chưa chạy)

Checklist demo 2 beacon đầy đủ (setup, API, Android, media, analytics, evidence):
[`docs/testing/sprint-5-beacon-physical-demo-checklist.md`](../testing/sprint-5-beacon-physical-demo-checklist.md).

Acceptance log Sprint 6:
[`docs/logs/LTJ-70.md`](../logs/LTJ-70.md) (physical beacon) và
[`docs/logs/LTJ-71.md`](../logs/LTJ-71.md) (real-device multimedia). Cả hai đang
**NOT VERIFIED** cho đến khi chạy trên thiết bị thật.

Admin Web `/beacons` đã có CRUD (LTJ-60); dùng UI để tạo/map beacon. Admin API hoặc
SQL chỉ là fallback khi UI không dùng được.

Tất cả mục dưới đây đang là **NOT YET PHYSICALLY VERIFIED** trong môi trường hiện tại.

```text
[ ] Android development build succeeds
[ ] App launches on device
[ ] Native iBeacon/BLE module loads
[ ] Bluetooth enabled
[ ] Bluetooth disabled
[ ] Permission granted
[ ] Permission denied
[ ] Permission revoked while app inactive
[ ] Scanner starts
[ ] Scanner stops
[ ] Navigate away from Home and verify cleanup
[ ] Background application
[ ] Return to foreground
[ ] Detect a real iBeacon
[ ] Verify UUID
[ ] Verify Major
[ ] Verify Minor
[ ] Unknown beacon (404)
[ ] Beacon without artifact mapping
[ ] Network failure during resolution
[ ] Repeated detection packets do not resolve twice
[ ] RSSI fluctuations do not retrigger while inside
[ ] No duplicate interaction event after background/foreground
[ ] iOS build + scan (UNVERIFIED, no macOS)
```

## 8. Rủi ro và giới hạn

1. `react-native-beacon-kit@0.12.0` chưa được xác minh trên thiết bị/Expo SDK 57.
2. Chưa có native build; lỗi Gradle/Pod hoặc native linking có thể còn tồn tại.
3. Chưa có beacon phần cứng để hiệu chỉnh RSSI threshold.
4. Foreground-only; không có background scanning hoặc foreground service.
5. Không có offline cache beacon → artifact; cần mạng để resolve.
6. iOS cần kiểm tra riêng vì môi trường phát triển hiện tại không có macOS.
7. `ACCESS_FINE_LOCATION` vẫn cần trên Android cũ; trên Android 12+ cần Bluetooth runtime permissions.
8. Nếu beacon bị xóa, interaction cũ giữ `beacon_id = NULL` do `ON DELETE SET NULL`.
9. Cooldown 60 giây là heuristic cho foreground visit; cần hiệu chỉnh sau khi có beacon thật và đo hành vi người dùng.
10. `permissionsGranted` của thư viện bao gồm `ACCESS_BACKGROUND_LOCATION`; code dùng `canScanInForeground` để tránh false-negative trong bản foreground-only.
11. Android manifest merge của thư viện (bao gồm các permission bị remove) chỉ được xác minh thật sự khi chạy Gradle native build.

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
- `mobile/src/services/__tests__/ibeacon.test.ts`
- `mobile/src/services/__tests__/beaconTrigger.test.ts`
- `mobile/src/services/__tests__/beaconApi.test.ts`
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

Wave 4:

- Branch: `feat/mobile-ibeacon-discovery`
- Base: `origin/main` @ `e0ef5388f4e41d4e64d2764780185d524a30224d`
- Commit: `8f3b244` (`feat: add iBeacon visitor discovery flow`)
- PR: https://github.com/nahnht27/smart-heritage/pull/25
- Không tự merge; chờ maintainer review.

LTJ-58:

- Branch: `LTJ-58`
- Phạm vi: cooldown chống ghi trùng, focus/blur lifecycle, scanner environment changes, làm rõ lỗi resolve, phục hồi dependency lockfile.
- Không thay đổi API contract backend.
- Native build + physical device verification: **NOT VERIFIED** (xem 6.4/6.5).

## 12. Final native build/device acceptance attempt (2026-11-18)

Phần này bổ sung kết quả sau khi PR #37 merge (`e2a012c`). Kết quả lịch sử “chưa
build được” ở mục 6.4 vẫn được giữ nguyên; lần chạy này đã build được APK Android
nhưng vẫn chưa có thiết bị hoặc beacon vật lý.

### 12.1. Môi trường thực tế

| Capability | Available | Evidence |
|---|---|---|
| Android SDK | Có | Command-line tools `11076708`, Platform 36, Build Tools 36.0.0 |
| ADB | Có | `1.0.41` / platform-tools `37.0.1` |
| Java/JDK | Có | Temurin OpenJDK `17.0.21` |
| Connected Android device | Không | `adb devices -l` rỗng |
| Physical iBeacon | Không | Không có hardware |
| Backend test environment | Không chạy trong phiên device test | Không có device để gọi API |
| Test media assets | Không kiểm chứng trên device | Không có device; URLs thật chưa xác minh |
| iOS/Xcode | Không | Không có macOS/Xcode |

### 12.2. Build result

```bash
cd mobile
npx expo config --type public
npx expo prebuild --platform android --no-install
cd android
CMAKE_BUILD_PARALLEL_LEVEL=2 ./gradlew assembleDebug \
  --no-daemon --console=plain --max-workers=1 \
  -PreactNativeArchitectures=arm64-v8a \
  -Dorg.gradle.jvmargs='-Xmx1280m -XX:MaxMetaspaceSize=384m' \
  -Pkotlin.daemon.jvmargs='-Xmx1024m'
```

- Result: **PASS**, `BUILD SUCCESSFUL in 8m 27s`.
- APK: `/home/adminn/.cache/m3-tools/artifacts/smart-heritage-m3-arm64-debug.apk`
- SHA-256: `4095a0a07ad439a59d54644da6364e44e14526e6d29628eb3aa36f29f4397328`
- Size: `84,855,698` bytes; ABI `arm64-v8a`; minSdk `24`, target/compileSdk `36`.
- Package: `com.anonymous.app_temp` (prebuild-generated temporary id; not committed).
- `apksigner verify` PASS (APK Signature Scheme v2); `zipalign -c 4` PASS.
- Autolinking có `com.reactnativebeacon.BeaconPackage`; DEX có
  `com.reactnativebeacon.*`; native module compile/link thành công.
- Manifest có `ACCESS_FINE_LOCATION`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`;
  background location, advertising và foreground-service permissions bị remove.

Lần build đầu bị daemon OOM trên máy 5.7 GiB RAM khi dùng heap 2048 MiB và build
song song; lần chạy lại với một ABI/một worker/heap thấp hơn thành công.

### 12.3. Physical verification status

| Hạng mục | Trạng thái |
|---|---|
| Native Android build | **VERIFIED** |
| Cài APK lên thiết bị | **NOT VERIFIED** — không có device |
| BLE advertisement/detection thật | **NOT VERIFIED** |
| Beacon → Resolve → Artifact → Interaction | **NOT VERIFIED** |
| Cooldown A/B với hai beacon vật lý | **NOT VERIFIED** |
| Permission grant/deny/revoke runtime | **NOT VERIFIED** |
| Scanner lifecycle trên device | **NOT VERIFIED** |
| Audio/video playback thật | **NOT VERIFIED** |
| iOS build/device | **NOT VERIFIED** |

Không có screenshot, log BLE hay bản ghi PostgreSQL từ device trong phiên này;
không claim hardware success.

### 12.4. Manual acceptance procedure còn lại

1. Cài APK arm64 debug lên Android phone có BLE.
2. Cấu hình beacon thật với UUID/Major/Minor; dùng Admin Web `/beacons` để
   tạo/map beacon với Artifact (Admin API/SQL chỉ là fallback).
3. Chạy backend + PostgreSQL, cấu hình backend URL trong app theo IP LAN.
4. Cấp quyền Bluetooth/vị trí, bật Bluetooth, mở Home và bật quét beacon.
5. Thực hiện Test A/B/C trong
   `docs/testing/sprint-5-beacon-physical-demo-checklist.md`; lưu log đã redact,
   screenshot và query PostgreSQL `BEACON_TRIGGER`.
6. Chạy checklist audio/video và lifecycle trên cùng device; ghi rõ pass/fail.
7. Chỉ cập nhật acceptance thành PASS khi có bằng chứng thiết bị thật.

### 12.5. Kết luận

- S5-M3-01: software + automated tests PASS; native Android build **VERIFIED**;
  physical BLE **NOT VERIFIED** → **NOT FULLY ACCEPTED**.
- S5-M3-02: software + automated tests PASS; native build PASS; real-device media
  **NOT VERIFIED** → chưa fully accepted trên hardware.
- iOS: **NOT VERIFIED**.
