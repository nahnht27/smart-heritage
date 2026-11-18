# Log: LTJ-59 — Multimedia Playback & Mobile Lifecycle Reliability

## Thông tin chung

- **Task:** LTJ-59 — Multimedia Playback & Mobile Lifecycle Reliability
- **Working tree:** `LTJ-58` (chưa tạo branch `LTJ-59`; không commit)
- **Phạm vi:** ổn định playback IMAGE/AUDIO/VIDEO trong Artifact Detail, lifecycle khi rời màn hình/background, lỗi media và retry.
- **Ràng buộc:** không đổi API contract backend, không đổi navigation, giữ hành vi ghi `VIEW`/`AUDIO_PLAY`, thay đổi tối thiểu.
- **Kết luận nhanh:** Source review + automated tests + lint + source TypeScript + Docker/backend live API PASS. Playback thực tế trên thiết bị **NOT VERIFIED**; iOS **UNVERIFIED**.

## 1. Audit hiện trạng

### 1.1. Thành phần và phiên bản

| Thành phần | Phiên bản |
|---|---|
| Expo SDK | `expo@57.0.27` |
| React Native | `0.86.3` |
| React | `19.2.3` |
| Audio | `expo-audio@57.0.5` |
| Video | `expo-video@57.0.5` |
| Image | `expo-image@57.0.5` |
| Router | `expo-router@57.0.25` |
| TypeScript | `6.0.3` |

### 1.2. Luồng hiện tại

```text
Artifact Detail
  -> GET /api/artifacts/{id}
  -> GET /api/multimedia?artifactId={id}
  -> lọc IMAGE / AUDIO / VIDEO
  -> MultimediaPlayer
       IMAGE -> RemoteImage
       AUDIO -> expo-audio (useAudioPlayer + useAudioPlayerStatus)
       VIDEO -> expo-video (useVideoPlayer + VideoView)
  -> AUDIO_PLAY interaction khi audio bắt đầu phát
  -> VIEW interaction một lần cho mỗi artifact
```

- `mobile/src/components/multimedia-player.tsx`: render media, audio play/pause, video native controls.
- `mobile/src/components/remote-image.tsx`: chỉ render URL http(s); ảnh lỗi/null dùng placeholder.
- `mobile/src/app/artifact_detail.tsx`: tải artifact + multimedia, ghi interaction, render media.
- `mobile/src/services/heritageApi.ts`: normalize `IMAGE|AUDIO|VIDEO|UNKNOWN`, validate URL, gọi multimedia API.
- `mobile/src/services/interactionApi.ts`: `POST /api/interactions`, idempotent theo `eventId`.
- Backend: `GET /api/multimedia?artifactId={id}` public; trả `multimediaId`, `artifactId`, `artifactName`, `type`, `title`, `url`.
- DB `multimedia.url` là `text`; backend không validate URL và không serve file media.

### 1.3. Trạng thái trước khi sửa

- Audio có play/pause, loading spinner, lỗi chung; **không retry**.
- Video dùng native controls; lỗi hiển thị raw `error.message`; **không loading overlay, không retry**.
- Nhiều audio/video có thể phát đồng thời.
- Không pause khi Artifact Detail mất focus hoặc app vào background; chỉ dựa vào auto-release khi unmount.
- Lỗi tải multimedia bị bỏ qua hoàn toàn, không có thông báo/retry.
- URL audio/video không hợp lệ bị lọc khỏi UI, không có phản hồi cho người dùng.
- Unknown media type bị bỏ qua.

## 2. Gap analysis

| Requirement | Trước sửa | Sau sửa | Evidence |
|---|---|---|---|
| IMAGE rendering | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | `RemoteImage` chỉ nhận http(s), placeholder khi lỗi |
| IMAGE loading/retry | MISSING | PARTIALLY COMPLETE | Placeholder, không có retry ảnh |
| AUDIO load/play/pause | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | `useAudioPlayer`, `useAudioPlayerStatus`; test helper |
| VIDEO load/play/pause | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | `useVideoPlayer`, `VideoView`; test helper |
| Media loading state | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | Audio spinner + text; video overlay |
| Media error state | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | Thông báo thân thiện, không lộ lỗi thô |
| Media retry | MISSING | COMPLETE FROM SOURCE REVIEW | Audio `replace`, video `replaceAsync` |
| Invalid media URL | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | URL http(s) check; audio/video lỗi hiển thị `InvalidMedia` |
| Unsupported media format | MISSING | COMPLETE FROM SOURCE REVIEW | `UNKNOWN` được normalize và hiển thị “Nội dung khác” |
| Network/server error | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | Lỗi tải media có thông báo + retry |
| Playback init failure | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | Error state + retry tại chỗ |
| Switching artifact | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | Media reset, player keyed theo `m.id` |
| Leaving Artifact Detail | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | `useIsFocused` truyền `shouldPause` |
| Component unmount cleanup | COMPLETE FROM SOURCE REVIEW | COMPLETE FROM SOURCE REVIEW | Expo hooks auto-release |
| Background/foreground | MISSING | COMPLETE FROM SOURCE REVIEW | `AppState` listener pause; không auto-resume |
| Simultaneous playback | MISSING | COMPLETE FROM SOURCE REVIEW | `activeMediaId` + `shouldPause` |
| Duplicate AUDIO_PLAY | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | `reportedPlayback` ref + backend `eventId` |
| Duplicate VIEW | COMPLETE FROM SOURCE REVIEW | COMPLETE FROM SOURCE REVIEW | `recordedArtifactId` ref |
| Automated media tests | PARTIALLY COMPLETE | COMPLETE FROM SOURCE REVIEW | New `mediaPlayback.test.ts`; no component render tests |
| Physical playback | NOT VERIFIED | NOT VERIFIED | Không có thiết bị/native build |

## 3. Thay đổi implementation

### 3.1. Tách URL validation — `mobile/src/services/media/url.ts`

- Chuyển `isUsableMediaUrl` sang module thuần, không import React Native.
- `heritageApi.ts` re-export để giữ nguyên public API và test hiện có.
- Lý do: media helper test được trong Jest node environment mà không cần mock `react-native`.

### 3.2. Playback helpers — `mobile/src/services/media/playback.ts`

Các pure function:

- `canRetryMediaSource(url)`: chỉ URL http(s) mới được retry.
- `shouldActivateMediaSession(isPlaying, alreadyActivated)`: chỉ kích hoạt session khi media bắt đầu phát lần đầu.
- `shouldReportAudioPlayback(isPlaying, alreadyReported)`: chống ghi `AUDIO_PLAY` lặp.
- `shouldPauseMediaPlayback(shouldPause, isPlaying)`: chỉ pause player đang phát.
- `isMediaLoading(hasError, isLoaded)`.
- `getMediaErrorMessage(type)`: thông báo thân thiện, không chứa lỗi kỹ thuật thô.

### 3.3. Multimedia player — `mobile/src/components/multimedia-player.tsx`

- **Background pause:** mỗi player subscribe `AppState`; khi app không còn `active`, gọi `pause()` trực tiếp. Không auto-resume khi foreground.
- **Exclusive playback:** khi audio/video bắt đầu phát, gọi `onActivate(item)`; Artifact Detail giữ `activeMediaId`. `pendingActivation` tránh pause nhầm player vừa bắt đầu trong cùng render trước khi parent cập nhật active id.
- **Focus/visibility pause:** nhận `shouldPause` cho screen focus; `isActive` riêng cho exclusive playback. Player pause khi mất focus hoặc khi media khác active (trừ lúc vừa activate).
- **Audio retry:** `player.replace(source)` trên player hiện tại.
- **Video retry:** `player.replaceAsync(source)`; loading overlay trong lúc retry.
- **Video loading:** overlay “Đang tải video...” khi `idle/loading` hoặc đang retry.
- **Friendly errors:** audio/video dùng `getMediaErrorMessage`, bỏ raw `error.message`.
- **Unknown type:** trả `InvalidMedia` thay vì `null`.
- **Duplicate AUDIO_PLAY:** giữ `reportedPlayback` ref; chỉ báo một lần cho mỗi lần phát.
- **Unmount:** không gọi release thủ công; `useAudioPlayer`/`useVideoPlayer` auto-release theo Expo SDK 57. Không thêm cleanup trùng.

### 3.4. Artifact Detail — `mobile/src/app/artifact_detail.tsx`

- Tách fetch multimedia khỏi fetch artifact.
- Thêm `isMultimediaLoading`, `multimediaError`, `multimediaRefreshKey`.
- Hiển thị loading/error multimedia và nút “Thử lại”.
- Phân biệt lỗi `404` với lỗi mạng/5xx khi tải multimedia.
- Thêm `activeMediaId`; truyền `onActivate` và `shouldPause` cho audio/video.
- Dùng `useIsFocused()` để pause khi rời màn hình.
- Không còn lọc bỏ audio/video URL lỗi; các item này hiển thị trạng thái không khả dụng. Ảnh URL lỗi vẫn dùng placeholder qua `RemoteImage`.
- Thêm section “Nội dung khác” cho media type `UNKNOWN`.
- Giữ nguyên `VIEW` một lần/artifact và `AUDIO_PLAY` một lần/lần phát.

## 4. Kiểm thử tự động

| Check | Kết quả |
|---|---|
| Jest (`npx jest --ci --runInBand`) | **PASS** — 12 suites, 108 tests (final M3 audit) |
| `npm run lint` | **PASS** |
| Source TypeScript (`tsc` chỉ `src/**`) | **PASS** |
| `npx tsc --noEmit` toàn repo | **PASS** (final M3 audit) |
| Docker build backend | **PASS** (dùng image `ltj59-backend`) |

Test mới `mobile/src/services/__tests__/mediaPlayback.test.ts`:

- Validate retry chỉ với http(s).
- Kích hoạt media session đúng một lần.
- `AUDIO_PLAY` chỉ báo một lần.
- Chỉ pause khi cần và đang phát; không pause player vừa activate trong cùng render.
- Loading state đúng khi chưa load/chưa lỗi.
- Error message thân thiện, khác nhau cho audio/video.

Các test này **không** thay thế kiểm thử playback trên thiết bị.

## 5. Backend + Docker verification

Dev stack hiện có vẫn restart loop do volume lệch schema (`duration_seconds` `int4` vs `bigint`) từ trước; không xoá volume dev. Dùng Compose project cô lập `ltj59`, port backend `18081`, DB `15433`, volume mới:

```bash
cat > /tmp/ltj59-names.yml <<'YAML'
services:
  postgres:
    container_name: ltj59-db
  backend:
    container_name: ltj59-backend
YAML

BACKEND_PORT=18081 POSTGRES_PORT=15433 \
  docker compose -p ltj59 -f docker-compose.yml -f /tmp/ltj59-names.yml \
  up -d --build --wait --wait-timeout 600
```

Seed site/artifact/multimedia gồm IMAGE, AUDIO, VIDEO, AUDIO URL lỗi và type `PANORAMA`.

| Check | Kết quả |
|---|---|
| `GET :18081/api/health` | 200 `{"status":"UP"}` |
| `GET /api/artifacts/1` | 200, đúng `siteName`/`artifactId` |
| `GET /api/multimedia?artifactId=1` | 200, trả đủ 5 item; URL lỗi và type lạ được giữ nguyên |
| `GET /api/multimedia?artifactId=999999` | 404 `Artifact not found` |
| `POST /api/interactions` `AUDIO_PLAY` | 201 |
| Gửi lại cùng `eventId` | 200 “already recorded” |
| DB rows theo `eventId` | 1 |

Compose project `ltj59` đã được `down -v`, không ảnh hưởng stack dev.

Lưu ý: đây là bằng chứng Docker lịch sử của Wave 4; máy final M3 audit không có Docker daemon.

## 6. Physical verification checklist

Tất cả mục dưới đây **chưa chạy** trong môi trường hiện tại (không có Android SDK/ADB/Gradle, không có macOS/Xcode, không có thiết bị).

| Check | Trạng thái |
|---|---|
| Android audio playback | NOT YET PHYSICALLY VERIFIED |
| Android video playback + native controls | NOT YET PHYSICALLY VERIFIED |
| Android fullscreen video | NOT YET PHYSICALLY VERIFIED |
| Android audio/video lifecycle khi background/foreground | NOT YET PHYSICALLY VERIFIED |
| Android navigate away while playing | NOT YET PHYSICALLY VERIFIED |
| Android hai media không phát đồng thời | NOT YET PHYSICALLY VERIFIED |
| Android mất mạng giữa chừng + retry | NOT YET PHYSICALLY VERIFIED |
| Android URL lỗi/404/codec không hỗ trợ | NOT YET PHYSICALLY VERIFIED |
| Android `AUDIO_PLAY` ghi đúng một lần | Backend idempotency PASS; device NOT YET |
| iOS audio/video/lifecycle | UNVERIFIED |

Checklist cần chạy trên development build thật, không dùng Expo Go để kết luận.

## 7. Known limitations

1. Chưa xác minh playback, codec, audio focus, native controls trên thiết bị.
2. Chưa xác minh hành vi background/foreground thực tế của `expo-audio`/`expo-video`.
3. Ảnh lỗi chỉ có placeholder, chưa có retry ảnh.
4. Không có cache/offline media.
5. Không có background audio/playback service; app chủ động pause khi vào background.
6. Backend không validate media URL; client hiển thị trạng thái không khả dụng.
7. Dev Docker volume vẫn lệch schema; cần repair/`down -v` riêng nếu muốn dùng lại stack dev.
8. Full-repo `tsc` đã PASS trong final M3 audit.

## 8. Files changed

- `mobile/src/services/media/url.ts` — URL validation dùng chung.
- `mobile/src/services/media/playback.ts` — playback/lifecycle helpers, retry gate.
- `mobile/src/hooks/use-pause-on-background.ts` — AppState pause hook extracted for lifecycle testing.
- `mobile/src/services/__tests__/mediaPlayback.test.ts` — helper/retry-gate tests.
- `mobile/src/hooks/__tests__/use-pause-on-background.test.tsx` — background pause/listener cleanup test.
- `mobile/src/components/multimedia-player.tsx` — loading/error/retry, exclusive playback, background pause, unknown type.
- `mobile/src/app/artifact_detail.tsx` — multimedia loading/error/retry, active media, focus pause, unknown section.
- `mobile/src/services/heritageApi.ts` — re-export URL validation.
- `mobile/README.md` — ghi chú multimedia playback.
- `docs/logs/LTJ-59.md` — log này.

Không thay đổi backend API contract, schema, navigation hay interaction contract.

## 9. Final M3 audit and hardening (2026-11-17)

### 9.1. Retry/lifecycle fixes

- Added `MediaRetryGate` so overlapping audio/video retry taps cannot issue
  duplicate `replace`/`replaceAsync` calls. The gate is released on both success
  and failure.
- Video retry now re-arms its mounted ref on mount and still suppresses state
  updates after unmount.
- Background pause was extracted to `usePauseOnBackground`; the AppState listener
  pauses on `background`/`inactive`, does not auto-resume, and removes itself on
  unmount.
- Existing source switching behavior remains keyed by multimedia id; no media
  library or API contract changed.

### 9.2. Regression tests

- `mediaPlayback.test.ts`: retry gate rejects overlapping starts and allows a new
  retry after completion.
- `use-pause-on-background.test.tsx`: background/inactive pause, active no-op, and
  listener cleanup on unmount.
- Existing helper tests continue to cover loading/error/activation/exclusive
  playback decisions.

### 9.3. Verification run

| Check | Result |
|---|---|
| Mobile Jest | PASS — 12 suites, 108 tests |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| Android audio/video/lifecycle | NOT VERIFIED — no device/native build |
| iOS audio/video/lifecycle | UNVERIFIED — no macOS/Xcode/device |

### 9.4. Status

- S5-M3-02 software implementation and automated regression coverage: PASS from
  source review and tests.
- Real playback, codec, audio focus, background behavior, and retry on a physical
  device remain **NOT VERIFIED**; use the physical demo checklist before claiming
  full acceptance.

## 10. Final media device acceptance attempt (2026-11-18)

### 10.1. Native build available

Android arm64 debug APK đã build thành công từ PR #37 merge commit
`e2a012cbb9274eb86d6d760a6bb60d506cb46bae`:

- APK: `/home/adminn/.cache/m3-tools/artifacts/smart-heritage-m3-arm64-debug.apk`
- SHA-256: `4095a0a07ad439a59d54644da6364e44e14526e6d29628eb3aa36f29f4397328`
- Kích thước: `84,855,698` bytes
- ABI: `arm64-v8a`
- `adb devices -l`: rỗng, không có thiết bị để cài/chạy.

### 10.2. Physical playback tests

**NOT VERIFIED.** Không có thiết bị Android/iOS kết nối, nên chưa có bằng chứng
thực tế cho:

- Audio loading, sound output, pause khi navigate/background.
- Video surface, native controls, fullscreen, audio/video exclusivity.
- No-auto-resume sau foreground.
- Network failure + retry thật.
- Source release khi đổi Artifact, async callback cũ, duplicate player/retry.
- Unmount cleanup và leak listener trên device.

Jest dùng mocked player, không phải bằng chứng playback phần cứng.

### 10.3. Regression

| Check | Kết quả |
|---|---|
| Mobile Jest | PASS — 12 suites, 108 tests |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| Native Android build | PASS — arm64 debug APK |
| Real audio/video playback | **NOT VERIFIED** |
| iOS | **NOT VERIFIED** |

### 10.4. Kết luận S5-M3-02

Software implementation và automated regression: PASS. Native build: PASS.
Real-device playback/lifecycle: **NOT VERIFIED**. S5-M3-02 chưa thể coi là fully
accepted trên phần cứng cho đến khi chạy checklist media trên thiết bị thật.
