# Sprint 6 — Full-Stack Acceptance Checklist

- **Status:** OPEN — not full-stack accepted
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
| Local Docker Compose | **Blocked:** Docker daemon unavailable (`/var/run/docker.sock` absent); starting it requires a sudo password |
| Native Windows 11 | **Not available** in this environment |
| Android emulator / physical device | **Not available** |
| Browser-driven E2E framework | **Not present**; no new framework was added |
| CI public smoke | Verified by `integration-smoke` on the final code commit |
| CI production packaging smoke | Verified by `production-smoke` on the final code commit |

CI evidence for code commit `adc88222a3b3b32e110d5df03607ab8c13fe979c`:
push run `45751420300` and PR run `45751427038`, both 12/12. Public smoke
reported 17 passed, 0 failed, 9 skipped; production smoke passed. Subsequent
documentation-only commits are covered by the final 12/12 run on PR #46.
This is not full-stack acceptance.

## Acceptance Matrix

| Scenario | Status | Owner | Evidence requirement |
|---|---|---|---|
| Public health and content APIs | Verified by CI | M5/M1 | `integration-smoke` job on the final HEAD; health, heritage-sites, artifacts and multimedia responses |
| Production Compose packaging, SPA fallback, `/api` proxy, port exposure | Verified by CI | M1 | `production-smoke` job on the final HEAD |
| Admin login and session bootstrap in a real browser | Not verified | M4/M5 | Browser session against the Compose stack; login, refresh, logout, token removal |
| Protected admin routes | Not verified | M4/M5 | Browser navigation without a token and with a VISITOR token; expected redirect/403 |
| Heritage site and artifact browsing through Admin Web | Not verified | M4/M5 | Browser list/detail against real backend data; screenshot or network log |
| Heritage site/artifact/multimedia create, edit, delete | Not verified | M4/M5 | Browser CRUD against disposable data; persistence after reload |
| Beacon resolution and visitor interaction | Not verified | M3/M5 | Real backend request or device flow; stored interaction row and analytics result |
| Analytics event visibility and dashboard totals | Not verified | M4/M5 | Dashboard values compared with the analytics API for the same range |
| Frontend-to-backend API integration in a browser | Not verified | M4/M5 | Browser network trace through the production proxy, not a mocked API |
| CSV export from a real browser | Not verified | M4/M5 | Downloaded file checked for UTF-8 BOM, escaping and expected values |
| Physical BLE beacon flow | Blocked by physical hardware | M3/M5 | Physical beacon/device log, timestamp, commit SHA and operator |
| Real-device audio/image/video playback | Requires human acceptance | M3/M5 | Device/OS version, media asset, playback result and operator |
| Error and offline resilience in browser/mobile | Not verified | M4/M3/M5 | Backend-stop/restart test with visible error and retry evidence |

## Required Acceptance Evidence

Every item changed to PASS must record:

- Commit SHA tested.
- Environment (OS, browser/device, Node/Java/PostgreSQL versions).
- Exact command or user flow.
- Raw result (log, screenshot or network trace).
- Tester and date.

## Current Decision

Full-stack acceptance is **NOT COMPLETE**. Green CI, component tests and API
controller tests do not replace browser, physical BLE or real-device evidence.
Final release approval remains with M1.
