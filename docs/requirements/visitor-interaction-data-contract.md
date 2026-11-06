## 1. Objective
Define a common Visitor Interaction data contract for the M2, M3, Backend, and Analytics teams.
The contract should allow the system to record interactions consistently and support analytics such as unique visitor counts, artifact popularity, interaction frequency, and language usage.
This document is a proposal for team review. Fields or behaviors that differ from the current API or database design are identified as decisions requiring confirmation.
## 2. Proposed Event Fields
The JSON field names below use `camelCase` to match the current M3 API draft. Database column names may continue to use `snake_case`.

### Event Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | String (UUID) | Yes | Client-generated unique event key used to detect duplicate submissions. |
| `visitorId` | String | Yes | Stable pseudonymous identifier used for visitor analytics, including anonymous visitors. |
| `userId` | Integer or null | Conditional | Registered user ID, if available. The current ERD requires this value; supporting anonymous visitors requires M2 and Backend to approve a schema change or alternative storage approach. |
| `artifactId` | Integer | Yes | ID of the artifact associated with the interaction. |
| `beaconId` | Integer or null | Conditional | ID of the beacon, when the interaction was triggered by a beacon. |
| `interactionType` | Enum | Yes | Type of interaction. See Section 3. |
| `languageCode` | String | Yes | Language used to display or interact with the artifact, such as `vi` or `en`. This records the language of the event, not necessarily the visitor’s preferred language. |
| `startedAt` | ISO 8601 timestamp | Yes | Time when the interaction started. |
| `endedAt` | ISO 8601 timestamp or null | No | Time when the interaction ended, if available. |
| `durationSeconds` | Integer or null | No | Interaction duration in seconds. The Backend should calculate or validate it when both timestamps are present. |
| `interactedAt` | ISO 8601 timestamp | Yes | Time the interaction occurred. Used as the event time for history and analytics. |

`eventId` identifies the event submission and is separate from the database-generated `interactionId`. The Backend should return `interactionId` in its response.

### Field Mapping to the Current Model

| Contract field | Current model / ERD field | Status / Notes |
|---|---|---|
| `userId` | `user_id` | Present in the ERD. The ERD currently requires this value, so anonymous events need an agreed schema change or alternative storage approach. |
| `artifactId` | `artifact_id` | Present in the ERD. |
| `beaconId` | `beacon_id` | Present in the ERD. The current API draft uses `beaconMinor`; M3 and Backend should agree whether the API sends `beaconId` or keeps `beaconMinor` for Backend resolution. |
| `interactionType` | `interaction_type` | Present in the ERD. |
| `startedAt` | `started_at` | Present in the ERD. |
| `endedAt` | `ended_at` | Present in the ERD. |
| `interactedAt` | `interacted_at` | Present in the ERD. |
| `eventId` | — | Not currently in the ERD. M2 and Backend should confirm whether to persist it, for example, for duplicate detection. |
| `visitorId` | — | Not currently in the ERD. M2 and Backend should confirm how it will be stored or otherwise made available for analytics. |
| `languageCode` | — | Not currently in the `VisitorInteraction` ERD. M2 and Backend should confirm whether to add it or obtain it from another source. |
| `durationSeconds` | — | Not currently in the ERD. It may be derived from `started_at` and `ended_at`, or stored as a separate field; M2 and Backend should confirm. |.
## 3. Interaction Type Enum
The proposed interactionType values are:
BEACON_TRIGGER — a beacon detection event.
MANUAL_VIEW — the visitor opens an artifact detail screen manually.
FAVORITE_ADD — the visitor adds the artifact to favorites.
FAVORITE_REMOVE — the visitor removes the artifact from favorites.
The Mobile App and Backend must use the same values.
A BEACON_TRIGGER records beacon detection; it does not necessarily mean the visitor viewed the artifact. The Analytics team should define which interaction types count as artifact views.
## 4. Example JSON Payload
The following example illustrates a beacon-triggered interaction event:
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "visitorId": "visitor-1042",
  "userId": 12,
  "artifactId": 101,
  "beaconId": 7,
  "interactionType": "BEACON_TRIGGER",
  "languageCode": "vi",
  "startedAt": "2026-10-16T09:15:00Z",
  "endedAt": "2026-10-16T09:15:30Z",
  "durationSeconds": 30,
  "interactedAt": "2026-10-16T09:15:00Z"
}
The timestamps in this example use UTC, indicated by Z. The duration is 30 seconds, calculated from startedAt and endedAt.
This is an illustrative payload for team review. The final payload must follow the agreed API contract and database constraints. userId and beaconId may be null only when the agreed event flow and database schema allow it.
The Backend should return the database-generated interactionId in its response. The exact response format should follow the agreed API design.
## 5. Timestamp, Duration, and Duplicate Event Rules
Event timestamps must use ISO 8601 in UTC, indicated by Z.
startedAt is the start of the interaction.
endedAt may be null if the interaction has no measurable end time.
durationSeconds may be null if duration is unavailable. When both start and end times are present, the Backend should calculate or validate duration from them.
interactedAt is the time the event occurred and should be used for reporting-period filters.
The Backend should set any ingestion or recording timestamp itself if one is needed. The initial contract does not require a client-supplied recordedAt.
The Backend should treat repeated submissions with the same eventId as duplicates and avoid creating duplicate interaction records. The exact response to a duplicate submission should be defined by the Backend API.
## 6. Analytics Mapping
## 6.1 Unique Visitor Count
Use visitorId to count distinct visitors within the selected reporting period.
The team must agree how visitorId is generated, persisted, and associated with userId. It should be pseudonymous and stable enough for the agreed analytics period.
## 6.2 Artifact Popularity
Group events by artifactId.
The Analytics team must define which interactionType values count as views and whether other interactions, such as favorites, contribute separately to popularity.
## 6.3 Interaction Frequency
Count events by interactionType, artifactId, or reporting period. Use interactedAt to determine the period.
## 6.4 Language Usage
Use languageCode to group events by the language used for that interaction.
This measures event language usage. It should not be described as a visitor’s language preference unless the Analytics team agrees that event language is an appropriate proxy.
## 6.5 Visitor Feedback
Ratings and comments remain part of the existing Feedback functionality. They are not included in this interaction contract unless the teams agree to add feedback events.
## 7. Acceptance Criteria
M2, M3, Backend, and Analytics agree on field names, types, nullability, and meanings.
The agreed interactionType values are used consistently by the Mobile App and Backend.
Event timestamps use UTC and interactedAt is the reporting time for analytics.
Duplicate submissions can be identified using eventId.
The system can calculate distinct visitors using visitorId.
Events can be grouped by artifactId, interactionType, and languageCode.
The contract’s mapping to the VisitorInteraction model and database schema is documented.
The contract is reviewed by the Backend and M2/M3 teams before implementation.
## 8. Decisions to Confirm with M2, M3, and Backend
1.	Anonymous visitors: Can userId be null? The current ERD marks user_id as required. If anonymous events are supported, M2 and Backend must confirm the required schema change or alternative storage approach.
2.	Visitor identification: How is visitorId generated and maintained? How is it associated with userId after login?
3.	Beacon reference: Should the API send beaconId, or should it retain beaconMinor and let the Backend resolve the beacon?
4.	Event ID: Will the Mobile App generate a UUID eventId for deduplication, and how will the Backend handle duplicate submissions?
5.	Language meaning: Does languageCode represent the language displayed for this event, or the visitor’s saved language preference?
6.	View definition: Which interaction types count as artifact views for popularity analytics?
7.	Duration: Which interactions have a measurable duration, and should the Backend calculate durationSeconds?
8.	Database mapping: How will eventId, visitorId, languageCode, and durationSeconds map to the current VisitorInteraction model?
9.	Favorite interactions: Should FAVORITE_ADD and FAVORITE_REMOVE be stored as interaction events as well as represented by the existing Favorite data?
10.	Event time: Should interactedAt represent the start of the interaction, the time an action occurs, or another agreed event timestamp for each interaction type?
## 9. Existing Model Compatibility
The current design includes interactionId, userId, artifactId, beaconId, interactionType, startedAt, endedAt, and interactedAt across the ERD and related designs.
The proposed contract adds fields that are not currently present in the ERD, particularly eventId, visitorId, languageCode, and durationSeconds. It also proposes allowing a null userId, which conflicts with the current ERD.
The contract also requires a consistent mapping between beaconId in the proposed payload and the current API draft's beaconMinor.
These differences must be resolved with M2, M3, and Backend before changing the entity, API, or database schema.

## 10. Wave 3 Decision (Implemented)

This section records the decisions applied by the Wave 3 visitor interaction and analytics hardening work.
The proposal above is kept for history; where it conflicts with this section, this section is authoritative.

### 10.1 Identity and schema decisions

- `visitorId` is a required, client-generated UUID v4 stored in mobile persistent storage.
  It is pseudonymous, stable across app restarts, and does not change on login/logout.
- Anonymous visitors are supported: `user_id` is nullable in `visitor_interaction`, and anonymous records store `userId = null`.
- Authenticated identity is derived **only** from the Spring Security principal.
  A client-supplied `userId` is never trusted or persisted. Unknown fields in the request body are ignored, so a conflicting client `userId` cannot change ownership.
- `eventId` idempotency remains global and owned:
  - authenticated retry: same `eventId` + same authenticated user -> `200 OK` with the existing row (the principal owns the event, so a changed `visitorId` after reinstall is accepted);
  - anonymous retry: same `eventId` + same `visitorId` -> `200 OK` with the existing row;
  - a different user/visitor reusing an `eventId` -> `409 Conflict`.
- `beaconId`/`beaconMinor` are **not** added. There is no real beacon flow yet, so no speculative schema or API field is introduced.
- `interactionType` keeps the existing enum `VIEW | AUDIO_PLAY | SCAN`.
  The proposal's `BEACON_TRIGGER`, `MANUAL_VIEW`, and favorite types are not adopted in this wave, and no `SCAN`/`AUDIO_PLAY` events are emitted from fake features.
- `languageCode` is the language used for this event, not the saved user preference.
- `durationSeconds` is computed by the backend from `startedAt` and `endedAt`; clients do not send it.
- `interactedAt` is the reporting time for analytics, and all timestamps are ISO-8601 UTC instants.

### 10.2 Field mapping after Wave 3

| Field | Mobile | Backend request DTO | Database | Analytics usage |
|---|---|---|---|---|
| `eventId` | Generated once per interaction attempt; reused on retry | `UUID eventId`, required | `event_id uuid NOT NULL`, unique `uk_visitor_interaction_event_id` | Not aggregated; deduplication only |
| `visitorId` | Persistent UUID from AsyncStorage; generated once per installation | `UUID visitorId`, required | `visitor_id uuid NOT NULL` | `count(distinct visitor_id)` for unique visitors |
| `userId` | Not sent | Not in DTO (ignored if present) | `user_id integer NULL`, derived from principal | Ownership/idempotency check only |
| `artifactId` | Real artifact ID from the detail route | `Integer artifactId`, required, positive | `artifact_id integer NOT NULL` | Grouping for popular artifacts |
| `beaconId` / `beaconMinor` | Not sent | Not in DTO | Not added | Deferred until a real beacon flow exists |
| `interactionType` | `VIEW` only (real artifact detail open) | `String`, required, pattern `(?i:VIEW\|AUDIO_PLAY\|SCAN)` | `interaction_type varchar(50) NOT NULL` | Interaction-type counts |
| `languageCode` | `vi` for the current event | `String`, required, max 16, language tag pattern | `language_code varchar(16) NOT NULL` | Available for language grouping; not yet shown as a dashboard preference metric |
| `startedAt` | Event start instant | `Instant`, required | `started_at timestamptz NOT NULL` | Duration calculation input |
| `endedAt` | Only when a real end exists; absent for detail views | `Instant`, optional | `ended_at timestamptz NULL` | Duration calculation input |
| `durationSeconds` | Not sent | Not in DTO | `duration_seconds bigint NULL`, backend-computed | Not currently aggregated by the summary endpoint |
| `interactedAt` | Event reporting instant | `Instant`, required | `interacted_at timestamptz NOT NULL` | Reporting-period filter `[from, to)` |

### 10.3 Mobile recording rules

- `POST /api/interactions` is public; the mobile request sends the Bearer token only when a session exists.
- An interaction is recorded only when a user opens a real artifact detail screen loaded from the backend.
- No events are emitted from mock-only screens such as favorites/history, and no `SCAN`/`AUDIO_PLAY` event is emitted until those features are real.
- A failed analytics write never blocks browsing; failures are swallowed after being reported to the service caller.
- Each artifact-detail view attempt creates one `eventId`; retrying the same logical event reuses that ID.

### 10.4 Remaining deferred decisions

- Beacon identifiers and beacon-triggered interactions remain deferred.
- Favorite add/remove events remain deferred until favorites are backed by real API data.
- Language preference analytics is deferred; the current dashboard does not claim event language equals user preference.
- A "recent activities" feed is not implemented because the backend exposes no such endpoint.

