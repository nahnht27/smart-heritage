# 07. Class Diagram

## 1. Purpose and Scope

This is the **domain class diagram** of Smart Heritage. It provides an object-oriented view of the core system data and serves as a reference for designing Java entity classes.

The diagram shows classes, attributes, Java data types, associations, and UML multiplicities. Operations are not included because Sprint 1 does not cover business logic.

The classes are grouped according to the backend modules defined in `04_system_architecture.md`.

## 2. Main Classes

| Module | Class | Description |
|---|---|---|
| Auth & User | `Role` | Defines the access role of a user |
| Auth & User | `User` | Stores a Visitor or Administrator account |
| Heritage Content | `Language` | Stores a supported language |
| Heritage Content | `HeritageSite` | Represents a historical or cultural heritage site |
| Heritage Content | `Artifact` | Represents a historical artifact within a heritage site |
| Heritage Content | `Multimedia` | Stores image, video, or audio resources associated with an artifact |
| Heritage Content | `ArtifactTranslation` | Stores multilingual titles and descriptions of an artifact |
| Beacon & Visitor Interaction | `BeaconDeploymentLocation` | Represents a location where iBeacons are deployed |
| Beacon & Visitor Interaction | `iBeacon` | Represents a physical BLE beacon device |
| Beacon & Visitor Interaction | `Favorite` | Records an artifact saved by a visitor |
| Beacon & Visitor Interaction | `VisitorInteraction` | Records a visitor interaction with an artifact |
| Feedback | `Feedback` | Stores an artifact rating and visitor comment |

## 3. Class Attributes

| Class | Attributes |
|---|---|
| `Role` | `- roleId : Integer`, `- name : String` |
| `Language` | `- languageId : Integer`, `- code : String`, `- name : String` |
| `User` | `- userId : Integer`, `- username : String`, `- email : String`, `- passwordHash : String` |
| `HeritageSite` | `- siteId : Integer`, `- name : String`, `- description : String`, `- address : String`, `- latitude : BigDecimal`, `- longitude : BigDecimal` |
| `Artifact` | `- artifactId : Integer`, `- name : String`, `- description : String` |
| `Multimedia` | `- multimediaId : Integer`, `- type : String`, `- title : String`, `- url : String` |
| `ArtifactTranslation` | `- translationId : Integer`, `- title : String`, `- description : String` |
| `BeaconDeploymentLocation` | `- locationId : Integer`, `- name : String`, `- description : String`, `- latitude : BigDecimal`, `- longitude : BigDecimal` |
| `iBeacon` | `- beaconId : Integer`, `- uuid : String`, `- major : Integer`, `- minor : Integer`, `- status : String` |
| `Favorite` | `- favoriteId : Integer`, `- createdAt : LocalDateTime` |
| `VisitorInteraction` | `- interactionId : Integer`, `- interactionType : String`, `- interactedAt : LocalDateTime` |
| `Feedback` | `- feedbackId : Integer`, `- rating : Integer`, `- comment : String`, `- status : String`, `- createdAt : LocalDateTime` |

## 4. Associations

| # | Class A | Mult. A | Association | Mult. B | Class B | Kind |
|---|---|---:|---|---:|---|---|
| 1 | `Role` | 1 | has | 0..* | `User` | Association |
| 2 | `User` | 0..* | prefers | 0..1 | `Language` | Association |
| 3 | `HeritageSite` | 1 | contains | 0..* | `Artifact` | Association |
| 4 | `Artifact` | 1 | has | 0..* | `Multimedia` | Association |
| 5 | `Artifact` | 1 | has | 0..* | `ArtifactTranslation` | Association |
| 6 | `Language` | 1 | written in | 0..* | `ArtifactTranslation` | Association |
| 7 | `HeritageSite` | 1 | has | 0..* | `BeaconDeploymentLocation` | Association |
| 8 | `BeaconDeploymentLocation` | 1 | hosts | 0..* | `iBeacon` | Association |
| 9 | `Artifact` | 0..* | assigned | 0..1 | `iBeacon` | Association |
| 10 | `User` | 1 | saves | 0..* | `Favorite` | Association |
| 11 | `Artifact` | 1 | saved as | 0..* | `Favorite` | Association |
| 12 | `User` | 1 | performs | 0..* | `VisitorInteraction` | Association |
| 13 | `Artifact` | 1 | target of | 0..* | `VisitorInteraction` | Association |
| 14 | `iBeacon` | 0..1 | triggers | 0..* | `VisitorInteraction` | Association |
| 15 | `User` | 1 | writes | 0..* | `Feedback` | Association |
| 16 | `Artifact` | 1 | receives | 0..* | `Feedback` | Association |

For association 2, a `User` may have no preferred language or one preferred language. A `Language` may be preferred by zero or more users.

For association 9, an `Artifact` may have zero or more assigned iBeacons, while an `iBeacon` may be assigned to zero or one Artifact. An iBeacon always belongs to a `BeaconDeploymentLocation`.

For association 14, an `iBeacon` may be associated with zero or more visitor interactions, while a `VisitorInteraction` may reference zero or one iBeacon.

`Favorite` is modeled as a class because it contains its own attribute, `createdAt`. It represents the relationship between `User` and `Artifact`.

## 5. Relationship with the ERD

The Class Diagram and ERD represent the same core data model from different perspectives.

| Aspect | Class Diagram | ERD |
|---|---|---|
| Elements | Classes | Tables |
| Attributes | Java attributes and data types | Columns and database data types |
| Relationships | UML associations and multiplicities | Foreign key relationships |
| Foreign keys | Represented through associations | Represented by FK columns |
| Many-to-many relationships | Represented through relationship classes such as `Favorite` | Represented through junction tables |
| Constraints | UML-level multiplicities | PK, FK, unique, and not-null constraints |

The Class Diagram focuses on the Java domain model, while the ERD focuses on the relational database structure.

The main database-to-Java type mappings are:
- `int` → `Integer`
- `varchar` → `String`
- `text` → `String`
- `decimal` → `BigDecimal`
- `timestamp` → `LocalDateTime`

## 6. PlantUML Source
Class diagram source in `07_class_diagram.puml`.

