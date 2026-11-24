# Sprint 6 — Architecture Documentation

This directory is the final as-built architecture and technical documentation for
Smart Heritage at the end of Sprint 6. It was written from the code on `main`
(`6e11c0b`), not from earlier design drafts.

## Documents

| Document | Purpose |
|---|---|
| [system-architecture.md](system-architecture.md) | Context, containers, components, request lifecycle, deployment topology, security and operational behavior |
| [database-erd.md](database-erd.md) | Physical ERD, data dictionary, constraints, indexes, migration history and integrity rules |
| [java-backend-architecture.md](java-backend-architecture.md) | Java package layout, layering, JPA/query strategy, transactions, security, validation and testing |
| [api-overview.md](api-overview.md) | Endpoint contract, permissions, request/response shapes, error catalog and client notes |
| [use-case-diagram.puml](use-case-diagram.puml) | PlantUML use-case diagram with implemented vs placeholder scope |
| [sequence-diagrams.md](sequence-diagrams.md) | Login, content browsing, beacon flow, idempotency, analytics/CSV, delete guard and startup |
| [backend-class-diagram.puml](backend-class-diagram.puml) | PlantUML class diagram for entities, repositories, services, controllers, security and DTOs |
| [architecture-decisions.md](architecture-decisions.md) | ADR-001 … ADR-015 with context, decision and consequences |
| [java-defense-guide.md](java-defense-guide.md) | Vietnamese defense guide with English terminology and likely Q&A |
| [requirements-traceability.md](requirements-traceability.md) | FR/NFR matrix with honest implemented, partial, placeholder, pending and not-measured status |

## How to read the status labels

The codebase intentionally contains placeholders and pending hardware work. The
traceability matrix uses:

- **IMPLEMENTED** — working code path, with tests/CI evidence where available;
- **PARTIAL** — some behavior exists but a requirement or platform is incomplete;
- **PLACEHOLDER** — screen/stub without real behavior or data;
- **NOT IMPLEMENTED** — no behavior exists;
- **PENDING VERIFICATION** — code exists but physical-device/production evidence
  is missing;
- **NOT MEASURED** — non-functional target has no benchmark evidence.

Do not describe a `PARTIAL`, `PLACEHOLDER`, `NOT IMPLEMENTED` or `PENDING`
item as complete in a demo or report.

## Rendering the diagrams

### PlantUML

The `.puml` files can be rendered with:

```bash
# VS Code: PlantUML extension, or PlantUML CLI
plantuml -tpng docs/sprint-6/architecture/use-case-diagram.puml
plantuml -tpng docs/sprint-6/architecture/backend-class-diagram.puml
```

The diagrams use only standard PlantUML syntax (packages, actors, use cases,
classes, notes, legend). No remote includes are required.

### Mermaid

Mermaid blocks in the Markdown files render on GitHub/GitLab and in editors with
Mermaid support. They use `flowchart`, `sequenceDiagram` and `erDiagram` types
only.

## Scope and non-goals

In scope for S6-M1-03:

- documentation and diagram sources only;
- accurate description of the current backend, database, clients and deployment
  packaging;
- explicit recording of limitations and pending verification.

Out of scope:

- new application features, API contract changes, schema changes or refactors;
- claiming a production deployment;
- claiming physical-beacon, real-device media, iOS or store-signing verification.

## Related Sprint 6 documents

- [Release & deployment readiness](../release-readiness.md)
- [Database backup/restore acceptance](../database-backup-restore.md)

## Source-of-truth order

When documents disagree, use this order:

1. Flyway SQL and PostgreSQL constraints;
2. Java entities and repositories;
3. controllers, services and DTOs;
4. client code;
5. prose documentation.

If a future change alters behavior, update these documents in the same change
set as the code. Do not edit applied Flyway migrations.
