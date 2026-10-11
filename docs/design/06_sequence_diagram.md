# 08. Sequence Diagram

## 1. Scope

The sequence diagrams cover the following core Visitor interactions:

- Heritage Site information retrieval
- iBeacon-based Artifact information retrieval
- Artifact Multimedia retrieval

The diagrams focus on the interaction between the Visitor Mobile Application, Backend REST API, PostgreSQL database, and iBeacon infrastructure.

## 2. Participants

| Participant | Responsibility |
|---|---|
| **Visitor** | Uses the mobile application to explore heritage content |
| **Mobile App** | Provides the interface for viewing heritage sites, artifacts, and multimedia content |
| **Backend API** | Provides REST API services and processes requests from the mobile application |
| **PostgreSQL** | Stores heritage site, artifact, multimedia, beacon, and visitor interaction data |
| **iBeacon** | Emits BLE signals detected by the visitor's mobile device |

## 3. Sequence Flows

### 3.1 Heritage Site Information
The Visitor requests heritage site information through the Mobile App. The Mobile App sends a request to the Backend API. The Backend API retrieves the corresponding `HeritageSite` data from PostgreSQL and returns the result to the Mobile App.

**Sequence diagram:** `06_sequence_heritage_site.puml`

### 3.2 iBeacon-Based Artifact Information
The iBeacon emits a BLE signal that is detected by the Mobile App. The Mobile App sends the detected beacon information to the Backend API. The Backend API resolves the beacon and its deployment information, retrieves the assigned `Artifact` data from PostgreSQL, and returns the artifact information to the Mobile App. The visitor interaction is recorded in PostgreSQL for visit history and analytics.

**Sequence diagram:** `06_sequence_artifact.puml`

### 3.3 Multimedia Information
The Visitor requests multimedia resources for an artifact through the Mobile App. The Mobile App sends the request to the Backend API. The Backend API retrieves the associated `Multimedia` resources from PostgreSQL and returns the result to the Mobile App.

**Sequence diagram:** `06_sequence_multimedia.puml`

## 4. Draft API

### 4.1 Heritage Site API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/heritage-sites` | Retrieve all heritage sites |
| `GET` | `/api/heritage-sites/{siteId}` | Retrieve a heritage site by ID |

### 4.2 Artifact API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/heritage-sites/{siteId}/artifacts` | Retrieve artifacts of a heritage site |
| `GET` | `/api/artifacts/{artifactId}` | Retrieve an artifact by ID |

### 4.3 Multimedia API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/artifacts/{artifactId}/multimedia` | Retrieve multimedia resources of an artifact |

## 5. Source Files

| File | Description |
|---|---|
| `06_sequence_heritage_site.puml` | Heritage Site information retrieval sequence |
| `06_sequence_artifact.puml` | iBeacon-based Artifact information retrieval sequence |
| `06_sequence_multimedia.puml` | Artifact Multimedia retrieval sequence |

