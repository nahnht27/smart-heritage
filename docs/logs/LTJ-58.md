# Log: Branch LTJ-58

## Thông tin chung

- **Branch:** `LTJ-58`
- **Task:** Native iBeacon Build & Physical Device Verification
- **Sprint:** M4 — Sprint 4
- **Mục tiêu:** Kiểm chứng implementation foreground iBeacon trên native build và thiết bị thật, sửa các lỗi tương thích/độ tin cậy cụ thể với thay đổi tối thiểu, giữ nguyên API contract backend.
- **Kết luận nhanh:** Source review + automated tests + backend Docker verification PASS. Native build và thiết bị vật lý **NOT VERIFIED** trong môi trường hiện tại. iOS **UNVERIFIED**.

## 1. Repository audit

### 1.1. Vị trí và phiên bản

- Mobile app: `mobile/` (Expo managed workflow, CNG; không có `android/` hoặc `ios/`).
- Backend: `backend/` (Spring Boot + PostgreSQL + Flyway).
- Docker: `docker-compose.yml`, `docker-compose.production.yml`.

| Thành phần | Phiên bản thực tế |
|---|---|
| Expo SDK | `expo@57.0.27` (package.json `~57.0.27`) |
| React Native | `0.86.3` |
| React | `19.2.3` |
| iBeacon/BLE | `react-native-beacon-kit@0.12.0` |
| Permissions | `react-native-permissions@5.6.3` |
| Expo Router | `expo-router@57.0.25` |
| expo-crypto | `expo-crypto@57.0.4` |
| TypeScript | `6.0.3` |

Trạng thái ban đầu: `node_modules` không khớp lockfile — thiếu `expo-crypto`, `react-native-beacon-kit`, `react-native-permissions`. Đã khôi phục bằng `npm ci --legacy-peer-deps`; không đổi phiên bản dependency.

### 1.2. File liên quan beacon

- `mobile/src/services/beacon/ibeacon.ts` — validate/normalize UUID, major, minor; parse native reading; tạo region.
- `mobile/src/services/beacon/trigger.ts` — state machine entry/exit, RSSI threshold, debounce, cooldown.
- `mobile/src/services/beacon/beaconService.ts` — wrapper native scanner + runtime permissions + environment/subscriptions.
- `mobile/src/services/beacon/beaconApi.ts` — `GET /api/beacons/resolve`.
- `mobile/src/hooks/use-beacon-discovery.ts` — vòng đời quét, AppState, focus, resolve, interaction, banner.
- `mobile/src/components/beacon-discovery-panel.tsx` — toggle, trạng thái, banner.
- `mobile/src/app/home.tsx` — tích hợp panel, điều hướng artifact detail.
- `mobile/src/services/interactionApi.ts` — `POST /api/interactions`, `BEACON_TRIGGER`.
- `mobile/plugins/with-beacon-permissions.js` — Android permissions + iOS Info.plist.
- `mobile/app.json` — plugin registration.

### 1.3. Luồng hiện tại

```text
Home toggle
  -> requestBeaconPermissions()
  -> getBeaconEnvironmentState()
  -> Beacon.configure() + startRanging(region)
  -> onBeaconsRanged
  -> parseNativeBeacon()
  -> BeaconTriggerController.observe()
  -> GET /api/beacons/resolve?uuid=&major=&minor=
  -> banner + POST /api/interactions (BEACON_TRIGGER)
  -> user taps "Xem chi tiết" -> artifact_detail
```

### 1.4. Backend / Docker

- Compose service: `postgres` (PostgreSQL 16), `backend` (Spring Boot, port `8080`).
- Container names: `smart-heritage-db`, `smart-heritage-backend`.
- Mobile base URL: `EXPO_PUBLIC_API_BASE_URL`, mặc định `http://10.0.2.2:8080/api` trên Android emulator và `http://localhost:8080/api` trên iOS/web.
- Physical device phải dùng IP LAN của máy chạy Docker, ví dụ `http://<LAN_IP>:8080/api`; **không** dùng `localhost`.
- Beacon endpoint: `GET /api/beacons/resolve?uuid={uuid}&major={major}&minor={minor}` (public).
- Artifact endpoint: `GET /api/artifacts/{artifactId}` (public).
- Interaction endpoint: `POST /api/interactions` (public, token optional).

## 2. Compatibility analysis

- `react-native-beacon-kit@0.12.0` là TurboModule/New Architecture, peer `react-native: "*"`; được build với RN 0.83.x, project dùng RN 0.86.3 → API JavaScript/types khớp, nhưng native compile/link **cần native build xác minh**.
- Thư viện cần Expo config plugin hoặc manifest permissions. Project dùng custom plugin `plugins/with-beacon-permissions.js` thay vì plugin của thư viện; introspection xác nhận `ACCESS_FINE_LOCATION`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` và remove các quyền background/FGS.
- `react-native-permissions@5.6.3` tương thích RN mới; API đang dùng (`PERMISSIONS`, `RESULTS`, `requestMultiple`) khớp package đã cài.
- Native module cần development build; **không** chạy được trong Expo Go.
- Android target/compile SDK do Expo SDK 57 quyết định; chưa có native build nên chưa xác minh Gradle/AGP/Kotlin/manifest merge.

## 3. Gap analysis

| Requirement | Current implementation | Status | Evidence | Required action |
|---|---|---|---|---|
| Android native build compatibility | CNG, chưa có `android/` | REQUIRES NATIVE BUILD VERIFICATION | Không có Android SDK/ADB/Gradle trong môi trường | `npx expo prebuild` + `npx expo run:android` trên máy có SDK |
| BLE/iBeacon library compatibility | `react-native-beacon-kit@0.12.0`, API/types khớp | REQUIRES NATIVE BUILD VERIFICATION | Source + installed `.d.ts`; build với RN 0.83.x | Build native, kiểm tra Gradle/codegen |
| Native module linking | Autolinking + custom config plugin | REQUIRES NATIVE BUILD VERIFICATION | `app.json`, introspection plugin PASS | Build native, xác nhận module load |
| Required Android permissions | FINE_LOCATION, BLUETOOTH_SCAN/CONNECT; remove background/FGS | COMPLETE FROM SOURCE REVIEW | `expo config --type introspect` | Xác nhận merged manifest trên native build |
| Bluetooth state handling | Check lúc start + `onScannerStateChanged` khi đang quét | COMPLETE FROM SOURCE REVIEW | `use-beacon-discovery.ts` | Physical device test |
| UUID parsing | Regex + normalize lowercase | COMPLETE FROM SOURCE REVIEW | `ibeacon.ts`; `ibeacon.test.ts` | — |
| Major parsing | Integer `0..65535` | COMPLETE FROM SOURCE REVIEW | `ibeacon.ts`; `ibeacon.test.ts` | — |
| Minor parsing | Integer `0..65535` | COMPLETE FROM SOURCE REVIEW | `ibeacon.ts`; `ibeacon.test.ts` | — |
| Real Beacon detection | Native ranging wired | REQUIRES PHYSICAL DEVICE VERIFICATION | `beaconService.ts`, hook | Test với beacon thật |
| Beacon resolution API | `GET /api/beacons/resolve` | COMPLETE FROM SOURCE REVIEW | `beaconApi.ts`; Docker live test 200/404 | — |
| Correct Artifact returned | `artifactId`/`artifactName` từ response | COMPLETE FROM SOURCE REVIEW | `beaconApi.ts`; Docker live test | — |
| Repeated scan packet protection | `BeaconTriggerController` one trigger per entry | COMPLETE FROM SOURCE REVIEW | `trigger.ts`; `beaconTrigger.test.ts` | — |
| Duplicate interaction event prevention | One trigger per entry + cooldown 60s + backend `eventId` idempotency | COMPLETE FROM SOURCE REVIEW | `trigger.ts`; tests; Docker retry 200/1 row | Physical pause/resume test |
| RSSI threshold behavior | `-75 dBm` explicit | COMPLETE FROM SOURCE REVIEW | `trigger.ts`; tests | Calibrate with hardware |
| Cooldown behavior | 60,000 ms per beacon, survives `reset()` | COMPLETE FROM SOURCE REVIEW | `trigger.ts`; new tests | Physical test |
| Scanner cleanup | Stop on blur, background, disable, unmount | COMPLETE FROM SOURCE REVIEW | `useFocusEffect`, AppState effect, cleanup | Physical navigate-away test |
| Navigation cleanup | Home blur stops scanner | COMPLETE FROM SOURCE REVIEW | `useFocusEffect` | Physical test |
| Foreground/background behavior | Pause on background, resume on foreground + focus | PARTIALLY COMPLETE | Source review | Physical device test |
| iOS verification status | Info.plist configured | UNVERIFIED | Introspection only; no macOS/Xcode | iOS build + device test |

## 4. Thay đổi implementation

### 4.1. Cooldown chống ghi trùng — `mobile/src/services/beacon/trigger.ts`

- **Vấn đề:** scanner dừng khi app vào nền/rời màn hình và `reset()` xoá zone state. Nếu người dùng vẫn đứng cạnh beacon, khi resume scanner trigger lại và ghi thêm `BEACON_TRIGGER` cho cùng một lượt tham quan.
- **Nguyên nhân:** chỉ có entry/exit debounce, không có cooldown xuyên qua pause/resume.
- **Sửa:** thêm `DEFAULT_TRIGGER_COOLDOWN_MS = 60_000`, option `cooldownMs`, map `lastTriggeredAt`. `reset()` chỉ xoá zone state, giữ cooldown.
- **Vì sao:** chặn resolve/ghi trùng mà không đổi API contract hay hành vi Artifact.

### 4.2. Vòng đời theo focus — `mobile/src/hooks/use-beacon-discovery.ts`

- **Vấn đề:** Home vẫn mounted khi push `artifact_detail`, nên cleanup chỉ theo unmount không dừng scanner khi rời màn hình.
- **Sửa:** `useFocusEffect` dừng scanner khi blur, khởi động lại khi focus nếu toggle còn bật; thêm `focusedRef`, `startingRef` chống start trùng.
- **Vì sao:** đáp ứng yêu cầu “scanner must stop and clean up when leaving the relevant screen”.

### 4.3. Thay đổi môi trường khi đang quét — `mobile/src/hooks/use-beacon-discovery.ts`, `mobile/src/services/beacon/beaconService.ts`

- **Vấn đề:** Bluetooth/vị trí tắt giữa lúc quét chỉ tạo lỗi chung chung, UI có thể vẫn hiển thị “đang quét”.
- **Sửa:** subscribe `Beacon.onScannerStateChanged`; tắt toggle + dừng quét + trạng thái `bluetooth_off`/`location_off`/`permission_denied`. Dùng `canScanInForeground` thay vì `permissionsGranted` vì bản foreground-only không xin `ACCESS_BACKGROUND_LOCATION`.
- **Vì sao:** trạng thái lỗi rõ ràng, không quét “mù”.

### 4.4. Lỗi resolve và nhiều beacon — `mobile/src/hooks/use-beacon-discovery.ts`

- **Vấn đề:** lỗi mạng bị báo như “không tìm thấy hiện vật”; response cũ của beacon A có thể ngăn interaction của A bị ghi nếu beacon B trigger sau.
- **Sửa:** phân biệt `404` với lỗi mạng/5xx; chỉ response mới nhất cập nhật banner, nhưng mỗi trigger hợp lệ vẫn ghi interaction.
- **Vì sao:** thông báo đúng bản chất lỗi, không mất event hợp lệ.

### 4.5. Dependency

- Chạy `npm ci --legacy-peer-deps` để cài đúng lockfile. Final M3 audit thêm `test-renderer@1.3.0` làm devDependency cho hook tests; không upgrade Expo/RN/runtime dependency.

## 5. Kiểm thử tự động

| Check | Kết quả |
|---|---|
| `npm ci --legacy-peer-deps` | PASS |
| Jest (`npx jest --ci --runInBand`) | PASS — 12 suites, 108 tests (final M3 audit) |
| Source TypeScript (`tsc` chỉ `src/**`) | PASS |
| `npm run lint` | PASS |
| Expo config introspection | PASS |
| `npx expo-doctor` | 19/21; 2 cảnh báo dependency có sẵn, không do LTJ-58 |

Tests mới trong `mobile/src/services/__tests__/beaconTrigger.test.ts`:

- Cooldown chặn trigger thứ hai sau `reset()` (mô phỏng pause/resume).
- Cooldown hết hạn cho phép trigger mới.
- Cooldown độc lập theo từng beacon.

Các test này **không** thay thế kiểm thử phần cứng.

`npx tsc --noEmit` toàn repo PASS trong final M3 audit.

## 6. Backend + Docker verification

- Dev stack hiện có volume bị lệch schema (`duration_seconds` `int4` vs entity `bigint`), backend restart loop.
- Không xoá volume dev. Kiểm chứng bằng Compose project cô lập `ltj58`, port `18080`, volume mới:

```bash
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

Kết quả:

| Check | Kết quả |
|---|---|
| `GET :18080/api/health` | 200 `{"status":"UP"}` |
| Resolve beacon không tồn tại | 404 `"Beacon not found or disabled"` |
| Seed site/artifact/beacon + resolve | 200, đúng `beaconId`/`artifactId`/`artifactName`/`siteId`/`siteName` |
| `POST /api/interactions` BEACON_TRIGGER | 201 |
| Gửi lại cùng `eventId` | 200, “already recorded” |
| DB rows theo `eventId` | 1 |

Lưu ý: đây là bằng chứng Docker lịch sử của Wave 4. Máy final M3 audit không có Docker daemon; xem mục 11.5 cho phạm vi chạy lại.

## 7. Native build và thiết bị vật lý

**Native build: NOT VERIFIED.**

- `ANDROID_HOME`/`ANDROID_SDK_ROOT` trống, không có `adb`, `gradle`, Android SDK.
- Không có macOS/Xcode cho iOS.
- `mobile/android`/`mobile/ios` không tồn tại (CNG).

**Physical device: NOT VERIFIED.** Không có beacon vật lý, không có thiết bị BLE kết nối.

Checklist chi tiết và trạng thái từng mục nằm trong `docs/features/ibeacon-mobile-integration.md` (mục 7.1). Tất cả mục phần cứng đang là **NOT YET PHYSICALLY VERIFIED**.

## 8. Known limitations

1. Chưa xác minh Gradle/AGP/Kotlin/codegen/manifest merge của `react-native-beacon-kit` trên Expo SDK 57/RN 0.86.3.
2. Chưa xác minh beacon thật, RSSI thực tế, hành vi permission trên thiết bị.
3. Cooldown 60 giây là heuristic, cần hiệu chỉnh sau khi có beacon thật.
4. Foreground-only; không có background scanning/foreground service.
5. Cần mạng để resolve beacon → artifact; không có cache offline.
6. iOS **UNVERIFIED**.
7. Volume PostgreSQL dev hiện tại bị lệch schema; cần `docker compose down -v` hoặc migration/repair riêng nếu muốn dùng lại stack dev.

## 9. S5-M2-02 backend audit — Beacon resolution integrity & performance

**Kết luận:** implementation backend hiện tại đã đáp ứng các yêu cầu integrity chính;
không cần sửa source. Đã bổ sung PostgreSQL integration test để khóa hành vi bằng
schema thật thay vì chỉ H2/unit test.

### 9.1. Đã có trong source

| Yêu cầu | Bằng chứng |
|---|---|
| Identity duy nhất `(UUID, major, minor)` | `uk_beacon_identity` trong `V3__beacon_management.sql`; `BeaconService.validateIdentityAvailable()` |
| Major/minor `0..65535` | `@Min/@Max` ở `BeaconRequest`, `BeaconController`; check constraints `ck_beacon_major_range`, `ck_beacon_minor_range` |
| Resolve chỉ trả beacon enabled | `BeaconService.resolveBeacon()` filter `Beacon::isEnabled` |
| Unknown/disabled → 404 | `ResourceNotFoundException` + `GlobalExceptionHandler` |
| Unmapped beacon xử lý an toàn | Resolve trả `artifactId = null`; mobile hiển thị “chưa được gán hiện vật” và không mở artifact |
| Resolve dùng unique index | Query theo đúng bộ ba identity; PostgreSQL dùng `uk_beacon_identity` |
| Duplicate create race → 409 | DB constraint + `GlobalExceptionHandler` nhận diện `uk_beacon_identity` |
| Xóa beacon giữ interaction | `fk_visitor_interaction_beacon` với `ON DELETE SET NULL` |
| `BEACON_TRIGGER` integrity | `VisitorInteractionService.resolveBeacon()` bắt buộc beacon tồn tại, enabled, có artifact và artifact khớp request |

### 9.2. Test bổ sung

File ban đầu: `backend/src/test/java/com/university/backend/integration/BeaconPostgresIT.java`
(profile `postgres-test`, PostgreSQL 16, Flyway thật). Trong final audit file này đã
được hợp nhất vào `BeaconResolutionIntegrityIT` và xóa để tránh suite trùng; xem mục 11.

- Schema: unique identity, check range, FK artifact/beacon, 3 index liên quan, migration V3.
- Resolve enabled/disabled/unknown/unmapped.
- DB reject duplicate identity, major/minor ngoài range, artifact không tồn tại.
- `EXPLAIN` xác nhận resolve dùng `uk_beacon_identity`.
- 32 concurrent resolve trả cùng artifact (baseline local ~236 ms).
- Concurrent duplicate create: đúng 1 beacon được tạo, 1 request bị reject.
- Xóa beacon: interaction còn lại và `beacon_id` chuyển `NULL`.

Kết quả chạy:

| Check | Kết quả |
|---|---|
| `BeaconPostgresIT` | PASS — 8 tests |
| `BeaconServiceTest` | PASS — 7 tests |
| Full backend Surefire | PASS — 134 tests |

### 9.3. Gap còn lại

- Admin Web `/beacons` vẫn là `PlaceholderPage`; demo phải cấu hình beacon qua Admin API.
- Chưa có physical test/beacon thật; xem checklist
  `docs/testing/sprint-5-beacon-physical-demo-checklist.md`.
- Performance baseline chỉ là local Docker, không phải benchmark production.

## 10. Files changed

- `mobile/src/services/beacon/trigger.ts` — thêm cooldown per beacon.
- `mobile/src/services/beacon/beaconService.ts` — thêm subscription `onScannerStateChanged`.
- `mobile/src/hooks/use-beacon-discovery.ts` — focus lifecycle, scanner state handling, resolve error handling, start guard.
- `mobile/src/services/__tests__/beaconTrigger.test.ts` — cooldown tests, including same UUID/different major-minor.
- `mobile/src/hooks/__tests__/use-beacon-discovery.test.tsx` — focus/AppState/stale-resolve lifecycle tests.
- `mobile/README.md` — cập nhật mô tả foreground lifecycle/cooldown.
- `docs/features/ibeacon-mobile-integration.md` — cập nhật trigger rules, lifecycle, verification evidence.
- `backend/src/test/java/com/university/backend/integration/BeaconResolutionIntegrityIT.java` — consolidated PostgreSQL integrity/performance coverage (duplicate `BeaconPostgresIT` removed).
- `docs/testing/sprint-5-beacon-physical-demo-checklist.md` — checklist demo 2 beacon trên thiết bị thật.
- `docs/logs/LTJ-58.md` — log này.

Không thay đổi backend API contract, schema, hay hành vi Artifact/interaction.

## 11. Final M3 audit, integration and hardening (2026-11-17)

### 11.1. Integration

- Merged `origin/main` @ `a4e20b3` into `LTJ-58` with a normal merge commit
  `aa7af8d69a73c12541d5d2fbdf48494c66aac440`; no rebase/reset/force-push.
- Auto-merged only `docs/features/ibeacon-mobile-integration.md`; no conflicts.
- Existing M3 work preserved; no backend API/schema production change.

### 11.2. Beacon lifecycle fixes

- Added a scan-session token in `use-beacon-discovery.ts`. A resolve response that
  arrives after blur/background/disable is ignored, so it cannot update the banner,
  status, or record a stale interaction.
- The ranging callback now checks `enabled`, `focused`, and `scanning` before doing
  any work.
- Repeated AppState `background` events no longer call stop repeatedly; stop runs
  only while the scanner is actually active. Foreground/focus/start guards remain
  idempotent.
- Cooldown remains per canonical identity `UUID + Major + Minor`; `reset()` does not
  clear cooldown. Beacon A and Beacon B can both trigger inside the same 60-second
  window, while the same beacon cannot re-trigger after pause/resume.

### 11.3. Regression tests

- `mobile/src/services/__tests__/beaconTrigger.test.ts`: same UUID with different
  `major/minor` has an independent cooldown; original identity remains suppressed.
- `mobile/src/hooks/__tests__/use-beacon-discovery.test.tsx`: 6 tests covering
  duplicate focus/start prevention, blur stop, background/foreground idempotency,
  listener cleanup on unmount, Bluetooth unavailable, scanner-state revocation, and
  stale in-flight resolve from a previous session.

### 11.4. Backend test consolidation

- Removed duplicate `BeaconPostgresIT` (8 tests) after comparing it with M2
  `BeaconResolutionIntegrityIT`.
- Preserved its unique coverage by adding to `BeaconResolutionIntegrityIT`:
  direct-PostgreSQL rejection of out-of-range rows / unknown artifact, and
  `ON DELETE SET NULL` behavior for `visitor_interaction.beacon_id`.
- Added missing schema assertions for `fk_visitor_interaction_beacon`,
  `idx_visitor_interaction_beacon_id`, and the `visitor_interaction.beacon_id`
  column.
- CI report threshold updated from 15 to 17 tests for this class.

### 11.5. Verification run

| Check | Result |
|---|---|
| Backend unit tests | PASS — 154 tests |
| `BeaconResolutionIntegrityIT` on PostgreSQL 16 | PASS — 17 tests |
| Full PostgreSQL suite locally | PARTIAL — `VisitorInteractionPostgresIT` 22, `BeaconResolutionIntegrityIT` 17, `ArtifactQueryOptimizationIT` 5 passed; `DatabaseMigrationIT`/`SchemaDetectorIT` require Docker/Testcontainers, unavailable locally |
| Mobile Jest | PASS — 12 suites, 108 tests |
| Mobile TypeScript (`npx tsc --noEmit`) | PASS |
| Mobile lint (`npm run lint`) | PASS |
| Native Android build/device | NOT VERIFIED — no Android SDK/ADB/Gradle/device |
| iOS | UNVERIFIED — no macOS/Xcode/device |

`test-renderer@1.3.0` was added as a mobile devDependency so hook lifecycle tests
can run in the existing Jest setup; no production dependency changed.

### 11.6. S5-M3-01 status

- Software implementation, automated tests, source review, and permission audit:
  PASS.
- Native build, real BLE ranging, and physical-device behavior remain **NOT
  VERIFIED**. S5-M3-01 stays **NOT FULLY ACCEPTED** until
  `docs/testing/sprint-5-beacon-physical-demo-checklist.md` is executed on hardware.
