# Smart Heritage — Post Sprint 4 Peer Review

## M3 — Historical Contribution Review

**Phạm vi audit:** đối chiếu read-only `origin/LTJ-46` với `origin/main` tại thời điểm audit.

**Mốc tham chiếu:**

- `origin/LTJ-46`: `72ad0ed` — `[LTJ-47]: add visitor interaction service, controller and exception handling`
- `origin/main`: `3a8bebd` — merge PR #22 (`feat/visitor-interaction-analytics`)
- Merge-base: `e2acc37d8b45a61f372178600e7e221ad23080d5`
- Quan hệ branch: **13 commit ahead / 31 commit behind** `origin/main`
- `git cherry -v origin/main origin/LTJ-46`: cả 13 commit đều là `+` — không có commit nào patch-equivalent với main.

**Kết luận nhanh:** không có commit M3 nào của `origin/LTJ-46` được merge nguyên trạng. Main đã có các implementation độc lập, mới hơn cho phần lớn phạm vi. Phần còn thiếu có ý nghĩa nhất là `MultimediaPlayer` (audio/video), nhưng đây là hạng mục main đã **defer có chủ đích**, không phải regression do merge sót. Không nên merge/cherry-pick branch này nguyên khối.

### 1. Contribution matrix

| Task | Commit trên `origin/LTJ-46` | Implementation tương ứng trên `origin/main` | Trạng thái chức năng | Ghi chú |
|---|---|---|---|---|
| LTJ-33 | `d4bcb12`, `33a43f5`, `6014ef1`, `598d5c3`, `92ffe9f`, `49b039e` | `1bb0f60`, `f7405d0` | **SUPERSEDED / REIMPLEMENTED** | Public GET, envelope unwrap, heritage API và normalization đã có bản main mới hơn. Commit lint `49b039e` chưa được tích hợp. |
| LTJ-34 | `bbf6864` | `084158e` | **SUPERSEDED** | Source branch vẫn là contract cũ; test branch đã được sửa theo contract mới nhưng source chưa cập nhật. |
| LTJ-46 | `1fad5fc`, `72f6204`, `3c0c205`, `ec88262` | `2f04dce`, `584c113`, `a93d489`, `f7405d0` | **PARTIALLY REIMPLEMENTED** | Home/list/detail và API client có bản main tương đương; player audio/video, search và all-artifact fallback không có trên main. |
| LTJ-47 | `f76f4d8`, `72ad0ed` | `7fdbb2e`, `084158e` | **SUPERSEDED** | Contract auth-only/String eventId được thay bằng anonymous visitorId/UUID; chưa thấy behavior quan trọng bị mất. |

Không có commit nào thuộc nhóm **MERGED** theo ancestry. Các nhãn trên là trạng thái chức năng, không phải quan hệ commit.

### 2. Merge-base và phạm vi commit

- Merge-base `e2acc37d8b45a61f372178600e7e221ad23080d5` nằm trên lịch sử chung của hai branch.
- 13 commit chỉ có trên `origin/LTJ-46`; main không chứa bất kỳ commit nào trong số này.
- Branch đang lệch **31 commit behind**, gồm các thay đổi M1/M2, hardening và Wave 3 đã vào main sau khi branch tách ra.
- Vì vậy, mọi so sánh phải dựa trên hành vi hiện tại của main, không dựa trên giả định rằng branch là bản gần nhất.

### 3. Commit/diff mapping

| Commit | Nội dung chính | File/thay đổi tiêu biểu |
|---|---|---|
| `d4bcb12` | Public GET cho heritage sites/artifacts/multimedia | `backend/.../config/SecurityConfig.java` |
| `33a43f5` | Unwrap `ApiResponse<T>` ở mobile | `mobile/src/services/api.ts` |
| `6014ef1` | Heritage API thật thay mock | `mobile/src/services/heritageApi.ts`, test |
| `598d5c3` | Coerce `imageUrl` null → undefined | Home/list/detail |
| `92ffe9f` | Docs và cấu hình Jest/ESLint/Babel | `README_M3.md`, `mobile/{babel,jest,eslint}.config.js` |
| `bbf6864` | Interaction API theo contract cũ | `mobile/src/services/interactionApi.ts`, test |
| `49b039e` | Fix lint M3 | `index.tsx`, `use-color-scheme.web.ts`, heritage API test |
| `1fad5fc` | API client + media/artifact/id utils | `heritageApi.ts`, `utils/{artifact,id,media}.ts` |
| `72f6204` | Home/list/detail + multimedia player | Các screen và `components/multimedia-player.tsx` |
| `3c0c205` | Test cho screen/player/utils; sửa test interaction API | `app/__tests__`, `components/__tests__`, `utils/__tests__` |
| `ec88262` | Sửa bundling/test config, package, README | `mobile/package*.json`, `babel.config.js`, `jest.config.js`, `README.md` |
| `f76f4d8` | Entity/repository/DTO interaction | `VisitorInteraction`, `InteractionRequest`, `InteractionResponse` |
| `72ad0ed` | Service/controller/exception interaction | `InteractionService`, `InteractionController`, `InvalidInteractionException` |

Commit `49b039e` không có tiền tố ticket nhưng chỉ sửa các file thuộc phạm vi LTJ-33, nên được xếp vào LTJ-33.

### 4. Task ownership

- Toàn bộ 13 commit trên `origin/LTJ-46` do `td041 <trinhtrantrungduc@gmail.com>` tạo, ngày 24/10 và 05/11.
- Các implementation trên main được tạo bởi các commit độc lập:
  - `1bb0f60` — M1/LTJ-39: public GET, envelope, cấu hình tích hợp.
  - `2f04dce`, `584c113`, `a93d489` — mobile tích hợp backend thật (PR #16).
  - `7fdbb2e` — backend visitor interactions và analytics.
  - `f7405d0` — normalize multimedia type và thumbnail.
  - `084158e` — Wave 3 anonymous interaction/analytics (PR #22).
- Vì vậy không có chuyện "main lấy code của branch"; main có bản viết lại độc lập, thường mới hơn và đã sửa các lỗi Wave 1.

### 5. LTJ-46 code findings

**Các điểm branch làm tốt:**

- Có API client thật thay mock.
- Home/list/detail có loading, error, retry, empty state rõ ràng.
- Artifact list có search phía client và fallback tải toàn bộ artifact khi không có `siteId`.
- Artifact detail hiển thị image/audio/video và có fallback khi URL không hợp lệ.
- Có test cho screen, player và utility.

**Các điểm không nên port nguyên trạng:**

- `mobile/src/utils/artifact.ts:filterArtifacts` gọi `artifact.description.toLowerCase()` mà không kiểm tra null. Backend `ArtifactResponse.description` có thể null; search sẽ ném lỗi runtime nếu gặp artifact không có mô tả.
- `mobile/src/services/heritageApi.ts` của branch luôn gán `imageUrl: null`; branch không giải quyết thumbnail thực tế. Main hiện có `getArtifactsWithThumbnailsBySite` và `selectArtifactThumbnail` (`mobile/src/services/heritageApi.ts:245-266`).
- Branch dùng type media chữ thường (`image/audio/video`) và `Image` trực tiếp. Main đã chuẩn hóa uppercase (`IMAGE/AUDIO/VIDEO`), dùng `RemoteImage` và `isUsableMediaUrl` (`mobile/src/app/artifact_detail.tsx:115-118`). Nếu port player phải adapt theo contract main.
- Branch detail chờ `sendInteraction` xong rồi mới tải multimedia (`mobile/src/app/artifact_detail.tsx:57-70`). Network chậm có thể làm chậm nội dung. Main gửi VIEW trong effect riêng sau khi artifact tải xong (`mobile/src/app/artifact_detail.tsx:69-86`), không chặn multimedia.
- Branch detail có favorite toggle chỉ ở local state, không có backend tương ứng; main đã bỏ. Không nên port như tính năng thật.
- Branch home tải tất cả artifact và có loading/error/retry (`mobile/src/app/home.tsx:32-47,132-148`); main chỉ lấy site đầu tiên và bỏ qua state loading/error (`mobile/src/app/home.tsx:32-33`). Đây là khác biệt hành vi, không hẳn là bug của main, nhưng nếu muốn giữ UX cũ cần ticket riêng.
- Branch artifact list vẫn hỗ trợ search và all-artifact fallback (`mobile/src/app/artifact_list.tsx:21-39,62`); main chọn site đầu tiên khi thiếu `siteId` và không có search (`mobile/src/app/artifact_list.tsx:23-39`).
- Branch dùng Jest 29/jest-expo/RTL 13; main dùng Jest 30/RTL 14. Test branch có thể tham khảo nhưng phải viết lại cấu hình nếu port.

### 6. MultimediaPlayer review

**Kết luận:** `NOT MERGED` trên main, nhưng là hạng mục **DEFERRED có chủ đích** trong hardening report, không phải feature bị bỏ sót do merge.

Bằng chứng defer:

- `docs/reports/post-sprint4-hardening-report.md:18-19`: AUDIT-007 thumbnail đã fix một phần; audio/video player **deferred**.
- `docs/reports/post-sprint4-hardening-report.md:80`: defer vì cần đánh giá `expo-audio`/`expo-video`, dev build, background playback và quyền.
- `docs/reports/post-sprint4-hardening-report.md:163`: audio/video cần wave riêng (AUDIT-007 phần 2).

**Đánh giá implementation branch:**

- Dependency: `expo-audio ~57.0.5`, `expo-video ~57.0.5`, tương thích Expo SDK 57; `package-lock.json` của branch có đầy đủ entry.
- Hỗ trợ `IMAGE/AUDIO/VIDEO`; audio có play/pause, thời lượng, loading/error; video dùng native controls và fullscreen.
- `useAudioPlayer`/`useVideoPlayer` quản lý release khi unmount; có fallback khi URL không hợp lệ.
- `app.json` không khai báo plugin audio/video. Basic playback có thể chạy nhờ autolinking; background playback, PiP, audio focus và cấu hình quyền chưa có.
- Không có xử lý `AppState`/background; nhiều player có thể phát đồng thời; chưa có accessibility label; audio chỉ play/pause, không có seek/stop riêng.
- Test player mock native module, chưa chứng minh phát được media thật trên emulator/device.
- Chưa runtime-test trong audit này vì không checkout branch.

**Khuyến nghị:** nếu audio/video thuộc phạm vi sản phẩm, tạo ticket mới để port ý tưởng player sang main, adapt uppercase type + `RemoteImage` + `isUsableMediaUrl`, bổ sung cấu hình background/audio focus/accessibility và test runtime. Không port nguyên file branch.

### 7. LTJ-47 comparison

| Khía cạnh | Historical branch | Current main |
|---|---|---|
| Danh tính | `user_id NOT NULL`, yêu cầu Bearer auth | `visitor_id UUID NOT NULL`, `user_id` nullable, anonymous được phép |
| `eventId` | `String(36)`, unique | `UUID`, unique |
| Type | Set thủ công `VIEW/AUDIO_PLAY/SCAN` | `@Pattern("(?i:VIEW\|AUDIO_PLAY\|SCAN)")` |
| `recorded_at` | Có cột và set khi ghi | Không còn; dùng `interacted_at` |
| Idempotency | Check `findByEventId`, `saveAndFlush`, bắt `DataIntegrityViolationException` | Check `findByEventId`, so khớp identity, `save`; global handler bắt `DataIntegrityViolationException` |
| Endpoint | `POST /api/interactions`, authenticated | `POST /api/interactions`, public cho anonymous |
| Response | 201/200; race duplicate 409 | 201/200; race duplicate 409 |
| Invalid type | `InvalidInteractionException` không có handler riêng, rơi vào generic handler → 500 | `@Pattern` ở DTO → 400 |
| Analytics | Không có | Có summary analytics (Wave 3) |

**Kết luận:** LTJ-47 branch bị **SUPERSEDED** bởi Wave 3. Các phần bị mất như `recorded_at`, `findByEventIdWithRelations`, `existsByEventId` là obsolete/unused. Branch còn một lỗi xử lý lỗi: `InvalidInteractionException` không được `GlobalExceptionHandler` bắt riêng nên invalid type trả 500 thay vì 400. Không thấy regression chức năng cần port. Tiếp tục giữ contract anonymous visitorId/UUID hiện tại.

### 8. LTJ-33 comparison

- **Public GET:** branch dùng pattern thiếu slash (`"/api/heritage-sites**"`, `"/api/artifacts**"`, `"/api/multimedia**"`), main dùng `"/api/heritage-sites/**"` và tương tự (`backend/.../config/SecurityConfig.java:50-52`). Main đúng và rõ hơn.
- **Envelope:** branch unwrap `ApiResponse<T>` trong `mobile/src/services/api.ts`; main cũng unwrap trong `api.ts`. Không cần khôi phục raw response; main là bản nên giữ.
- **Heritage API:** branch có `getArtifacts()` tải toàn bộ; main có `getArtifactsBySite`, `getArtifactThumbnail`, `getArtifactsWithThumbnailsBySite`. Main mới hơn nhưng thiếu all-artifact fallback và search.
- **`imageUrl` null coercion:** branch sửa để tránh lỗi type; main dùng `imageUrl: null` + `RemoteImage`. Không cần port.
- **Config/docs:** branch thêm `README_M3.md`, `babel.config.js`, `jest.config.js`, `eslint.config.js`. Main có Babel/Jest nhưng không track `mobile/eslint.config.js`; file này hiện là untracked và giống bản branch. Commit `49b039e` sửa lint `use-color-scheme.web.ts` vẫn chưa có trên main; main vẫn còn lỗi lint đó.
- **Kết luận:** LTJ-33 **SUPERSEDED/REIMPLEMENTED**. Chỉ còn hạng mục housekeeping lint/config là chưa tích hợp.

### 9. LTJ-34 comparison

- Source branch `mobile/src/services/interactionApi.ts` vẫn là bản cũ:
  - Type `BEACON_TRIGGER/MANUAL_VIEW/FAVORITE_ADD/FAVORITE_REMOVE`.
  - Tự sinh `eventId` bằng `crypto.randomUUID()` và bỏ qua `eventId` của caller.
  - Tự sinh `visitorId` dạng `visitor-<uuid>` — không phải UUID hợp lệ.
  - Gửi `userId`, `beaconId`, `durationSeconds`; không gửi Bearer token.
- Test tại `3c0c205` lại được viết theo contract mới:
  - Caller cung cấp `eventId`.
  - Mock `authStorage.getToken`.
  - Không gửi `visitorId/userId/beaconId/durationSeconds`.
  - Type `VIEW/AUDIO_PLAY/SCAN`.
- Vì vậy source và test branch **không khớp contract**; test có khả năng fail cao. Chưa chạy runtime vì không checkout branch.
- Current main `mobile/src/services/interactionApi.ts` đã thay thế hoàn toàn: caller-supplied UUID `eventId`, visitorId UUID từ storage, optional token, chỉ `VIEW/AUDIO_PLAY/SCAN`, không gửi `userId/beaconId/durationSeconds`.

**Kết luận:** LTJ-34 **SUPERSEDED**; không port. Nếu cần test cũ, chỉ dùng làm tham khảo hành vi, không dùng source branch.

### 10. Current main integration status

| Hạng mục | Trạng thái trên main | Đánh giá |
|---|---|---|
| 13 commit LTJ-46 | Không có commit nào là ancestor | **NOT MERGED** |
| Public GET site/artifact/multimedia | Có, từ `1bb0f60` | **MERGED độc lập** |
| Envelope unwrap mobile | Có trong `api.ts` | **MERGED độc lập** |
| Heritage API + thumbnails | Có, mới hơn branch | **SUPERSEDED** |
| Home/list/detail | Có bản main | **PARTIALLY REIMPLEMENTED** |
| MultimediaPlayer audio/video | Không có; hardening report defer | **NOT MERGED / DEFERRED** |
| Interaction backend | Wave 3 anonymous visitorId | **SUPERSEDED** |
| Interaction mobile API | Wave 3 contract | **SUPERSEDED** |
| Mobile eslint config + lint fix | Không track; `49b039e` chưa vào main | **NOT MERGED** |

Main hiện đại hơn branch ở các điểm quan trọng: public GET đúng pattern, multimedia type uppercase, thumbnail thật, `RemoteImage`, idempotency anonymous, analytics, auth profile. Các điểm main kém hơn branch chủ yếu là UX/search/player, không phải contract lỗi thời.

### 11. Missing / obsolete / superseded features

**Còn thiếu trên main:**

- `MultimediaPlayer` cho audio/video và dependency `expo-audio`/`expo-video` (defer có chủ đích).
- Search artifact phía client và fallback tải toàn bộ artifact khi không có `siteId`.
- Loading/error/retry rõ ràng ở Home; main hiện lưu state nhưng không render.
- Commit `49b039e` (lint `use-color-scheme.web.ts`) và tracked `mobile/eslint.config.js`.
- Test/README M3 của branch (không bắt buộc nếu main đã có test tương đương).

**Obsolete, không nên port:**

- `getArtifacts()` all-artifact API và `filterArtifacts` không null-safe.
- Type media chữ thường và dùng `Image` trực tiếp thay vì `RemoteImage`.
- LTJ-34: eventId tự sinh, visitorId `visitor-*`, type beacon/favorite, gửi `userId/beaconId/durationSeconds`.
- LTJ-47: auth-only, `String eventId`, `recorded_at`, `findByEventIdWithRelations`, `existsByEventId`; `InvalidInteractionException` không có handler riêng nên invalid type trả 500.
- Favorite toggle local-only ở artifact detail.

**Superseded, giữ bản main:**

- LTJ-47 bởi Wave 3.
- LTJ-34 bởi Wave 3.
- LTJ-33 bởi `1bb0f60` + `f7405d0`.
- Phần lớn LTJ-46 bởi PR #16 + hardening Wave 1.

### 12. Recommended remediation

1. **Không merge/cherry-pick `origin/LTJ-46` nguyên khối.** Branch lệch 31 commit và chứa contract cũ; merge sẽ tạo xung đột và có nguy cơ revert các fix Wave 1/Wave 3.
2. **Đóng LTJ-46 ở trạng thái partially superseded**, ghi rõ phần player/search/home state chưa có trên main.
3. **Nếu audio/video thuộc scope:** tạo ticket mới để port player theo contract main, kèm cấu hình background/audio focus/PiP/accessibility, test Jest 30/RTL 14 và test runtime trên emulator/device. Không dùng test mock làm bằng chứng phát media.
4. **Nếu cần search/all-artifact UX:** tạo ticket nhỏ, port có điều kiện, sửa null-safe cho `description`; so sánh với UX site-first hiện tại trước khi đổi.
5. **Housekeeping lint:** hoặc track `mobile/eslint.config.js` + port `49b039e`, hoặc xóa file untracked và xử lý lint debt trong ticket riêng. Không đưa vào PR tính năng.
6. **Không port LTJ-34/LTJ-47.** Giữ contract anonymous `visitorId` + UUID `eventId` của Wave 3; chỉ bổ sung test nếu phát hiện thiếu coverage.

### Follow-up integration

- Đã tạo nhánh `feat/ltj-46-selective-integration` từ `origin/main` để tích hợp chọn lọc, không merge nguyên trạng `LTJ-46`.
- Đã port: `MultimediaPlayer` audio/video, ghi `AUDIO_PLAY`, search artifact, all-artifact fallback, Home loading/error/retry, lint config và fix `49b039e`.
- Không port: contract cũ LTJ-34/LTJ-47, mapping heritage API cũ, favorite toggle local-only.
- Verification mobile: **62 test pass**, `expo lint` pass, `tsc --noEmit` pass. Chưa runtime-test playback trên emulator/device.

### Audit limitations

- Audit read-only: không checkout, không merge, không chạy test trên `origin/LTJ-46`; kết luận mismatch source/test dựa trên đọc tĩnh.
- Chưa runtime-test `expo-audio`/`expo-video` trên emulator/device.
- Kết quả test Wave 3 (backend 90, PostgreSQL 3/3, frontend 38, mobile 54) lấy từ verification trước đó, không chạy lại trong audit này.
- Số ahead/behind có thể thay đổi khi main tiếp tục nhận commit; số tại thời điểm audit là 13 ahead / 31 behind.
