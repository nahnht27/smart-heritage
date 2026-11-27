# Sprint 6 — Full-Stack Acceptance Checklist

- **Status:** PARTIALLY VERIFIED — core E2E accepted with limitations
- **Date:** 2026-11-26
- **Branch:** `LTJ-76`
- **PR:** https://github.com/nahnht27/smart-heritage/pull/46
- **Final merge/release owner:** M1

This checklist separates automated CI evidence from browser, backend, physical
BLE and real-device acceptance. A mocked component test or a Docker-only API
check is not evidence for a physical-device or browser acceptance item.

## Environment

| Item | Result |
|---|---|
| Local Docker Compose in this agent environment | **Blocked:** Docker daemon unavailable (`/var/run/docker.sock` absent); starting it requires a sudo password |
| Docker Compose full-stack E2E | **Verified in S6-M5-01** on Windows 11, isolated project `smart-heritage-s6-m5-01` |
| Native Windows 11 | **E2E executed on Windows 11 in S6-M5-01**; the current locale-fixed 165-test suite was not rerun natively on Windows |
| Android emulator | **Verified in S6-M5-01** (`Medium_Phone_API_37.0`, `emulator-5554`) |
| Physical Android device / physical BLE | **Not available** |
| Browser-driven E2E framework | **Not present**; S6-M5-01 used manual browser E2E |
| CI public smoke | Verified by `integration-smoke` on the final code commit |
| CI production packaging smoke | Verified by `production-smoke` on the final code commit |

Primary E2E evidence:
`docs/testing/S6-M5-01-e2e-acceptance-report.md`.

CI evidence for code commit `adc88222a3b3b32e110d5df03607ab8c13fe979c`:
push run `45751420300` and PR run `45751427038`, both 12/12. Public smoke
reported 17 passed, 0 failed, 9 skipped; production smoke passed. Subsequent
documentation-only commits are covered by the final CI recorded on PR #46.

## Acceptance Matrix

| Scenario | Status | Owner | Evidence |
|---|---|---|---|
| Public health and content APIs | Verified by CI | M5/M1 | `integration-smoke`; health, heritage-sites, artifacts, multimedia |
| Production Compose packaging, SPA fallback, `/api` proxy, port exposure | Verified by CI | M1 | `production-smoke` |
| Admin login and session bootstrap in a real browser | Verified by S6-M5-01 | M4/M5 | Admin login and management-page access on Windows 11 |
| Protected admin routes | Not fully verified | M4/M5 | No-token and VISITOR-token browser navigation not evidenced |
| Heritage site, artifact, multimedia and beacon creation | Verified by S6-M5-01 | M4/M5 | Site 9, artifact 41, multimedia 41, beacon 9 created |
| Edit/delete CRUD persistence | Not verified | M4/M5 | Only creation was exercised; edit/delete/reload not evidenced |
| Beacon resolve API | Verified by S6-M5-01 | M3/M5 | HTTP 200, correct artifact mapping; not physical BLE |
| Visitor interaction persistence | Verified by S6-M5-01 | M3/M5 | API interaction 121; mobile VIEW 122–124 in PostgreSQL |
| Analytics visibility and dashboard totals | Verified by S6-M5-01 | M4/M5 | PostgreSQL, Admin Dashboard and CSV compared at 64 interactions |
| CSV export from Admin Web | Verified by S6-M5-01 | M4/M5 | UTF-8/escaping and totals checked against database |
| Browser-to-backend API integration | Verified by S6-M5-01 | M4/M5 | Admin Web and mobile against the Compose stack |
| Android native build, artifact list/search/detail, IMAGE rendering | Verified by S6-M5-01 | M3/M5 | Android Emulator evidence in the E2E report |
| Physical BLE beacon flow | Not verified | M3/M5 | Physical beacon/device log, timestamp and operator required |
| Physical-device multimedia and audio/video playback | Not verified | M3/M5 | Emulator image only; playback not tested |
| Favorite/history and feedback persistence | Not verified | M3/M5 | Mock/UI-only behavior identified |
| Error and offline resilience | Not verified | M4/M3/M5 | Backend-stop/restart with visible error and retry evidence |
| Post-execution data cleanup | Not verified | M5 | Cleanup was not performed or verified |
| Duplicate VIEW events (17 ms apart) | Investigation required | M3 | Not confirmed as a defect |

## Current Decision

Core full-stack Admin Web, Backend API, PostgreSQL, Android Emulator, visitor
interaction, analytics and CSV flows are **verified with limitations**.
Physical BLE, physical-device media, audio/video playback, favorite/history and
feedback persistence remain unverified. Final release approval remains with M1
and is conditional on M4 review, acceptance of these limitations and green CI
on the actual PR head.
