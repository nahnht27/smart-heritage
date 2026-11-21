# Sprint 6 — Release and Technical Documentation

Sprint 6 closes the project with release readiness, verified database
backup/restore and a complete as-built architecture package.

## Deliverables

| Task | Document | Summary |
|---|---|---|
| S6-M1-01 | [release-readiness.md](release-readiness.md) | Production-style Compose package, environment/secrets rules, health/log/shutdown behavior, CI gates and known release limitations |
| S6-M1-02 | [database-backup-restore.md](database-backup-restore.md) | Verified PostgreSQL 16 backup/restore round trip, safety rules and acceptance evidence |
| S6-M1-03 | [architecture/README.md](architecture/README.md) | Final architecture, database ERD, Java backend design, API overview, use-case/class/sequence diagrams, ADRs, defense guide and requirements traceability |

## Architecture package

Start at [architecture/README.md](architecture/README.md). It links:

- [System architecture](architecture/system-architecture.md)
- [Database ERD](architecture/database-erd.md)
- [Java backend architecture](architecture/java-backend-architecture.md)
- [API overview](architecture/api-overview.md)
- [Use case diagram](architecture/use-case-diagram.puml)
- [Sequence diagrams](architecture/sequence-diagrams.md)
- [Backend class diagram](architecture/backend-class-diagram.puml)
- [Architecture decisions](architecture/architecture-decisions.md)
- [Java defense guide](architecture/java-defense-guide.md)
- [Requirements traceability](architecture/requirements-traceability.md)

## Status in one paragraph

The repository contains a working modular Spring Boot backend, PostgreSQL schema
managed by Flyway V1–V4, an Admin Web with real CRUD/analytics/CSV functionality,
and a mobile app with real content, multimedia and beacon-resolution flows. The
production Compose stack is packaged and CI-tested on an ephemeral host, but it
has **not** been deployed to real infrastructure. Physical BLE hardware,
real-device multimedia/iOS verification, production TLS/domain, mobile store
signing, and several product features (map, favorites, feedback, translations,
PDF/Excel export, OpenAPI) remain pending or placeholder. See
[requirements-traceability.md](architecture/requirements-traceability.md) for the
exact status of every requirement.
