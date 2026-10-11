# Java Backend — Admin API Design

## 1. Overview

The Admin Web uses the Java 17 Spring Boot REST API as the backend service.

This document defines the main REST APIs required for the Heritage Site Administrator in Sprint 1.

The APIs cover:
- Heritage Site Management
- Artifact Management
- Multimedia Management
- iBeacon Management
- Beacon Deployment Location Management
- Translation Management
- Feedback Moderation
- Analytics Dashboard
- Report Overview and Statistical Report Export

Authentication is provided by the shared Auth module and is not redefined here. The Analytics and Report endpoints follow the design of the Analytics / Report module.

---

## 2. Common Conventions

### 2.1 Authentication header

All endpoints except login require a valid token issued by the shared Auth module:

```http
Authorization: Bearer <token>
```

### 2.2 List requests

List endpoints support pagination through the query parameters below, plus the module-specific filters in each section.

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page index, starting from 0 |
| `size` | integer | Page size |
| `q` | string | Search keyword |

List response:

```json
{
  "content": [ { "id": 1 } ],
  "page": 0,
  "size": 10,
  "totalElements": 12
}
```

### 2.3 Status codes

| Code | Meaning |
|---|---|
| `200 OK` | Request succeeded (read / update / moderate) |
| `201 Created` | Resource created |
| `204 No Content` | Resource deleted |
| `400 Bad Request` | Validation error |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Authenticated but not `ADMIN` |
| `404 Not Found` | Resource does not exist |

### 2.4 Error response

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "name must not be blank",
  "timestamp": "2025-05-10T10:42:00"
}
```

---

## 3. Admin API

### 3.1 Authentication

The Administrator logs in through the shared login API of the Auth module. No separate authentication mechanism is created for the Admin Web. The `ADMIN` role is carried in the issued token and checked by the Admin APIs (see Section 6).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Shared login API (defined by the Auth module) |

> The exact path and payload are owned by the Auth module and should be confirmed against its design.

### 3.2 Heritage Site Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/heritage-sites` | Retrieve and search heritage sites |
| `GET` | `/api/admin/heritage-sites/{siteId}` | Retrieve a heritage site by ID |
| `POST` | `/api/admin/heritage-sites` | Create a heritage site |
| `PUT` | `/api/admin/heritage-sites/{siteId}` | Update a heritage site |
| `DELETE` | `/api/admin/heritage-sites/{siteId}` | Delete a heritage site |

List filters: `q`, `status` (`ACTIVE`, `INACTIVE`, `MAINTENANCE`).

`POST` / `PUT` request:

```json
{
  "name": "Imperial Citadel",
  "location": "Hue, Vietnam",
  "description": "Imperial Citadel of Hue is a historical and cultural heritage site in Hue, Vietnam.",
  "status": "ACTIVE"
}
```

Response (`201 Created` for `POST`, `200 OK` for `PUT`):

```json
{
  "id": 1,
  "name": "Imperial Citadel",
  "location": "Hue, Vietnam",
  "description": "Imperial Citadel of Hue is a historical and cultural heritage site in Hue, Vietnam.",
  "status": "ACTIVE",
  "updatedAt": "2025-05-10T10:42:00"
}
```

### 3.3 Artifact Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/artifacts` | Retrieve and search artifacts |
| `GET` | `/api/admin/artifacts/{artifactId}` | Retrieve an artifact by ID |
| `POST` | `/api/admin/artifacts` | Create an artifact |
| `PUT` | `/api/admin/artifacts/{artifactId}` | Update an artifact |
| `DELETE` | `/api/admin/artifacts/{artifactId}` | Delete an artifact |

List filters: `q`, `category`, `siteId`.

`POST` / `PUT` request:

```json
{
  "name": "Imperial Dragon Seal",
  "category": "Royal Artifact",
  "siteId": 1,
  "period": "Nguyen Dynasty",
  "status": "DISPLAYED",
  "description": "Royal seal of the Nguyen Dynasty."
}
```

Response (`201 Created` for `POST`, `200 OK` for `PUT`):

```json
{
  "id": 1,
  "name": "Imperial Dragon Seal",
  "category": "Royal Artifact",
  "siteId": 1,
  "siteName": "Imperial Citadel",
  "period": "Nguyen Dynasty",
  "status": "DISPLAYED",
  "description": "Royal seal of the Nguyen Dynasty."
}
```

`status`: `DISPLAYED`, `IN_STORAGE`.

### 3.4 Multimedia Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/multimedia` | Retrieve multimedia resources |
| `GET` | `/api/admin/multimedia/{multimediaId}` | Retrieve multimedia details |
| `POST` | `/api/admin/multimedia` | Upload and create multimedia resource |
| `PUT` | `/api/admin/multimedia/{multimediaId}` | Update multimedia resource |
| `DELETE` | `/api/admin/multimedia/{multimediaId}` | Delete multimedia resource |

List filters: `q`, `type` (`IMAGE`, `VIDEO`, `AUDIO`), `associatedType` (`SITE`, `ARTIFACT`).

`POST` request (`multipart/form-data`):

| Field | Type | Description |
|---|---|---|
| `file` | file | Image, video or audio file |
| `name` | string | Resource name |
| `associatedType` | string | `SITE` or `ARTIFACT` |
| `associatedId` | number | ID of the associated site or artifact |

`PUT` request (`application/json`, metadata only):

```json
{
  "name": "Imperial Citadel — Main gate",
  "associatedType": "SITE",
  "associatedId": 1
}
```

Response (`201 Created` for `POST`, `200 OK` for `PUT`):

```json
{
  "id": 1,
  "name": "Imperial Citadel — Main gate",
  "type": "IMAGE",
  "fileName": "imperial-citadel-gate.jpg",
  "fileSize": 2516582,
  "url": "/files/multimedia/imperial-citadel-gate.jpg",
  "associatedType": "SITE",
  "associatedId": 1,
  "uploadedAt": "2025-05-10T10:42:00"
}
```

### 3.5 iBeacon Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/beacons` | Retrieve and search iBeacon devices |
| `GET` | `/api/admin/beacons/{beaconId}` | Retrieve beacon details |
| `POST` | `/api/admin/beacons` | Register an iBeacon device |
| `PUT` | `/api/admin/beacons/{beaconId}` | Update / configure an iBeacon |
| `DELETE` | `/api/admin/beacons/{beaconId}` | Delete an iBeacon |

List filters: `q`, `status` (`ACTIVE`, `INACTIVE`), `siteId`.

`POST` request (register):

```json
{
  "name": "Main Entrance Beacon",
  "uuid": "f7826da6-4fa2-4e98-8024-bc5b71e0893e",
  "major": 1,
  "minor": 1
}
```

`PUT` request (update / configure):

```json
{
  "name": "Main Entrance Beacon",
  "status": "ACTIVE",
  "txPower": -59,
  "advertisingIntervalMs": 500
}
```

Response (`201 Created` for `POST`, `200 OK` for `PUT`):

```json
{
  "id": 1,
  "name": "Main Entrance Beacon",
  "uuid": "f7826da6-4fa2-4e98-8024-bc5b71e0893e",
  "major": 1,
  "minor": 1,
  "status": "ACTIVE",
  "txPower": -59,
  "advertisingIntervalMs": 500,
  "battery": 92,
  "siteId": 1,
  "updatedAt": "2025-05-10T10:42:00"
}
```

#### Beacon Assignment

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/admin/beacons/{beaconId}/assignment` | Assign a beacon to a heritage site or artifact |

Request:

```json
{
  "targetType": "ARTIFACT",
  "targetId": 1
}
```

`targetType`: `SITE`, `ARTIFACT`.

Response `200 OK`:

```json
{
  "beaconId": 1,
  "targetType": "ARTIFACT",
  "targetId": 1
}
```

### 3.6 Beacon Deployment Location

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/beacons/{beaconId}/location` | Retrieve beacon deployment location |
| `PUT` | `/api/admin/beacons/{beaconId}/location` | Update beacon deployment location |

The deployment location supports management through the interactive map.

`PUT` request:

```json
{
  "latitude": 16.4698,
  "longitude": 107.5786
}
```

`GET` / `PUT` response `200 OK`:

```json
{
  "beaconId": 1,
  "latitude": 16.4698,
  "longitude": 107.5786,
  "updatedAt": "2025-05-10T10:42:00"
}
```

### 3.7 Translation Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/translations` | Retrieve translations |
| `GET` | `/api/admin/translations/{translationId}` | Retrieve translation details |
| `POST` | `/api/admin/translations` | Create a translation |
| `PUT` | `/api/admin/translations/{translationId}` | Update a translation |
| `DELETE` | `/api/admin/translations/{translationId}` | Delete a translation |

List filters: `q`, `language` (`vi`, `en`), `contentType` (`SITE`, `ARTIFACT`), `status` (`DRAFT`, `PUBLISHED`).

`POST` / `PUT` request:

```json
{
  "contentType": "SITE",
  "contentId": 1,
  "language": "vi",
  "title": "Hoàng thành Huế",
  "description": "Hoàng thành Huế là một di tích lịch sử và văn hóa tại Huế, Việt Nam.",
  "status": "PUBLISHED"
}
```

Response (`201 Created` for `POST`, `200 OK` for `PUT`):

```json
{
  "id": 1,
  "contentType": "SITE",
  "contentId": 1,
  "language": "vi",
  "title": "Hoàng thành Huế",
  "description": "Hoàng thành Huế là một di tích lịch sử và văn hóa tại Huế, Việt Nam.",
  "status": "PUBLISHED",
  "updatedAt": "2025-05-10T10:42:00"
}
```

### 3.8 Feedback Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/feedback` | Retrieve visitor feedback and reviews |
| `GET` | `/api/admin/feedback/{feedbackId}` | Retrieve feedback details |
| `PUT` | `/api/admin/feedback/{feedbackId}/moderate` | Moderate visitor feedback |

List filters: `q`, `status` (`PENDING`, `APPROVED`, `REJECTED`).

Feedback creation is performed by the Visitor side, while the Administrator is responsible for moderation.

Moderation request:

```json
{
  "action": "APPROVE"
}
```

`action`: `APPROVE`, `REJECT`.

Moderation response `200 OK`:

```json
{
  "id": 1,
  "status": "APPROVED",
  "moderatedAt": "2025-05-10T10:42:00"
}
```

### 3.9 Analytics Dashboard

Endpoints follow the Analytics / Report module design. Request parameters and response bodies are defined by that module.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/visitors` | Visitor statistics |
| `GET` | `/api/analytics/artifacts/popular` | Artifact popularity |
| `GET` | `/api/analytics/interactions` | Interaction frequency |
| `GET` | `/api/analytics/languages` | Language statistics |
| `GET` | `/api/analytics/engagement` | Engagement statistics |
| `GET` | `/api/analytics/feedback` | Feedback statistics |

### 3.10 Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/overview` | Retrieve report overview |
| `GET` | `/api/reports/export` | Export statistical report |

Export query parameters:

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `from` | date (`yyyy-MM-dd`) | ✓ | Start of the date range |
| `to` | date (`yyyy-MM-dd`) | ✓ | End of the date range |
| `format` | `pdf` \| `excel` | ✓ | Export format |

Example:

```http
GET /api/reports/export?from=2025-05-01&to=2025-05-31&format=pdf
```

Export response `200 OK`: the report file as a download.

| Format | Content-Type |
|---|---|
| `pdf` | `application/pdf` |
| `excel` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

```http
Content-Disposition: attachment; filename="statistical-report-2025-05-01_2025-05-31.pdf"
```

`400 Bad Request` is returned when `from` is after `to`, or when `format` is not supported.

---

## 4. CRUD Operations

| Entity / Module | Create | Read | Update | Delete | Special Operation |
|---|:---:|:---:|:---:|:---:|---|
| Heritage Site | ✓ | ✓ | ✓ | ✓ | Search |
| Artifact | ✓ | ✓ | ✓ | ✓ | Search |
| Multimedia | ✓ | ✓ | ✓ | ✓ | Upload |
| iBeacon | ✓ | ✓ | ✓ | ✓ | Configure / Assign |
| Beacon Deployment Location | — | ✓ | ✓ | — | Interactive Map |
| Translation | ✓ | ✓ | ✓ | ✓ | Multilingual Content |
| Feedback | — | ✓ | ✓ | — | Moderate |
| Analytics | — | ✓ | — | — | Dashboard |
| Reports | — | ✓ | — | — | Overview / Export |

### CRUD Notes

- **Heritage Site** and **Artifact** require full CRUD operations.
- **Multimedia** requires create/upload, read, update and delete operations.
- **iBeacon** requires registration, configuration, assignment and management.
- **Beacon Deployment Location** is managed as part of beacon deployment rather than as a standalone CRUD entity.
- **Translation** requires CRUD operations for multilingual content.
- **Feedback** is created by Visitors and managed/moderated by the Administrator.
- **Analytics** is a read-only reporting operation.
- **Reports** provide a read-only overview and an export operation rather than standard CRUD.

---

## 5. Role and Permission

### 5.1 Role

The system defines the following administrative role for the Admin Web:

| Role | Description |
|---|---|
| `ADMIN` | Heritage Site Administrator |

The Administrator is responsible for managing heritage content, beacon infrastructure, feedback, analytics and reports.

### 5.2 Admin Permissions

| Permission | ADMIN |
|---|:---:|
| Admin Login | ✓ |
| Manage Heritage Sites | ✓ |
| Manage Artifacts | ✓ |
| Manage Multimedia | ✓ |
| Manage iBeacons | ✓ |
| Configure iBeacons | ✓ |
| Assign iBeacons | ✓ |
| Manage Beacon Deployment Location | ✓ |
| Manage Translations | ✓ |
| Moderate Feedback | ✓ |
| View Analytics Dashboard | ✓ |
| View Report Overview | ✓ |
| Export Statistical Reports | ✓ |

---

## 6. Authorization

Admin APIs require:

1. Authentication through the shared Auth module
2. `ADMIN` role authorization

The following route groups require the `ADMIN` role:

| Route group | Description |
|---|---|
| `/api/admin/**` | Content, beacon, translation and feedback management |
| `/api/analytics/**` | Analytics dashboard |
| `/api/reports/**` | Report overview and export |

```text
Admin
  |
  v
Login (shared Auth module)
  |
  v
Authentication
  |
  v
Check ADMIN Role
  |
  +-------------------+
  |                   |
  v                   v
Authorized         Unauthorized
  |                   |
  v                   v
Admin APIs        403 Forbidden
```