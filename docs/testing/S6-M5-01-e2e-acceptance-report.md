# S6-M5-01 — Full-Stack E2E Acceptance Report

## 1. General information

- Project: Smart Heritage
- Sprint: Sprint 6
- Task ID: S6-M5-01
- Jira ID: LTJ-76
- Responsible member: M5 — QA
- Branch: LTJ-76
- Execution period: 2026-11-24 to 2026-11-26
- QA recommendation: PASS WITH LIMITATIONS

## 2. Testing objectives

- Validate the full-stack Admin Web, Backend API, Mobile and PostgreSQL integration.
- Verify heritage site, artifact, multimedia and beacon management.
- Verify beacon resolution and visitor interaction persistence.
- Verify analytics aggregation and CSV export.
- Verify deterministic demo data reset and reseed.
- Document actual results, limitations and remaining defects.

## 3. Test environment

- Operating system: Windows 11
- Backend: Java / Spring Boot
- Database: PostgreSQL 16
- Deployment: Docker Compose
- Isolated Compose project: smart-heritage-s6-m5-01
- Backend URL: http://localhost:8082
- Frontend URL: http://localhost:5173
- PostgreSQL host port: 5434
- Mobile: React Native / Expo
- Android Emulator: Medium_Phone_API_37.0
- Android device identifier: emulator-5554
- Mobile API URL: http://10.0.2.2:8082/api
- Testing approach: Manual browser E2E, API testing, SQL verification and Android Emulator.

Physical Android devices and physical BLE beacons were not available.

## 4. Acceptance test matrix

| ID | Test scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| E2E-01 | Admin authentication | ADMIN can access management pages | Admin login successful | PASS |
| E2E-02 | Create heritage site | Site is created successfully | Site ID 9 created, HTTP 201 | PASS |
| E2E-03 | Create artifact | Artifact linked to site | Artifact ID 41 linked to site 9 | PASS |
| E2E-04 | Create multimedia | Multimedia linked to artifact | Multimedia ID 41 linked to artifact 41 | PASS |
| E2E-05 | Create beacon | Beacon linked to artifact | Beacon ID 9 linked to artifact 41 | PASS |
| E2E-06 | Beacon resolve API | Correct artifact mapping | HTTP 200, artifact 41 | PASS |
| E2E-07 | Visitor interaction API | Interaction persisted | HTTP 201, interaction ID 121 | PASS |
| E2E-08 | Demo data reset/reseed | Deterministic dataset verified | 4 sites, 20 artifacts, 20 multimedia, 4 beacons, 60 interactions | PASS |
| E2E-09 | Android native build | Application builds and launches | BUILD SUCCESSFUL, emulator launched | PASS |
| E2E-10 | Mobile artifact list | Backend artifacts displayed | 21 artifacts available | PASS |
| E2E-11 | Mobile artifact detail | Correct artifact information | Artifact 41 displayed | PASS |
| E2E-12 | Mobile IMAGE rendering | Image displayed | Thumbnail and detail image displayed after URL correction | PASS |
| E2E-13 | Mobile VIEW interaction | VIEW persisted in database | Interactions 122, 123 and 124 | PASS |
| E2E-14 | Analytics aggregation | New interactions reflected | Total increased from 61 to 64 | PASS |
| E2E-15 | CSV export | CSV matches dashboard and database | 64 interactions, 11 visitors, average 5.8 | PASS |
| E2E-16 | Vietnamese text | Correct Unicode display | Correct Vietnamese in mobile and CSV | PASS |
| E2E-17 | Physical BLE discovery | Real beacon detected | Physical hardware unavailable | NOT VERIFIED |
| E2E-18 | Physical device multimedia | Media displayed on real device | Emulator only | NOT VERIFIED |
| E2E-19 | Audio/video playback | Media playback successful | Runtime playback not tested | NOT VERIFIED |
| E2E-20 | Favorite/history persistence | Data persisted through backend | Mock data identified in source | NOT VERIFIED |
| E2E-21 | Feedback persistence | Feedback persisted through backend | UI-only behavior identified | NOT VERIFIED |

## 5. Deterministic demo data

The isolated environment was reset and reseeded using the demo seed script.

Verified baseline:

| Entity | Count |
|---|---:|
| HeritageSite | 4 |
| Artifact | 20 |
| Multimedia | 20 |
| Beacon | 4 |
| VisitorInteraction | 60 |
| Unique visitors | 8 |

Analytics baseline:

| Period | Interactions |
|---|---:|
| 7 days | 8 |
| 30 days | 20 |
| 90 days | 36 |
| All time | 60 |

Seed verification confirmed API records, media files, PostgreSQL data,
beacon mappings and anonymous visitor data.

Reset/reseed was verified before the final E2E execution.
Post-execution cleanup was not performed or verified.

## 6. Admin Web and API evidence

### 6.1 Heritage site

- Site ID: 9
- Name: Bảo tàng Mỹ thuật
- HTTP status: 201 Created
- Address: 97 Phó Đức Chính, Quận 1, Thành phố Hồ Chí Minh
- Created timestamp: 2026-11-25T17:19:19.055154610Z

The test site contained an incorrect longitude equal to its latitude.
This is a test-data issue, not a confirmed application defect.

### 6.2 Artifact

- Artifact ID: 41
- Site ID: 9
- Name: Tranh sơn mài Việt Nam
- Created timestamp: 2026-11-25T17:22:35.131282799Z

### 6.3 Multimedia

- Multimedia ID: 41
- Artifact ID: 41
- Type: IMAGE
- Title: Hình ảnh tranh sơn mài Việt Nam
- Created timestamp: 2026-11-25T17:25:17.309147180Z

The initial URL returned HTML instead of image content.
The URL was corrected through Admin Web.
The image subsequently displayed on the Android Emulator.

### 6.4 Beacon

- Beacon ID: 9
- Artifact ID: 41
- UUID: 33333333-4444-4555-8666-777777777777
- Major: 100
- Minor: 3
- Enabled: true
- Created timestamp: 2026-11-25T17:27:04.183142967Z

### 6.5 Beacon resolve API

GET /api/beacons/resolve?uuid=33333333-4444-4555-8666-777777777777&major=100&minor=3

Actual result:

- HTTP 200
- Beacon ID: 9
- Artifact ID: 41
- Correct artifact mapping returned.

This verifies API resolution only, not physical BLE discovery.

### 6.6 Visitor interaction API

POST /api/interactions

Actual result:

- HTTP 201 Created
- Interaction ID: 121
- Event ID: 85636bf7-b761-4d93-96c2-0713d70aef2e
- Artifact ID: 41
- Beacon ID: 9
- Interaction type: BEACON_TRIGGER
- Language: vi
- Duration: 60 seconds
- Interacted at: 2026-11-25T17:32:22.381194800Z

The interaction was created through an API simulation.
It must not be interpreted as a physical BLE event.

## 7. Android Emulator acceptance

### 7.1 Native build

Command:

    npx expo run:android

Observed build result:

    BUILD SUCCESSFUL in 11m 7s
    384 actionable tasks: 74 executed, 5 from cache, 305 up-to-date

APK size: 84760105 bytes.

The application was installed and launched on emulator-5554.

### 7.2 Mobile runtime

Verified:

- Heritage site information displayed.
- Artifact list loaded from backend.
- Artifact search worked.
- Artifact 41 detail displayed.
- Vietnamese text displayed correctly.
- Thumbnail and detail image displayed after multimedia URL correction.
- VIEW interactions were persisted in PostgreSQL.

Limitations:

- Expo Web failed because of native beacon module compatibility.
- Physical BLE discovery was not verified.
- Audio/video playback was not verified.
- Favorite/history and feedback persistence were not verified.
- Map remained a placeholder UI.
- Some seed thumbnails remained gray; the cause was not established.

## 8. PostgreSQL persistence and analytics

### 8.1 Interaction records

The following records were observed for artifact 41:

| Interaction ID | Artifact ID | Beacon ID | Type | Duration | Interacted at UTC |
|---|---:|---:|---|---:|---|
| 124 | 41 | NULL | VIEW | NULL | 2026-11-26 03:28:53.488+00 |
| 123 | 41 | NULL | VIEW | NULL | 2026-11-26 03:19:14.855+00 |
| 122 | 41 | NULL | VIEW | NULL | 2026-11-26 03:19:14.838+00 |
| 121 | 41 | 9 | BEACON_TRIGGER | 60 | 2026-11-25 17:32:22.381195+00 |

Interactions 122 and 123 occurred approximately 17 ms apart.
Possible duplicate VIEW recording requires investigation.
A duplicate-recording defect has not been conclusively established.

### 8.2 SQL verification

    SELECT interaction_type, COUNT(*) AS total
    FROM visitor_interaction
    GROUP BY interaction_type
    ORDER BY interaction_type;

    SELECT COUNT(*) AS total_interactions,
           COUNT(DISTINCT visitor_id) AS unique_visitors
    FROM visitor_interaction;

Recorded results:

| Interaction type | Total |
|---|---:|
| AUDIO_PLAY | 16 |
| BEACON_TRIGGER | 5 |
| SCAN | 20 |
| VIEW | 23 |

| Metric | Value |
|---|---:|
| Total interactions | 64 |
| Unique visitors | 11 |

### 8.3 Analytics comparison

| Metric | Seed baseline | After API interaction | After mobile testing |
|---|---:|---:|---:|
| Total interactions | 60 | 61 | 64 |
| Unique visitors | 8 | 9 | 11 |

Final Admin Dashboard:

- Total interactions: 64
- Unique visitors: 11
- Average engagement: 5.8
- VIEW: 23 actions, 36%
- SCAN: 20 actions, 31%
- Top artifact: ID 41, 4 interactions

The AUDIO_PLAY and BEACON_TRIGGER counts include seeded and simulated data.
They do not establish physical audio playback or BLE acceptance.

## 9. CSV export — Terminal Evidence

Original filename: analytics-summary_all-time (1).csv
File size: 1357 bytes.
Export timestamp: 2026-11-26 03:34:37 UTC.

The following CSV content was copied from the PowerShell output:

```csv
"BÁO CÁO PHÂN TÍCH TƯƠNG TÁC — SMART HERITAGE"
"Khoảng thời gian báo cáo","Toàn thời gian"
"Thời điểm xuất báo cáo (UTC)","2026-11-26 03:34:37 UTC"

"[1] CHỈ SỐ HIỆU QUẢ CHÍNH (KPIs)"
"Chỉ số","Giá trị","Đơn vị tính"
"Tổng lượt tương tác","64","lượt"
"Khách truy cập duy nhất","11","khách"
"Tương tác trung bình / khách","5.8","lượt / khách"

"[2] CHI TIẾT THEO LOẠI TƯƠNG TÁC"
"Mã tương tác","Tên hiển thị","Số lượng","Tỷ lệ"
"VIEW","Lượt xem hiện vật","23","36%"
"SCAN","Quét QR/Beacon","20","31%"
"AUDIO_PLAY","Nghe thuyết minh audio","16","25%"
"BEACON_TRIGGER","Kích hoạt Beacon","5","8%"

"[3] DANH SÁCH HIỆN VẬT PHỔ BIẾN"
"Thứ hạng","Mã hiện vật","Tên hiện vật","Số lượt tương tác"
"1","41","Tranh sơn mài Việt Nam","4"
"2","21","Rồng đá thềm điện Kính Thiên","3"
"3","22","Đồ gốm khai quật tại Hoàng thành Thăng Long","3"
"4","23","Hình tượng phượng trên lá đề","3"
"5","24","Bát gốm men trắng","3"
"6","25","Cổng Đoan Môn","3"
"7","26","Cửu Đỉnh triều Nguyễn","3"
"8","27","Cửu vị thần công","3"
"9","28","Chuông đồng tại khu vực Ngọ Môn","3"
"10","29","Phù điêu đá trang trí kiến trúc","3"


```

Result: PASS.

CSV totals, interaction categories and unique visitor counts matched PostgreSQL and Admin Dashboard.

## 10. Regression test results

### 10.1 Backend unit tests

Command: mvn test

    Tests run: 159, Failures: 0, Errors: 0, Skipped: 0
    BUILD SUCCESS

Finished: 2026-11-25T22:49:49+07:00

### 10.2 PostgreSQL integration tests

Command: mvn -Ppostgres-integration verify

The initial execution failed due to datasource environment configuration.

After configuring an isolated PostgreSQL instance:

    Tests run: 72, Failures: 0, Errors: 0, Skipped: 0
    BUILD SUCCESS

Finished: 2026-11-25T23:48:43+07:00

### 10.3 Frontend tests

Initial Windows execution:

- Test files: 14 passed, 1 failed.
- Tests: 120 passed, 9 failed.
- Failed suite: DashboardPage.test.tsx.
- Locale difference: 1.420 versus expected 1,420.

After explicit en-US number formatting:

- Dashboard tests: 15/15 PASS.
- Frontend test files: 15/15 PASS.
- Frontend tests: 129/129 PASS.

The formatting change requires M4 review.
Lint and production build were not reverified after this change.

### 10.4 Regression summary

| Suite | Passed | Total |
|---|---:|---:|
| Backend unit tests | 159 | 159 |
| PostgreSQL integration | 72 | 72 |
| Frontend tests | 129 | 129 |
| Total | 360 | 360 |

These are local regression results, not final PR CI results.

## 11. Findings and limitations

Severity and ownership are proposed for team review.

| Finding | Severity | Description | Owner | Status |
|---|---|---|---|---|
| E2E-F01 | Medium | Physical BLE and physical-device media not verified | M3 | NOT VERIFIED |
| E2E-F02 | Medium | Expo Web native beacon compatibility error | M3 | OPEN |
| E2E-F03 | Medium | Earlier local Flyway V1-V3 versus repository V4 discrepancy | M1/M2 | Review pending |
| E2E-F04 | Low | Initial multimedia URL returned HTML | M2/M3 | Test data corrected |
| E2E-F05 | Low | VIEW events 122 and 123 recorded 17 ms apart | M3 | Investigation required |
| E2E-F06 | Low | Dashboard locale-dependent number formatting | M4 | Local change; review pending |
| E2E-F07 | Low | Incorrect longitude in test site 9 | M5 | Test data issue |
| E2E-F08 | Medium | Audio/video playback not verified | M3 | NOT VERIFIED |
| E2E-F09 | Low | Favorite/history mock data and feedback UI-only behavior | M3 | Integration not verified |
| E2E-F10 | Low | Some seeded multimedia thumbnails remained gray | M2/M3 | Investigation required |

Additional notes:

- Earlier PowerShell Vietnamese display issues for artifact 2 were resolved through explicit UTF-8 decoding.
- No API encoding defect was established for artifact 2.
- Earlier seed data containing question marks was not fully investigated.
- Possible duplicate VIEW recording is not a confirmed defect.
- Physical BLE and audio/video playback are not claimed as PASS.
- Post-execution cleanup was not verified.
- No production deployment or capacity claim is made.

## 12. Final acceptance recommendation

Recommendation: PASS WITH LIMITATIONS.

Core Admin Web, Backend API, PostgreSQL, Android Emulator,
Visitor Interaction, Analytics and CSV integration flows were verified.

Physical BLE discovery, physical-device multimedia and audio/video
playback remain NOT VERIFIED.

Final release approval remains pending:

- Review of relevant local changes.
- Required CI checks on the actual PR head.
- Review and acceptance of documented limitations.
- Pull request approval and merge into main.

This report records observed QA evidence and does not constitute
unconditional production release approval.

## 13. Finalization addendum (2026-11-26)

The historical execution evidence in sections 1–12 is preserved unchanged.

- Section 10.3 describes a temporary local `en-US` formatting change used to
  unblock the Windows test run. That change was superseded during final merge
  conflict resolution. The merged application uses runtime-locale
  `formatCount(value)`; tests derive the expected value from the same helper.
- The final frontend suite is 20 files / 165 tests, passing under both
  `en-US` and `vi-VN` on Linux. The 129-test count in section 10 is historical
  and is not the final suite count.
- The final 165-test suite was not rerun on native Windows. The Windows 11 E2E
  execution above remains the evidence for the flows it records.
- Final CI and review status are recorded on PR #46.
- The limitations in section 11 remain in force: physical BLE,
  physical-device and audio/video media, favorite/history and feedback
  persistence, protected-route denial, edit/delete CRUD, offline resilience
  and post-run cleanup are not claimed as PASS.

## 14. Duplicate VIEW investigation addendum (2026-11-27)

Sections 1–13 are preserved unchanged. This addendum covers finding E2E-F05.

### 14.1 Evidence access

Interactions 122–124 were **not re-inspected**. The investigation environment
had no running Docker daemon (starting it needs a sudo password), no `adb`, and
no Android SDK, database dump or run log was found in the searched locations.
`event_id`, `visitor_id`, `started_at` and request logs for these rows were not
recovered.

### 14.2 Inferences from recorded evidence and source

These are deductions, not row inspection.

- **Event IDs:** `uk_visitor_interaction_event_id` is unique (V1 baseline), so,
  if that environment enforced it, rows 122 and 123 had different `event_id`
  values. A retry reusing one `eventId` cannot produce two rows. The mobile app
  also has no automatic retry of interaction events.
- **Visitor IDs:** section 8.3 records 9 unique visitors and 61 interactions
  before mobile testing, and 11 and 64 afterwards. Rows 122–124 therefore
  appear to carry two distinct new `visitor_id` values. Either 122 and 123
  differ, or 124 differs from them. The evidence cannot say which.
- **Component lifecycle:** one mounted detail screen records once per artifact
  (`recordedArtifactId` ref), including on rerender, focus change and
  StrictMode effect replay. No StrictMode usage was found in `src/`. Two events
  for one artifact therefore point to two screen instances (or two app
  runtimes), assuming the tested build matched this source.
- **Navigation:** in the installed `expo-router` 57.0.25 source, `push` without
  `singular`/`getId` creates a new route each time. Two quick taps could create
  two detail screens. Whether the device accepts the second tap, and whether
  this happened in the E2E run, was **not verified**.

### 14.3 Conclusion on E2E-F05

**INCONCLUSIVE.** Neither the number of taps nor the number of screen instances
and requests in the original run is known. No VIEW recording or navigation code
was changed, and no time-based suppression was added.

To close it, run on an emulator with an isolated database: clear app data, tap
one artifact once, and record screen mounts, `POST /api/interactions` requests
and the new rows' `event_id`/`visitor_id`; then revisit; then repeat with a
rapid double tap.

### 14.4 Separate defect found and fixed: concurrent visitor identity

`visitorStorage.getVisitorId()` let concurrent first-time callers each generate
a different UUID for one installation. A unit test reproduced this on the
unchanged code (1 failed, 117 passed). Concurrent callers now share one pending
lookup; the full mobile suite passes 118/118.

This defect is **consistent with** the visitor counts above but is **not proven**
to have affected rows 122–124. The fix does not prevent two VIEW events; it only
gives concurrent events the same visitor identity. Existing rows are not
corrected.

### 14.5 Verification scope

- Added `artifact-detail-view.test.tsx`: real screen and interaction service,
  with mocked native components, router hooks and HTTP client. It is not
  navigator, emulator or database evidence.
- Mobile Jest 118/118, `tsc --noEmit` and ESLint exit 0 on Linux.
- Android build, protected-route denial, edit/delete persistence, offline
  resilience, favorite/history, feedback, cleanup, physical BLE and media
  playback were not executed and keep their earlier status.
