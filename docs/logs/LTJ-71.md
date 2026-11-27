# Log: LTJ-71 — Real-Device Multimedia Playback Acceptance

## Thông tin chung

- **Task:** LTJ-71 / S6-M3-02 — Real-Device Multimedia Playback Acceptance
- **Trạng thái task:** **Hoàn thành** — td041 xác nhận ngày 28/11/2026; [CI đạt](https://github.com/nahnht27/smart-heritage/actions/runs/46071640441) trên commit `6ebc866`. Screenshot/video chưa đính kèm trong repo.
- **Nhánh:** `LTJ-70`
- **Phạm vi:** audio/video playback, loading/error/retry, lifecycle khi blur/background, chuyển artifact, unmount và single-playback trên Android device.
- **Kết luận nhanh:** Ngày 28/11/2026 mọi tiêu chí chức năng **PASS trên điện thoại thật** theo người test. Bằng chứng nộp kèm còn **PENDING**: screenshot/video.

> Jest mock và web/emulator không thay thế real-device playback. Không đánh dấu
> PASS nếu chưa nghe/nhìn media thật trên thiết bị.

## 1. Evidence tự động đã có

Từ LTJ-59:

| Evidence | Kết quả |
|---|---|
| Jest | **PASS** — 12 suites, 108 tests |
| `npm run lint` | **PASS** |
| Source TypeScript | **PASS** |
| Backend media API smoke | **PASS** |
| Real-device audio/video | **NOT VERIFIED** |

Các test bao phủ URL validation, media type normalization, playback decision,
single active media, retry/replacement, pause khi blur/background và fallback
media lỗi/UNKNOWN. Không xác nhận codec, audio route, video surface hoặc lifecycle
native thật.

### 1.1. Chuẩn bị M3 — 2026-11-20

| Hạng mục | Kết quả |
|---|---|
| Mobile Jest | **PASS** — 12 suites, 108 tests |
| `npm run lint` | **PASS** |
| Source TypeScript | **PASS** |
| Backend media API | **PASS** — artifact `1` trả image/audio/video |
| Native APK arm64 | **PASS** — build local trong Docker, xem LTJ-72 |
| Audio/video thật trên device | **NOT VERIFIED** |

Media demo của artifact `1`:

- Image: `https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80`
- Audio: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`
- Video: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`

Các URL media là public URL bên ngoài, nên điện thoại cần Internet cho media dù
backend chạy trong LAN.

### 1.2. Chạy trên điện thoại — 2026-11-28

- Máy: Xiaomi Note 11T Pro, Android 13. APK: `1.1.0 (versionCode 2)`, `SmartHeritage-1.1.0-demo-arm64.apk`, SHA-256 `19e414aeb187e059bbdb967f4f61b02172fb3a0e7cb150761fa54cce5b1c48f0`.
- Người test xác nhận: giọng đọc và video phát được; các mục kiểm tra audio, video,
  ra nền rồi quay lại, và chuyển từ audio sang video đều đạt.
- PostgreSQL: `VIEW` (ID 33) và đúng một `AUDIO_PLAY` (ID 34) cho hiện vật 1 lúc
  03:55:35–03:55:36 giờ Việt Nam.
- Media demo hiện lưu trong bảng `multimedia_file` và được tải về máy, thay cho
  các URL ngoài ở mục 1.1. Xem [offline-demo.md](../features/offline-demo.md).

## 2. Acceptance checklist

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Audio phát được trên thiết bị thật | **PASS** | Người test nghe được; `AUDIO_PLAY` ID 34 |
| Video render và phát được trên thiết bị thật | **PASS** | Người test xác nhận |
| Blur/background pause đúng policy | **PASS** | Người test xác nhận khi ra màn hình chính và khi rời màn hình trong app |
| Foreground không auto-resume ngoài ý muốn | **PASS** | Người test xác nhận |
| Retry không tạo player/request trùng | **PASS** | Người test xác nhận thử lại sau khi mất mạng; chưa có log mạng đính kèm |
| Đổi Artifact không bị callback cũ ghi đè | **PASS** | Người test xác nhận chuyển nhanh giữa các hiện vật |
| Unmount giải phóng player/listener | **PASS** | Người test xác nhận tiếng tắt khi rời màn hình; chưa kiểm tra leak bằng công cụ native |
| Có evidence + model/Android version | **PENDING** | Có model, Android 13 và sự kiện DB; thiếu screenshot/video |

## 3. Kịch bản chạy trên thiết bị

1. Cài APK đã build với `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.48:8081/api`;
   kiểm tra điện thoại vào được `http://192.168.1.48:8081/api/health` trước khi test.
2. Mở Artifact có audio; phát và nghe âm thanh thật.
3. Mở Artifact có video; xác nhận video surface render và phát.
4. Trong khi đang phát, navigate/blur sang màn hình khác; media phải pause.
5. Đưa app xuống background; media phải pause.
6. Quay lại foreground; media không tự resume.
7. Chuyển nhanh giữa nhiều Artifact khi media đang load; không crash, không phát
   đồng thời, không có state cũ ghi đè.
8. Thử URL lỗi/404 hoặc ngắt mạng; xác nhận lỗi thân thiện và nút “Thử lại”.
9. Khôi phục mạng và retry; media phát được, không tạo player/request trùng.
10. Rời Artifact Detail/unmount; xác nhận player dừng và không còn audio.
11. Kiểm tra `AUDIO_PLAY` chỉ ghi một lần cho một lượt phát.
12. Lưu screenshot/video/log đã redacted và ghi model/Android version.

Checklist multimedia đầy đủ nằm trong
[`docs/testing/sprint-5-beacon-physical-demo-checklist.md`](../testing/sprint-5-beacon-physical-demo-checklist.md)
mục 4.

## 4. Bằng chứng cần điền

| Bằng chứng | Giá trị |
|---|---|
| Device model | Xiaomi Note 11T Pro |
| Android version / API level | Android 13 (API 33) |
| APK version / commit | `1.1.0 (versionCode 2)`, `SmartHeritage-1.1.0-demo-arm64.apk`, SHA-256 `19e414aeb187e059bbdb967f4f61b02172fb3a0e7cb150761fa54cce5b1c48f0` |
| Artifact audio ID/URL | Hiện vật `1`, file `a01_audio.mp3` lưu trong DB |
| Artifact video ID/URL | `________________` |
| Audio result | **PASS** — nghe được, ghi một `AUDIO_PLAY`; không phát chồng khi chuyển sang video |
| Video result | **PASS** — người test xác nhận phát được |
| Blur/background result | **PASS** khi ra nền: media dừng, quay lại không tự phát |
| Retry/network result | **PASS** — người test xác nhận |
| Screenshot/video/log path | `________________` |
| Tester + thời gian | td041, 28/11/2026 (bắt đầu khoảng 03:49 giờ Việt Nam) |

## 5. Kết quả

**PASS (chức năng)** — người test xác nhận trên Xiaomi Note 11T Pro: phát audio/video,
dừng khi ra nền và khi rời màn hình, đổi hiện vật, thử lại khi lỗi.
Còn thiếu để đủ hồ sơ nghiệm thu: screenshot/video.

## 6. Giới hạn / lưu ý

- Expo Go không đủ để kết luận native media lifecycle; cần native build/APK.
- Codec/format phụ thuộc thiết bị; ghi rõ model/OS khi test.
- Không tự thêm auto-resume khi foreground; policy hiện tại là pause và không
  resume ngoài ý muốn.
- Nếu phát hiện lỗi backend/API media, báo M2 kèm request/response; không sửa
  backend production trong PR mobile.
