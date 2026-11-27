# Log: LTJ-72 — Final Android Demo Build & Mobile Release Preparation

## Thông tin chung

- **Task:** LTJ-72 / S6-M3-03 — Final Android Demo Build & Mobile Release Preparation
- **Nhánh:** `LTJ-70`, tách từ `origin/main` @ `30aceea`
- **Phạm vi:** app identity/branding, Expo config, EAS demo profile, hướng dẫn build/cài APK, metadata release.
- **Ràng buộc:** không commit native generated folders, APK/AAB, keystore; không claim APK/device PASS khi chưa build/cài thật.
- **Kết luận nhanh:** App identity, branding, Expo config, EAS demo profile, automated tests, native APK build và verify APK **PASS**. Cài/mở trên thiết bị demo đã chạy (người dùng báo mở thành công). Kết quả beacon và multimedia trên thiết bị: xem [LTJ-70](LTJ-70.md) và [LTJ-71](LTJ-71.md).

## 1. Thay đổi

| File | Thay đổi |
|---|---|
| `mobile/app.json` | Đổi tên app, slug, scheme; thêm `android.package`, `ios.bundleIdentifier`, `versionCode`, `buildNumber`, description. |
| `mobile/package.json` | Đổi npm package name sang `smart-heritage-mobile`; thêm direct peer `expo-asset~57.0.21` cho `expo-audio`. |
| `mobile/package-lock.json` | Đồng bộ tên package và `expo-asset@57.0.21`. |
| `mobile/eas.json` | Thêm profile `demo` tạo APK internal; giữ profile development/production. |
| `mobile/.gitignore` | Ignore `*.apk`, `*.aab` để tránh commit binary. |
| `mobile/README.md` | Thêm mục build APK demo và link hướng dẫn. |
| `docs/deployment/mobile-android-release.md` | Hướng dẫn build/cài/verify APK, release notes và giới hạn. |
| `docs/features/ibeacon-mobile-integration.md` | Link LTJ-70/71; cập nhật Admin Web `/beacons` đã có CRUD. |
| `docs/testing/sprint-5-beacon-physical-demo-checklist.md` | Cập nhật hướng dẫn dùng Admin Web `/beacons` thay vì SQL/API mặc định. |
| `docs/sprint-6/release-readiness.md` | Ghi nhận mobile identity/EAS demo config và link acceptance logs. |
| `docs/logs/LTJ-70.md`, `docs/logs/LTJ-71.md` | Acceptance log cho physical beacon và real-device multimedia. |
| `docs/logs/LTJ-72.md` | Log task này. |

## 2. Thông tin định danh

| Thuộc tính | Giá trị |
|---|---|
| App name | `Smart Heritage` |
| Expo slug | `smart-heritage` |
| URL scheme | `smartheritage` |
| Android application ID | `com.university.smartheritage` |
| iOS bundle identifier | `com.university.smartheritage` |
| App version | `1.0.0` |
| Android versionCode | `1` |
| iOS buildNumber | `1` |
| EAS demo profile | `demo`, `android.buildType = apk`, `distribution = internal` |

## 3. Kiểm chứng cấu hình

### 3.1 Expo public/prebuild config

```bash
cd mobile
npx expo config --type public
npx expo config --type prebuild
```

Kết quả rút gọn từ JSON:

```json
{
  "name": "Smart Heritage",
  "slug": "smart-heritage",
  "scheme": "smartheritage",
  "version": "1.0.0",
  "android": {
    "package": "com.university.smartheritage",
    "versionCode": 1
  },
  "ios": {
    "bundleIdentifier": "com.university.smartheritage",
    "buildNumber": "1"
  }
}
```

**PASS** — không còn `app_temp`, `apptemp`, `com.anonymous.*` hoặc
`com.placeholder.*` trong app config.

### 3.2 Android manifest introspection

```bash
npx expo config --type introspect
```

Kết quả manifest:

- `package = com.university.smartheritage`
- Có `ACCESS_FINE_LOCATION`
- Có `BLUETOOTH_SCAN`
- Có `BLUETOOTH_CONNECT`
- Có feature `android.hardware.bluetooth_le` (không bắt buộc)
- Có `tools:node="remove"` cho background location, Bluetooth advertise,
  foreground service, foreground service location/connected device và
  post notifications.
- Manifest đã chặn `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`,
  `SYSTEM_ALERT_WINDOW` và các quyền foreground service/background location không
  cần thiết.
- Có `android:usesCleartextTraffic="true"` khi build demo với
  `EXPO_DEMO_CLEARTEXT=1` (chỉ cho demo HTTP LAN, không dùng production).

**PASS cho BLE permissions và manifest merge trong APK thật.** Đã verify APK:
package, permissions, cleartext và URL API nhúng.

### 3.3 Automated checks

| Check | Kết quả |
|---|---|
| `npx jest --ci --runInBand` | **PASS** — 12 suites, 108 tests |
| `npm run lint` | **PASS** |
| `npx tsc --noEmit` | **PASS** khi tạm move `playwright.config.ts` + `tests/` untracked ra ngoài; full repo vẫn fail vì các file Playwright untracked thiếu `@playwright/test` |
| `npx expo-doctor` | **20/21 PASS**; còn 9 package version mismatch có sẵn (Expo/Jest/async-storage), không phải lỗi cấu hình APK |

Lần chạy đầu sau khi sync `origin/main` fail vì `node_modules` cũ thiếu
`test-renderer` (dependency mới của hook tests). Đã chạy `npm ci --legacy-peer-deps`
rồi test lại. `npx expo-doctor` cũng phát hiện thiếu direct peer `expo-asset` cho
`expo-audio`; đã thêm `expo-asset@57.0.21` bằng `npm install --legacy-peer-deps`
(không dùng `expo install` vì xung đột peer Babel có sẵn). Các file Playwright
untracked đã được khôi phục nguyên trạng sau typecheck.

## 4. Acceptance criteria

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Package ID ổn định, team đồng ý | **PASS** | `com.university.smartheritage` |
| App branding đúng “Smart Heritage” | **PASS** | `app.json` name/description |
| APK build từ hướng dẫn tái lập | **PASS** | Local Docker builder (arm64, SDK36/build-tools36/NDK27/CMake3.22/JDK21/Gradle9.3.1/Node24.21.0) |
| APK cài và chạy trên device demo | **PASS (mở app)** | Người dùng đã cài và mở APK demo trên thiết bị Android thật |
| BLE module autolink trong native APK | **PASS** | DEX có `com/reactnativebeacon/*`, `org/altbeacon/beacon/*` |
| Permissions khai báo đúng | **PASS** | `aapt dump permissions`: BLE scan/connect, location, internet; chặn storage/SYSTEM_ALERT_WINDOW |
| APK version/SHA-256 trong release notes | **PASS** | `SmartHeritage-demo-arm64-lan.apk`, SHA-256 `97ed588c3f049925cfdad99c236c0801b52ab3c8d00ab3c1b9d4548d3eb42454` |
| Không commit binary/keystore/native generated | **PASS** | `.gitignore` + APK lưu trong `mobile/artifacts/` (bị `*.apk` ignore) |

### 4.1. By chứng APK đã build (2026-11-26)

- File: `mobile/artifacts/SmartHeritage-demo-arm64-lan.apk`
- SHA-256: `97ed588c3f049925cfdad99c236c0801b52ab3c8d00ab3c1b9d4548d3eb42454`
- Package: `com.university.smartheritage`, `versionCode 1`, `versionName 1.0.0`
- Ch ký: debug keystore (chỉ demo, không publish store)
- URL API nhúng: `http://192.168.1.48:8081/api` (LAN qua Windows proxy)
- Chứng chỉ SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`
- Lưu ý: `EXPO_DEMO_CLEARTEXT=1` bật `usesCleartextTraffic` vì demo gọi HTTP LAN;
  production phải dùng HTTPS và không bật cleartext toàn cục.

## 5. Cách build/cài

Xem chi tiết tại
[`docs/deployment/mobile-android-release.md`](../deployment/mobile-android-release.md).

Tóm tắt:

```bash
cd mobile
npx eas-cli@latest build -p android --profile demo
```

Hoặc local arm64:

```bash
cd mobile
npx expo prebuild --platform android --clean
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Hoặc local trong Docker (đã verify 2026-11-26, không cần Android SDK host):

```bash
cd mobile
EXPO_DEMO_CLEARTEXT=1 npx expo prebuild -p android --no-install
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.48:8081/api ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --stacktrace
```

Sau đó verify package/permissions/signature/checksum và cài bằng `adb install` hoặc cài trực tiếp APK qua trình quản lý tệp.

## 6. Giới hạn / việc còn lại

- Đã build APK local trong Docker builder (không cần Android SDK host); JDK/CMake/Gradle
  đã có trong image.
- Chưa có `adb`, nên cài APK bằng trình quản lý tệp/trình duyệt trên thiết bị thật.
- Device model/Android version và kết quả chạy đầy đủ beacon/multimedia chưa ghi
  vào release notes vì chưa có evidence thiết bị thật.
- Không đánh dấu physical beacon/multimedia acceptance là PASS dựa trên `expo config`;
  chỉ đánh dấu PASS cho build/verify APK và cài mở demo.

## 7. Cập nhật 2026-11-28 — bản 1.1.0 xem offline

| Thuộc tính | Giá trị |
|---|---|
| File | `mobile/artifacts/SmartHeritage-1.1.0-demo-arm64.apk` (44 MB) |
| Version | `1.1.0`, `versionCode 2`, chỉ `arm64-v8a` |
| SHA-256 | `19e414aeb187e059bbdb967f4f61b02172fb3a0e7cb150761fa54cce5b1c48f0` |
| Chứng chỉ SHA-256 | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` (debug, trùng bản 1.0.0 trong log này) |
| Địa chỉ mặc định | `http://192.168.1.48:8081/api`, đổi được trên điện thoại |
| Cách build | `scripts/deployment/build-android-demo.sh` |

Thay đổi: tải gói nội dung xem offline, xếp hàng tương tác khi mất mạng, đổi địa
chỉ máy chủ, hiện nguồn ảnh, xin thêm `ACCESS_COARSE_LOCATION` (Android 12+ bỏ
qua yêu cầu chỉ xin vị trí chính xác).

Kiểm tra tự động: Jest 129 test, TypeScript, lint **PASS**; backend 161 unit test
và 75 test PostgreSQL **PASS**.

Chạy thử trên **Android 14 emulator x86_64** (không phải thiết bị thật, bản build
trước khi sửa phần hiển thị nguồn ảnh): tải gói 12 hiện vật **PASS**; chế độ máy
bay xem danh sách, ảnh, audio, video **PASS**; gửi bù `VIEW` và `AUDIO_PLAY`
**PASS**; cấp quyền và bắt đầu quét **PASS**; beacon kích hoạt hiện vật
**NOT VERIFIED** (đây là phạm vi lần chạy emulator).

Trên thiết bị thật (Xiaomi Note 11T Pro, Android 13, 28/11/2026): người test cài APK arm64 cuối và mở app
**PASS**; quét beacon giả lập (app Beacon Simulator trên iPhone 13 Pro Max) **PASS** — xem
[LTJ-70](LTJ-70.md) mục 2.2.

Hướng dẫn demo: [offline-demo.md](../features/offline-demo.md).
