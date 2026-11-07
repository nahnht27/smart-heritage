# 08. ERD / Database Design

## 1. Implemented entities (backend migrations)

Các entity đang được triển khai trong backend:

- `Role`
- `User`
- `HeritageSite`
- `Artifact`
- `Multimedia`
- `Beacon` (Wave 4)
- `VisitorInteraction`

Các entity trong thiết kế ban đầu nhưng chưa được implement:

- `Language`
- `ArtifactTranslation`
- `BeaconDeploymentLocation`
- `Favorite`
- `Feedback`

## 2. Relationships (implemented)

- `Role` – `User`: one-to-many.
- `HeritageSite` – `Artifact`: one-to-many.
- `Artifact` – `Multimedia`: one-to-many.
- `Artifact` – `Beacon`: one-to-many; `beacon.artifact_id` nullable.
- `User` – `VisitorInteraction`: one-to-many; `visitor_interaction.user_id` nullable for anonymous visitors.
- `Artifact` – `VisitorInteraction`: one-to-many.
- `Beacon` – `VisitorInteraction`: one-to-many; `visitor_interaction.beacon_id` nullable, `ON DELETE SET NULL`.

## 3. Constraints

- Mỗi entity có primary key.
- Foreign key giữ referential integrity.
- `user.username`, `user.email`, `role.name` unique.
- `visitor_interaction.event_id` unique để idempotency.
- `beacon` unique trên `(proximity_uuid, major, minor)`.
- `beacon.major` và `beacon.minor` nằm trong `0..65535`.
- `visitor_interaction.user_id` nullable để hỗ trợ khách ẩn danh.
- `visitor_interaction.visitor_id` là UUID bắt buộc.
- `visitor_interaction.beacon_id` nullable; xóa beacon không xóa interaction.

## 4. Wave 4 schema

Nguồn thực tế:

- `backend/src/main/resources/db/migration/V1__baseline_schema.sql`
- `backend/src/main/resources/db/migration/V2__visitor_interaction_anonymous_visitor.sql`
- `backend/src/main/resources/db/migration/V3__beacon_management.sql`

### Beacon

| Column | Type | Constraints |
|---|---|---|
| `beacon_id` | integer | PK, sequence |
| `name` | varchar(255) | NOT NULL |
| `proximity_uuid` | uuid | NOT NULL |
| `major` | integer | NOT NULL, check `0..65535` |
| `minor` | integer | NOT NULL, check `0..65535` |
| `enabled` | boolean | NOT NULL, default `true` |
| `artifact_id` | integer | FK `artifact.artifact_id`, nullable |

Indexes/constraints:

- `uk_beacon_identity UNIQUE (proximity_uuid, major, minor)`
- `idx_beacon_artifact_id`
- `ck_beacon_major_range`
- `ck_beacon_minor_range`

### VisitorInteraction (relevant columns)

| Column | Type | Constraints |
|---|---|---|
| `interaction_id` | integer | PK, sequence |
| `event_id` | uuid | NOT NULL, unique |
| `visitor_id` | uuid | NOT NULL |
| `user_id` | integer | FK `user.user_id`, nullable |
| `artifact_id` | integer | FK `artifact.artifact_id`, NOT NULL |
| `beacon_id` | integer | FK `beacon.beacon_id`, nullable, `ON DELETE SET NULL` |
| `interaction_type` | varchar(50) | NOT NULL |
| `language_code` | varchar(16) | NOT NULL |
| `started_at` | timestamptz | NOT NULL |
| `ended_at` | timestamptz | nullable |
| `duration_seconds` | bigint | nullable, backend-computed |
| `interacted_at` | timestamptz | NOT NULL |

## 5. DBML source

File `08_erd_database_design.dbml` chứa schema chi tiết. Các bảng chưa implement được giữ lại như thiết kế tương lai; phần Wave 4 (`Beacon`, `VisitorInteraction`) phản ánh migration thực tế.
