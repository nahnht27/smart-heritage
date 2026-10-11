# 08. ERD / Database Design

## 1. Main Entities
- Role
- User
- HeritageSite
- Artifact
- Multimedia
- Language
- ArtifactTranslation
- BeaconDeploymentLocation
- iBeacon
- Favorite
- VisitorInteraction
- Feedback

## 2. Entity Relationships
- Role – User: One-to-Many
- Language – User: One-to-Many
- HeritageSite – Artifact: One-to-Many
- Artifact – Multimedia: One-to-Many
- Artifact – ArtifactTranslation: One-to-Many
- Language – ArtifactTranslation: One-to-Many
- HeritageSite – BeaconDeploymentLocation: One-to-Many
- BeaconDeploymentLocation – iBeacon: One-to-Many
- Artifact – iBeacon: One-to-Many
- User – Favorite: One-to-Many
- Artifact – Favorite: One-to-Many
- User – VisitorInteraction: One-to-Many
- Artifact – VisitorInteraction: One-to-Many
- iBeacon – VisitorInteraction: One-to-Many
- User – Feedback: One-to-Many
- Artifact – Feedback: One-to-Many

## 3. Constraints
- Each entity has a primary key.
- Foreign keys maintain referential integrity between related entities.
- Each User is associated with a Role.
- Each User may have a preferred Language.
- Each Artifact belongs to a HeritageSite.
- Each Multimedia resource belongs to an Artifact.
- Each ArtifactTranslation belongs to an Artifact and a Language.
- Each BeaconDeploymentLocation belongs to a HeritageSite.
- Each iBeacon belongs to a BeaconDeploymentLocation and may be assigned to an Artifact.
- Each Favorite references a User and an Artifact.
- Each VisitorInteraction references a User and an Artifact and may reference an iBeacon.
- Each Feedback references a User and an Artifact.
- Duplicate favorites for the same User and Artifact are prevented.
- Duplicate translations for the same Artifact and Language are prevented.

## 4. Database Schema (Source)
- The detailed database schema is represented in `08_erd_database_design.dbml`