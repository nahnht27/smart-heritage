# Mobile Android Demo Build & Release Guide

Hướng dẫn tạo APK demo cho Visitor Mobile App. APK demo **không** thay thế
release production trên Google Play.

## 1. Thông tin định danh

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
| Cấu hình | `mobile/app.json`, Expo CNG |
| EAS demo profile | `mobile/eas.json` → `demo` (`android.buildType: apk`) |

Application ID là định danh cài đặt/release. Không đổi ID sau khi đã phát APK
cho người dùng; chỉ tăng `version`/`versionCode` cho build mới.

## 2. Điều kiện môi trường

Chọn một trong hai cách:

### Cách A — EAS Build (khuyến nghị cho demo)

- Có tài khoản Expo/EAS và quyền build project.
- Máy chỉ cần Node.js + npm; không cần Android SDK cục bộ.
- Cần mạng để upload source và tải APK.

### Cách B — Local native build

- Node.js `>= 18`, npm.
- JDK 17.
- Android SDK: platform + build-tools + platform-tools (`adb`).
- `ANDROID_HOME`/`ANDROID_SDK_ROOT` và `JAVA_HOME` đã cấu hình.
- Đủ dung lượng cho Gradle cache và native build.

Không commit thư mục `mobile/android/` sinh bởi prebuild, APK/AAB hoặc keystore.

## 3. Kiểm tra cấu hình trước khi build

Từ thư mục `mobile/`:

```bash
npm ci --legacy-peer-deps
npx expo config --type public
npx expo config --type prebuild
```

Xác nhận output có:

```text
name: Smart Heritage
slug: smart-heritage
scheme: smartheritage
version: 1.0.0
android.package: com.university.smartheritage
android.versionCode: 1
ios.bundleIdentifier: com.university.smartheritage
ios.buildNumber: 1
```

Kiểm tra config plugin beacon:

```bash
npx expo config --type introspect
```

Kỳ vọng manifest có `ACCESS_FINE_LOCATION`, `BLUETOOTH_SCAN`,
`BLUETOOTH_CONNECT` và feature `android.hardware.bluetooth_le`.

## 4. Build APK

### Cách A — EAS Build

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure   # chỉ cần lần đầu, tạo/ghi nhận project ID
npx eas-cli@latest build -p android --profile demo
```

Khi build xong, tải APK từ URL EAS hoặc cài trực tiếp:

```bash
npx eas-cli@latest build:run -p android --latest
```

Profile `demo` tạo APK (`android.buildType: apk`) và distribution `internal`.
EAS quản lý signing cho build demo; không commit keystore.

### Cách C — Docker builder (đang dùng cho demo)

```bash
scripts/deployment/build-android-demo.sh http://<IP_LAN>:8081/api
```

Script chạy prebuild, build arm64 trong container, kiểm tra chữ ký/permissions và
in SHA-256. Xem thêm [bản demo offline](../features/offline-demo.md).

### Cách B — Local build, chỉ arm64-v8a

```bash
cd mobile
npx expo prebuild --platform android --clean
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

APK mặc định:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

Ghi chú:

- `--clean` xoá native project đã sinh trước đó; chỉ dùng khi chấp nhận tạo lại.
- Nếu chưa cấu hình release keystore riêng, Gradle có thể dùng debug keystore.
  APK đó chỉ dùng demo nội bộ, không dùng để phát hành production.
- Chỉ thêm ABI khác khi thiết bị demo không phải arm64.

## 5. Xác minh APK

Đặt biến đường dẫn build-tools nếu cần:

```bash
export BUILD_TOOLS="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
```

Kiểm tra package, version và permissions:

```bash
"$BUILD_TOOLS/aapt" dump badging mobile/android/app/build/outputs/apk/release/app-release.apk | head -20
"$BUILD_TOOLS/aapt" dump permissions mobile/android/app/build/outputs/apk/release/app-release.apk
```

Kỳ vọng:

```text
package: name='com.university.smartheritage' versionCode='1' versionName='1.0.0'
android.permission.BLUETOOTH_SCAN
android.permission.BLUETOOTH_CONNECT
android.permission.ACCESS_FINE_LOCATION
```

Kiểm tra chữ ký:

```bash
apksigner verify --print-certs mobile/android/app/build/outputs/apk/release/app-release.apk
```

Tính checksum để ghi release notes:

```bash
sha256sum mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 6. Cài và chạy trên thiết bị demo

Bật USB debugging trên điện thoại, kết nối máy tính:

```bash
adb devices
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
adb shell pm list packages | grep com.university.smartheritage
adb shell monkey -p com.university.smartheritage 1
```

Nếu dùng APK từ EAS, tải file `.apk` rồi thay đường dẫn trong lệnh `adb install`.

Trước khi test beacon:

- Bật Bluetooth và Location Services.
- Cấp `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`.
- Cấu hình `EXPO_PUBLIC_API_BASE_URL` trỏ tới backend reachable từ điện thoại
  **trước khi build**. Biến `EXPO_PUBLIC_*` được nhúng lúc build, không đổi sau
  khi cài APK.

## 7. Release notes mẫu

```text
Smart Heritage Mobile — Android demo
Version: 1.0.0
versionCode: 1
Package: com.university.smartheritage
Commit: <git sha>
Build date: <YYYY-MM-DD>
Build profile: demo / local-arm64
APK file: <filename>
SHA-256: <checksum>
Signing certificate SHA-256: <apksigner output>
Backend URL baked into build: <API base URL>
Tested device / Android version: <model / API level>
Install result: PASS / FAIL / NOT VERIFIED
Beacon / media acceptance: <link to LTJ-70/LTJ-71 evidence>
```

## 8. Giới hạn hiện tại

- APK demo 1.1.0 build bằng Docker builder (arm64) tại
  `mobile/artifacts/SmartHeritage-1.1.0-demo-arm64.apk`.
- Kết quả trên thiết bị thật: [LTJ-70](../logs/LTJ-70.md) (beacon giả lập) và
  [LTJ-71](../logs/LTJ-71.md). Video demo: [demo.mp4](../evidence/demo.mp4).
- Không commit APK/AAB, keystore, `mobile/android/` hoặc `mobile/ios/`.
- Không đánh dấu APK/device acceptance là PASS nếu chưa cài và chạy thực tế.
