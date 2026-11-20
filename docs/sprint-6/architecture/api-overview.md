# Smart Heritage — API Overview

Status: **as-built REST contract** for `backend/` at `main` (`6e11c0b`).
Base path: `/api`. There is no `/api/v1` prefix.

This is a compact contract overview. Detailed historical examples also exist in
[`docs/integration/api-contract.md`](../../integration/api-contract.md); when the
two disagree, the controllers and DTOs in `backend/src/main/java` are the source
of truth.

## 1. Conventions

### 1.1 Response envelope

Success and error responses use `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "Artifacts retrieved successfully",
  "data": [],
  "timestamp": "2026-11-20T10:00:00Z"
}
```

Fields:

| Field | Present | Meaning |
|---|---|---|
| `success` | always | Boolean outcome |
| `message` | always | Human-readable description |
| `data` | success only | Payload; absent/null for some deletes |
| `timestamp` | always | Server time, ISO-8601 instant |
| `path` | errors only | Request URI |
| `errors` | validation errors | `[{ "field": "...", "message": "..." }]` |

`@JsonInclude(NON_NULL)` means null fields are normally omitted.

### 1.2 Authentication

```http
Authorization: Bearer <accessToken>
```

- JWT subject is the username; role is also carried as a claim but the filter
  reloads the principal from the database.
- Default expiry is 24 hours (`JWT_EXPIRATION_MS=86400000`).
- Missing/invalid token on a protected route → `401`.
- Authenticated non-admin on an admin route → `403`.

### 1.3 Pagination and sorting

List endpoints for heritage sites and artifacts return a plain JSON array when
both `page` and `size` are absent. If either is present:

```json
{
  "content": [],
  "page": 0,
  "size": 10,
  "totalElements": 0,
  "totalPages": 0
}
```

Rules:

- `page >= 0`;
- `1 <= size <= 100`;
- heritage sites sort fields: `name` (default), `siteId`;
- artifacts sort fields: `name` (default), `artifactId`;
- `direction`: `asc` (default) or `desc`;
- a deterministic tie-breaker is appended automatically.

### 1.4 Content types and CORS

- Requests/responses are `application/json`.
- CORS is enabled for `/api/**` from configured origins with JSON headers.
- There are no file-upload endpoints; multimedia is stored as URLs.

## 2. Endpoint summary

### 2.1 Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | public | Liveness/readiness probe |

Response is a plain map, not the envelope:

```json
{ "status": "UP", "timestamp": "2026-11-20T10:00:00" }
```

### 2.2 Authentication

| Method | Path | Auth | Success | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | 201 | Register a visitor |
| POST | `/api/auth/login` | public | 200 | Obtain JWT |

`RegisterRequest`:

```json
{ "username": "visitor01", "email": "v@example.com", "password": "secret1" }
```

`LoginRequest`:

```json
{ "username": "visitor01", "password": "secret1" }
```

`LoginResponse.data`:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "userId": 1,
    "username": "visitor01",
    "email": "v@example.com",
    "role": "VISITOR",
    "preferredLanguageId": null
  }
}
```

Registration always assigns the `VISITOR` role. There is no public admin
registration endpoint.

### 2.3 Current user

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Bearer | Return the authenticated profile |
| PUT | `/api/users/me` | Bearer | Update username and/or preferred language ID |

`UpdateProfileRequest`:

```json
{ "username": "new-name", "preferredLanguageId": 1 }
```

Both fields are optional; omitting a field leaves it unchanged. `preferredLanguageId`
is stored but there is no language catalogue or FK yet.

### 2.4 Heritage sites

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/heritage-sites` | public | List or page; optional `keyword`, `page`, `size`, `sortBy`, `direction` |
| GET | `/api/heritage-sites/{siteId}` | public | Get one site |
| POST | `/api/heritage-sites` | ADMIN | Create |
| PUT | `/api/heritage-sites/{siteId}` | ADMIN | Replace mutable fields |
| DELETE | `/api/heritage-sites/{siteId}` | ADMIN | Delete if no artifacts reference it |

`HeritageSiteRequest`:

```json
{
  "name": "Imperial City",
  "description": "…",
  "address": "…",
  "latitude": 16.4698,
  "longitude": 107.5796
}
```

Validation: `name` required ≤255; `address` ≤500; latitude −90..90; longitude
−180..180. `DELETE` returns `409` when artifacts still exist.

### 2.5 Artifacts

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/artifacts` | public | List or page; optional `siteId`, `keyword`, `page`, `size`, `sortBy`, `direction` |
| GET | `/api/artifacts/{artifactId}` | public | Get one artifact |
| POST | `/api/artifacts` | ADMIN | Create |
| PUT | `/api/artifacts/{artifactId}` | ADMIN | Update |
| DELETE | `/api/artifacts/{artifactId}` | ADMIN | Delete if no multimedia, interactions or beacons reference it |

`ArtifactRequest`:

```json
{ "siteId": 1, "name": "Bronze drum", "description": "…" }
```

`ArtifactResponse` includes `artifactId`, `siteId`, `siteName`, `name`,
`description`.

`DELETE` returns `409` when multimedia, interaction history or beacons reference
the artifact.

### 2.6 Multimedia

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/multimedia` | public | List all; optional `artifactId` filter |
| GET | `/api/multimedia/{multimediaId}` | public | Get one |
| POST | `/api/multimedia` | ADMIN | Create |
| PUT | `/api/multimedia/{multimediaId}` | ADMIN | Update |
| DELETE | `/api/multimedia/{multimediaId}` | ADMIN | Delete |

`MultimediaRequest`:

```json
{ "artifactId": 1, "type": "IMAGE", "title": "Front view", "url": "https://…" }
```

`type` is free text in the database; clients currently understand `IMAGE`,
`AUDIO`, `VIDEO` and normalize anything else to `UNKNOWN`. The backend does not
upload or verify media URLs.

### 2.7 Beacons

Public resolution:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/beacons/resolve?uuid={uuid}&major={0..65535}&minor={0..65535}` | public | Resolve an enabled beacon to its artifact/site |

`BeaconResponse`:

```json
{
  "beaconId": 1,
  "name": "Gallery A",
  "uuid": "f7826da6-4fa2-4e98-8024-bc5b71e0893e",
  "major": 1,
  "minor": 2,
  "enabled": true,
  "artifactId": 10,
  "artifactName": "Bronze drum",
  "siteId": 1,
  "siteName": "Imperial City"
}
```

Unknown or disabled identity → `404`.

Admin management:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/beacons` | ADMIN | List ordered by name |
| GET | `/api/admin/beacons/{beaconId}` | ADMIN | Get one |
| POST | `/api/admin/beacons` | ADMIN | Create |
| PUT | `/api/admin/beacons/{beaconId}` | ADMIN | Update |
| DELETE | `/api/admin/beacons/{beaconId}` | ADMIN | Delete; interaction history keeps `NULL` beacon |

`BeaconRequest`:

```json
{
  "name": "Gallery A",
  "uuid": "f7826da6-4fa2-4e98-8024-bc5b71e0893e",
  "major": 1,
  "minor": 2,
  "enabled": true,
  "artifactId": 10
}
```

`enabled` defaults to `true` when omitted. Duplicate `(uuid, major, minor)` →
`409`.

### 2.8 Visitor interactions

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/interactions` | public, optional Bearer | Record one interaction event idempotently |

`CreateInteractionRequest`:

```json
{
  "eventId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "visitorId": "0b7b6c1e-8f6e-4a3e-9a7a-2f6f1e7a9c11",
  "artifactId": 10,
  "beaconId": 1,
  "interactionType": "BEACON_TRIGGER",
  "languageCode": "vi",
  "startedAt": "2026-11-20T09:59:50Z",
  "endedAt": "2026-11-20T10:00:00Z",
  "interactedAt": "2026-11-20T10:00:00Z"
}
```

Rules:

| Field | Rule |
|---|---|
| `eventId` | required UUID; globally unique idempotency key |
| `visitorId` | required UUID; stable per installation |
| `artifactId` | required, positive, must exist |
| `beaconId` | allowed only for `BEACON_TRIGGER`; then required, enabled and mapped to the same artifact |
| `interactionType` | `VIEW`, `AUDIO_PLAY`, `SCAN`, `BEACON_TRIGGER` (case-insensitive input, stored uppercase) |
| `languageCode` | required, ≤16, `[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*` |
| `startedAt` / `interactedAt` | required instants |
| `endedAt` | optional; must not precede `startedAt` |

Status behavior:

| Situation | Status | Message |
|---|---|---|
| New event | 201 | `Interaction recorded successfully` |
| Same `eventId` + same identity | 200 | `Interaction event was already recorded` |
| Same `eventId` + different identity | 409 | `eventId has already been used` |
| Invalid beacon mapping | 400 | domain message |
| Unknown artifact/beacon/user | 404 | domain message |

`durationSeconds` is server-computed and returned; the client never sends it.
`userId` is derived from the JWT when present and is never accepted from the
request body.

### 2.9 Analytics (ADMIN)

| Method | Path | Auth | Required params | Description |
|---|---|---|---|---|
| GET | `/api/analytics/interactions/summary` | ADMIN | none, or both `from`/`to` | Totals, unique visitors, type breakdown, top 10 artifacts |
| GET | `/api/analytics/interactions/timeseries` | ADMIN | both `from`/`to` | Daily interactions and unique visitors |
| GET | `/api/analytics/interactions/languages` | ADMIN | both `from`/`to` | Interaction count per language code |

Range rules:

- `from` and `to` are ISO-8601 instants and must be supplied together where
  required;
- `from` must be strictly earlier than `to`;
- the range must not exceed 90 days;
- the interval is `[from, to)`.

Summary response:

```json
{
  "from": "2026-10-22T00:00:00Z",
  "to": "2026-11-20T00:00:00Z",
  "totalInteractions": 1250,
  "uniqueVisitors": 340,
  "interactionTypes": [
    { "interactionType": "VIEW", "count": 700 },
    { "interactionType": "BEACON_TRIGGER", "count": 300 }
  ],
  "popularArtifacts": [
    { "artifactId": 10, "artifactName": "Bronze drum", "interactionCount": 120 }
  ]
}
```

Time-series response:

```json
[
  { "date": "2026-11-19", "totalInteractions": 42, "uniqueVisitors": 18 },
  { "date": "2026-11-20", "totalInteractions": 0, "uniqueVisitors": 0 }
]
```

Missing days are zero-filled. Day boundaries and buckets are UTC.

Language response:

```json
[
  { "languageCode": "vi", "interactionCount": 900 },
  { "languageCode": "en", "interactionCount": 300 },
  { "languageCode": "UNKNOWN", "interactionCount": 10 }
]
```

There is no PDF/Excel endpoint. The Admin Web exports the **summary** as CSV in
the browser (`frontend/src/utils/analyticsCsv.ts`), including RFC 4180 escaping,
formula-injection mitigation and a UTF-8 BOM.

## 3. Error catalog

| Status | Typical cause |
|---|---|
| 400 | Bean Validation failure, malformed JSON, bad parameter type, invalid pagination/sort, invalid analytics range, beacon/artifact mismatch |
| 401 | Missing/expired/invalid JWT on a protected route; bad login credentials |
| 403 | Authenticated but not `ADMIN` |
| 404 | Unknown site/artifact/multimedia/beacon/artifact-for-beacon; disabled beacon resolution |
| 409 | Duplicate username/email, duplicate beacon identity, event ID reuse with different identity, delete blocked by dependents |
| 500 | Unexpected server/database failure; generic message only |

Example validation error:

```json
{
  "success": false,
  "message": "Request validation failed",
  "timestamp": "2026-11-20T10:00:00Z",
  "path": "/api/artifacts",
  "errors": [
    { "field": "name", "message": "Artifact name is required" }
  ]
}
```

## 4. Client-specific notes

### Admin Web

- Uses `fetch` through `frontend/src/services/apiClient.ts`.
- Stores the token in `authStorage`; a 401 on a non-credential request clears
  the token and emits a global unauthorized event.
- `VITE_API_BASE_URL` is an origin, not a full `/api` path; trailing `/api` is
  stripped to avoid `/api/api/...`.
- In production, the default empty value makes requests same-origin
  (`/api/...`) through Nginx.

### Mobile

- Base URL already includes `/api` (`EXPO_PUBLIC_API_BASE_URL`), with platform
  defaults: Android emulator `10.0.2.2`, otherwise `localhost`.
- `apiRequest` unwraps the envelope and returns `{ data, error, status, ok }`
  instead of throwing.
- `POST /api/interactions` is fire-and-forget from the UI: a failure shows a
  message but never blocks artifact content.
- The app sends its persistent `visitorId` and optional Bearer token.

## 5. Explicit gaps

- No OpenAPI/Swagger artifact is generated in the repository.
- No refresh token, logout/revocation, password reset or email verification
  endpoint.
- No favorites, feedback, translation, upload or report-generation endpoints.
- No bulk import/export endpoints.
- No ETag/If-Match or `@Version` support; concurrent admin edits are
  last-write-wins.

## 6. Related documents

- [System architecture](system-architecture.md)
- [Database ERD](database-erd.md)
- [Java backend architecture](java-backend-architecture.md)
- [Sequence diagrams](sequence-diagrams.md)
- [Integration contract](../../integration/api-contract.md)
- [Visitor interaction data contract](../../requirements/visitor-interaction-data-contract.md)
