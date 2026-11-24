# Smart Heritage — Sequence Diagrams

These diagrams describe the behavior implemented at `main` (`6e11c0b`). They
use participant names from the actual classes and paths from the controllers.

## 1. Admin login and protected request

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Web as Admin Web<br/>LoginPage / apiClient
    participant API as AuthController
    participant Svc as AuthService
    participant Users as UserRepository
    participant Enc as BCryptPasswordEncoder
    participant Jwt as JwtTokenProvider

    Admin->>Web: submit username + password
    Web->>API: POST /api/auth/login
    API->>Svc: login(LoginRequest)
    Svc->>Users: findByUsername(username)
    alt user not found
        Svc-->>API: BadCredentialsException
        API-->>Web: 401 ApiResponse.error
    else user found
        Svc->>Enc: matches(raw, passwordHash)
        alt password mismatch
            Svc-->>API: BadCredentialsException
            API-->>Web: 401 ApiResponse.error
        else password valid
            Svc->>Jwt: generateToken(username, roleName)
            Jwt-->>Svc: signed JWT
            Svc-->>API: LoginResponse(accessToken, Bearer, expiresIn, user)
            API-->>Web: 200 ApiResponse.success
            Web->>Web: authStorage.setToken(token)
            Web->>Web: navigate to /dashboard
        end
    end
```

Protected admin request:

```mermaid
sequenceDiagram
    autonumber
    participant Web as Admin Web
    participant Filter as JwtAuthenticationFilter
    participant Provider as JwtTokenProvider
    participant Details as CustomUserDetailsService
    participant Security as SecurityConfig
    participant Ctrl as ArtifactController
    participant Svc as ArtifactService
    participant Repo as ArtifactRepository
    participant DB as PostgreSQL

    Web->>Filter: POST /api/artifacts<br/>Authorization: Bearer <jwt>
    Filter->>Provider: validateToken(token)
    Provider-->>Filter: true / false
    alt valid
        Filter->>Provider: getUsernameFromToken(token)
        Filter->>Details: loadUserByUsername(username)
        Details-->>Filter: UserDetails + ROLE_ADMIN
        Filter->>Filter: SecurityContextHolder.setAuthentication(...)
        Filter->>Security: continue chain
        Security->>Security: route match + @PreAuthorize hasRole('ADMIN')
        Security->>Ctrl: dispatch
        Ctrl->>Ctrl: @Valid ArtifactRequest
        Ctrl->>Svc: createArtifact(entity, siteId)
        Svc->>Repo: findById site / save artifact
        Repo->>DB: SQL transaction
        DB-->>Repo: persisted row
        Repo-->>Svc: Artifact
        Svc-->>Ctrl: Artifact
        Ctrl-->>Web: 201 ApiResponse.success(ArtifactResponse)
    else invalid or missing
        Filter->>Security: continue as anonymous
        Security-->>Web: 401 or 403 via SecurityErrorHandler
    end
```

## 2. Public content browsing

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant App as Mobile screen<br/>home / artifact_list / artifact_detail
    participant ApiSvc as heritageApi
    participant Client as mobile apiClient
    participant Ctrl as HeritageSiteController /<br/>ArtifactController / MultimediaController
    participant Svc as Domain service
    participant Repo as Repository
    participant DB as PostgreSQL

    Visitor->>App: open screen
    App->>ApiSvc: getHeritageSites / getArtifacts / getMultimedia
    ApiSvc->>Client: GET /api/...
    Client->>Ctrl: HTTP GET, no token required
    Ctrl->>Svc: search/list/get
    Svc->>Repo: specification / findById / findByArtifact
    Repo->>DB: SELECT
    DB-->>Repo: rows
    Repo-->>Svc: entities
    Svc-->>Ctrl: entities
    Ctrl-->>Client: 200 ApiResponse.success(data)
    Client->>Client: unwrap envelope
    Client-->>ApiSvc: { data, error, status, ok }
    ApiSvc-->>App: mapped domain objects
    App-->>Visitor: render sites / artifacts / media
```

The mobile client attaches its Bearer token when one exists, but these GET
routes are `permitAll`; an expired token does not block public content.

## 3. Beacon detection, resolution and interaction recording

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant Beacon as iBeacon device
    participant Hook as useBeaconDiscovery
    participant Kit as react-native-beacon-kit
    participant Trig as BeaconTriggerController
    participant BApi as beaconApi
    participant BCtrl as BeaconController
    participant BSvc as BeaconService
    participant BRepo as BeaconRepository
    participant IApi as interactionApi
    participant ICtrl as VisitorInteractionController
    participant ISvc as VisitorInteractionService
    participant DB as PostgreSQL

    Visitor->>Hook: enable beacon scanning
    Hook->>Kit: request permissions / configure / startRanging
    Beacon-->>Kit: BLE advertisement (uuid, major, minor, rssi)
    Kit-->>Hook: onBeaconsRanged event
    Hook->>Trig: observe(reading)
    Trig-->>Hook: trigger only after entry delay<br/>and outside cooldown
    Hook->>BApi: resolve(identity)
    BApi->>BCtrl: GET /api/beacons/resolve?uuid&major&minor
    BCtrl->>BSvc: resolveBeacon(uuid, major, minor)
    BSvc->>BRepo: findForResolutionByIdentity(...)
    BRepo->>DB: SELECT beacon JOIN artifact JOIN site
    DB-->>BRepo: row
    BRepo-->>BSvc: enabled Beacon
    BSvc-->>BCtrl: BeaconResponse
    BCtrl-->>BApi: 200 ApiResponse.success
    BApi-->>Hook: ResolvedBeacon or error
    alt artifact mapped
        Hook->>Hook: show banner for 8 s
        Hook->>IApi: recordInteraction(BEACON_TRIGGER, beaconId)
        IApi->>ICtrl: POST /api/interactions
        ICtrl->>ISvc: createInteraction(username?, request)
        ISvc->>DB: idempotency check + insert
        DB-->>ISvc: interaction row
        ISvc-->>ICtrl: InteractionCreationResult(created=true)
        ICtrl-->>IApi: 201 ApiResponse.success
    else disabled / unknown / unmapped
        BApi-->>Hook: 404 or artifactId = null
        Hook->>Hook: show status message, no interaction
    end
```

The debounce thresholds are mobile constants:
`RSSI >= -75`, entry delay 2 s, exit delay 3 s, stale delay 3 s and a 60 s
cooldown per beacon identity. Android requires location permission (and
Bluetooth scan/connect on API 31+); iOS requires location and Bluetooth.

## 4. Idempotent interaction recording and race handling

```mermaid
sequenceDiagram
    autonumber
    participant App as Mobile app
    participant Ctrl as VisitorInteractionController
    participant Svc as VisitorInteractionService
    participant Repo as VisitorInteractionRepository
    participant DB as PostgreSQL
    participant Handler as GlobalExceptionHandler

    App->>Ctrl: POST /api/interactions (eventId = E)
    Ctrl->>Svc: createInteraction(username, request)
    Svc->>Svc: validateTimes(startedAt, endedAt)
    Svc->>Repo: findByEventId(E)

    alt event exists and identity matches
        Repo-->>Svc: existing row
        Svc-->>Ctrl: result(existing, created=false)
        Ctrl-->>App: 200 "already recorded"
    else event exists and identity differs
        Repo-->>Svc: existing row
        Svc-->>Ctrl: DuplicateResourceException
        Ctrl-->>Handler: exception
        Handler-->>App: 409 "eventId has already been used"
    else event does not exist
        Repo-->>Svc: empty
        Svc->>Svc: resolve user (optional), artifact, beacon
        Svc->>Repo: save(new interaction)
        Repo->>DB: INSERT
        alt insert succeeds
            DB-->>Repo: row
            Repo-->>Svc: saved entity
            Svc-->>Ctrl: result(saved, created=true)
            Ctrl-->>App: 201 "Interaction recorded successfully"
        else concurrent duplicate hits uk_visitor_interaction_event_id
            DB-->>Repo: DataIntegrityViolationException
            Repo-->>Svc: exception
            Svc-->>Handler: exception
            Handler->>Handler: normalize message and match constraint name
            Handler-->>App: 409 "The submitted eventId has already been recorded."
        end
    end
```

Identity for replay detection:

- authenticated event: same username, visitor ID may differ after reinstall;
- anonymous event: no user and the same `visitorId`.

The database unique constraint is the authoritative guard. The service pre-check
only provides a friendly path and avoids unnecessary insert attempts.

## 5. Analytics summary and CSV export

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Page as DashboardPage
    participant AnSvc as analyticsService
    participant Client as apiClient
    participant Ctrl as VisitorInteractionController
    participant Svc as VisitorInteractionService
    participant Repo as VisitorInteractionRepository
    participant DB as PostgreSQL
    participant Csv as analyticsCsv.ts

    Admin->>Page: choose range / apply
    Page->>Page: convert inclusive dates to [from, to)<br/>and reject > 90 days
    Page->>AnSvc: getInteractionSummary({ from, to })
    AnSvc->>Client: GET /api/analytics/interactions/summary
    Client->>Ctrl: Bearer ADMIN
    Ctrl->>Ctrl: validateRange(from, to)
    Ctrl->>Svc: getSummary(from, to)
    Svc->>Repo: countInPeriod / unique visitors /<br/>by type / popular artifacts
    Repo->>DB: aggregate SQL
    DB-->>Repo: counts
    Repo-->>Svc: rows
    Svc-->>Ctrl: InteractionSummaryResponse
    Ctrl-->>Client: 200 ApiResponse.success
    Client-->>AnSvc: payload
    AnSvc-->>Page: normalized summary
    Page-->>Admin: KPI cards + breakdown + top 10

    Admin->>Page: Export CSV
    Page->>Csv: exportAnalyticsSummaryToCsv(summary)
    Csv->>Csv: escape cells, prefix formula starts,<br/>add UTF-8 BOM, build Blob
    Csv-->>Admin: browser download
```

The CSV is generated entirely in the browser from the already-loaded summary.
No backend report endpoint is called, and no PDF/Excel export exists.

## 6. Admin delete with dependent-row guard

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Web as Admin Web
    participant Ctrl as ArtifactController
    participant Svc as ArtifactService
    participant ARepo as ArtifactRepository
    participant MRepo as MultimediaRepository
    participant IRepo as VisitorInteractionRepository
    participant BRepo as BeaconRepository
    participant DB as PostgreSQL

    Admin->>Web: delete artifact
    Web->>Ctrl: DELETE /api/artifacts/{id} (ADMIN)
    Ctrl->>Svc: deleteArtifact(id)
    Svc->>ARepo: findById(id)
    alt missing
        ARepo-->>Svc: empty
        Svc-->>Ctrl: ResourceNotFoundException
        Ctrl-->>Web: 404
    else exists
        Svc->>MRepo: existsByArtifact_ArtifactId(id)
        alt multimedia exists
            Svc-->>Ctrl: ResourceConflictException
            Ctrl-->>Web: 409 "associated multimedia"
        else
            Svc->>IRepo: existsByArtifact_ArtifactId(id)
            alt interaction history exists
                Svc-->>Ctrl: ResourceConflictException
                Ctrl-->>Web: 409 "visitor interaction history"
            else
                Svc->>BRepo: existsByArtifact_ArtifactId(id)
                alt beacon exists
                    Svc-->>Ctrl: ResourceConflictException
                    Ctrl-->>Web: 409 "associated with one or more beacons"
                else
                    Svc->>ARepo: delete(artifact)
                    ARepo->>DB: DELETE
                    Svc-->>Ctrl: void
                    Ctrl-->>Web: 200 ApiResponse.success
                end
            end
        end
    end
```

Heritage-site deletion follows the same pattern with one guard:
`ArtifactRepository.existsByHeritageSite_SiteId`.

Beacon deletion has no guard: `visitor_interaction.beacon_id` is
`ON DELETE SET NULL`, so analytics history is preserved.

## 7. Startup, Flyway and schema validation

```mermaid
sequenceDiagram
    autonumber
    participant Boot as Spring Boot
    participant Flyway as Flyway 10.22
    participant DB as PostgreSQL
    participant Hibernate as Hibernate
    participant App as BackendApplication

    Boot->>Flyway: start with datasource
    Flyway->>DB: read flyway_schema_history
    alt fresh database
        Flyway->>DB: apply V1 → V2 → V3 → V4
    else existing history
        Flyway->>DB: validate checksums and pending versions
        Flyway->>DB: apply only pending migrations
    else non-empty without history
        Flyway-->>Boot: fail (baseline-on-migrate=false)
        Note over Boot: operator must classify and baseline explicitly
    end
    Flyway-->>Boot: migration complete
    Boot->>Hibernate: ddl-auto=validate
    Hibernate->>DB: inspect schema metadata
    alt schema matches entities
        Hibernate-->>Boot: OK
        Boot->>App: start web server
    else mismatch
        Hibernate-->>Boot: validation error
        Boot-->>Boot: fail fast, no schema mutation
    end
```

This sequence is the reason a failed deployment is visible rather than silently
"fixed" by Hibernate.

## 8. Related documents

- [System architecture](system-architecture.md)
- [Java backend architecture](java-backend-architecture.md)
- [API overview](api-overview.md)
- [Database ERD](database-erd.md)
- [Requirements traceability](requirements-traceability.md)
