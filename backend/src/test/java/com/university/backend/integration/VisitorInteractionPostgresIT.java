package com.university.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.dto.LanguageCountResponse;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.repository.VisitorInteractionRepository;
import com.university.backend.service.VisitorInteractionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("postgres-test")
class VisitorInteractionPostgresIT {
    private static final UUID VISITOR_ONE =
            UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID VISITOR_TWO =
            UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final UUID VISITOR_THREE =
            UUID.fromString("33333333-3333-4333-8333-333333333333");
    private static final String PASSWORD = "TestPass123!";
    private static final Instant BASE_TIME = Instant.parse("2026-10-20T10:00:00Z");

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private VisitorInteractionRepository interactionRepository;

    @Autowired
    private VisitorInteractionService interactionService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private int artifactId;
    private int visitorUserId;
    private int adminUserId;
    private String visitorToken;
    private String adminToken;

    @BeforeEach
    void setUpPostgresFixtures() throws Exception {
        resetDatabase();

        int visitorRoleId = insertRole("VISITOR");
        int adminRoleId = insertRole("ADMIN");
        visitorUserId = createUser(visitorRoleId, "postgres_visitor");
        adminUserId = createUser(adminRoleId, "postgres_admin");
        artifactId = createArtifact();

        visitorToken = login("postgres_visitor");
        adminToken = login("postgres_admin");
    }

    @Test
    void schemaUsesCurrentColumnsAndFlywayHistory() {
        Integer nullableUserId = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'visitor_interaction'
                  and column_name = 'user_id'
                  and is_nullable = 'YES'
                """, Integer.class);
        assertEquals(1, nullableUserId);

        String visitorType = jdbcTemplate.queryForObject("""
                select data_type
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'visitor_interaction'
                  and column_name = 'visitor_id'
                """, String.class);
        assertEquals("uuid", visitorType);

        Integer appliedV2 = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version = '2' and success = true
                """, Integer.class);
        assertEquals(1, appliedV2);

        Integer uniqueEventConstraint = jdbcTemplate.queryForObject("""
                select count(*)
                from pg_constraint
                where conname = 'uk_visitor_interaction_event_id'
                  and contype = 'u'
                """, Integer.class);
        assertEquals(1, uniqueEventConstraint);

        Integer appliedV3 = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version = '3' and success = true
                """, Integer.class);
        assertEquals(1, appliedV3);

        Integer appliedV4 = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version = '4' and success = true
                """, Integer.class);
        assertEquals(1, appliedV4);

        Integer beaconIdentityConstraint = jdbcTemplate.queryForObject("""
                select count(*)
                from pg_constraint
                where conname = 'uk_beacon_identity'
                  and contype = 'u'
                """, Integer.class);
        assertEquals(1, beaconIdentityConstraint);

        String beaconIdType = jdbcTemplate.queryForObject("""
                select data_type
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'visitor_interaction'
                  and column_name = 'beacon_id'
                """, String.class);
        assertEquals("integer", beaconIdType);

        Integer analyticsIndexes = jdbcTemplate.queryForObject("""
                select count(*)
                from pg_indexes
                where schemaname = 'public'
                  and tablename = 'visitor_interaction'
                  and indexname in (
                      'idx_visitor_interaction_interacted_at',
                      'idx_visitor_interaction_visitor_id'
                  )
                """, Integer.class);
        assertEquals(2, analyticsIndexes);
    }

    @Test
    void persistsAuthenticatedInteractionWithPrincipalAndIgnoresClientUserId() throws Exception {
        UUID eventId = UUID.randomUUID();
        String body = payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), adminUserId);

        postInteraction(visitorToken, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.eventId").value(eventId.toString()))
                .andExpect(jsonPath("$.data.durationSeconds").value(30));

        Map<String, Object> stored = jdbcTemplate.queryForMap("""
                select user_id, visitor_id, artifact_id, duration_seconds
                from visitor_interaction
                where event_id = ?::uuid
                """, eventId.toString());

        assertEquals(visitorUserId, ((Number) stored.get("user_id")).intValue());
        assertEquals(VISITOR_ONE, stored.get("visitor_id"));
        assertEquals(artifactId, ((Number) stored.get("artifact_id")).intValue());
        assertEquals(30L, ((Number) stored.get("duration_seconds")).longValue());
        assertEquals(1L, countByEventId(eventId));
    }

    @Test
    void persistsAnonymousInteractionWithNullableUserId() throws Exception {
        UUID eventId = UUID.randomUUID();
        String body = payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), null);

        postInteraction(null, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.eventId").value(eventId.toString()));

        Map<String, Object> stored = jdbcTemplate.queryForMap("""
                select user_id, visitor_id
                from visitor_interaction
                where event_id = ?::uuid
                """, eventId.toString());

        assertNull(stored.get("user_id"));
        assertEquals(VISITOR_ONE, stored.get("visitor_id"));
    }

    @Test
    void rejectsUnknownArtifactWithoutPersisting() throws Exception {
        UUID eventId = UUID.randomUUID();
        CreateInteractionRequest request = viewRequest(eventId, VISITOR_ONE, BASE_TIME);
        request.setArtifactId(Integer.MAX_VALUE);

        postInteraction(visitorToken, payload(request, null))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));

        assertEquals(0L, countByEventId(eventId));
    }

    @Test
    void databaseRejectsInvalidArtifactForeignKey() {
        UUID eventId = UUID.randomUUID();

        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("""
                        insert into visitor_interaction
                            (event_id, visitor_id, artifact_id, interaction_type,
                             language_code, started_at, ended_at, duration_seconds,
                             interacted_at)
                        values (?::uuid, ?::uuid, ?, 'VIEW', 'vi', ?, ?, 30, ?)
                        """,
                        eventId.toString(),
                        VISITOR_ONE.toString(),
                        Integer.MAX_VALUE,
                        Timestamp.from(BASE_TIME),
                        Timestamp.from(BASE_TIME.plusSeconds(30)),
                        Timestamp.from(BASE_TIME)));

        assertEquals(0L, countByEventId(eventId));
    }

    @Test
    void authenticatedRetryAcceptsChangedVisitorId() throws Exception {
        UUID eventId = UUID.randomUUID();

        MvcResult first = postInteraction(
                visitorToken,
                payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), null))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult retry = postInteraction(
                visitorToken,
                payload(viewRequest(eventId, VISITOR_TWO, BASE_TIME), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message")
                        .value("Interaction event was already recorded"))
                .andReturn();

        int firstId = objectMapper.readTree(first.getResponse().getContentAsString())
                .path("data").path("interactionId").asInt();
        int retryId = objectMapper.readTree(retry.getResponse().getContentAsString())
                .path("data").path("interactionId").asInt();

        assertEquals(firstId, retryId);
        assertEquals(1L, countByEventId(eventId));
        assertEquals(VISITOR_ONE, jdbcTemplate.queryForObject("""
                select visitor_id
                from visitor_interaction
                where event_id = ?::uuid
                """, UUID.class, eventId.toString()));
    }

    @Test
    void authenticatedRetryRejectsDifferentUser() throws Exception {
        UUID eventId = UUID.randomUUID();
        String body = payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), null);

        postInteraction(visitorToken, body).andExpect(status().isCreated());
        postInteraction(adminToken, body)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        assertEquals(1L, countByEventId(eventId));
    }

    @Test
    void anonymousRetryRequiresSameVisitorId() throws Exception {
        UUID eventId = UUID.randomUUID();

        postInteraction(null, payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), null))
                .andExpect(status().isCreated());
        postInteraction(null, payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), null))
                .andExpect(status().isOk());
        postInteraction(null, payload(viewRequest(eventId, VISITOR_TWO, BASE_TIME), null))
                .andExpect(status().isConflict());

        assertEquals(1L, countByEventId(eventId));
    }

    @Test
    void concurrentDuplicateCreatesExactlyOneRecord() throws Exception {
        UUID eventId = UUID.randomUUID();
        String body = payload(viewRequest(eventId, VISITOR_ONE, BASE_TIME), null);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Callable<Integer> requestTask = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent start timeout");
                }
                return postInteraction(visitorToken, body)
                        .andReturn()
                        .getResponse()
                        .getStatus();
            };

            Future<Integer> first = executor.submit(requestTask);
            Future<Integer> second = executor.submit(requestTask);

            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();

            List<Integer> statuses = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS));

            assertEquals(1L, statuses.stream().filter(code -> code == 201).count());
            assertTrue(statuses.stream().allMatch(code ->
                    code == 201 || code == 200 || code == 409));
            assertEquals(1L, countByEventId(eventId));
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void calculatesDurationAndPersistsIt() throws Exception {
        UUID eventId = UUID.randomUUID();
        CreateInteractionRequest request = request(
                eventId,
                VISITOR_ONE,
                "VIEW",
                "vi",
                Instant.parse("2026-11-01T10:00:00Z"),
                Instant.parse("2026-11-01T10:02:05Z"),
                Instant.parse("2026-11-01T10:00:00Z"));

        postInteraction(visitorToken, payload(request, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.durationSeconds").value(125));

        assertEquals(125L, jdbcTemplate.queryForObject("""
                select duration_seconds
                from visitor_interaction
                where event_id = ?::uuid
                """, Long.class, eventId.toString()));
    }

    @Test
    void handlesMissingEndedAtWithNullDuration() throws Exception {
        UUID eventId = UUID.randomUUID();
        CreateInteractionRequest request = request(
                eventId,
                VISITOR_ONE,
                "VIEW",
                "vi",
                BASE_TIME,
                null,
                BASE_TIME);

        postInteraction(visitorToken, payload(request, null))
                .andExpect(status().isCreated());

        assertNull(jdbcTemplate.queryForObject("""
                select duration_seconds
                from visitor_interaction
                where event_id = ?::uuid
                """, Long.class, eventId.toString()));
    }

    @Test
    void rejectsEndBeforeStartWithoutPersisting() throws Exception {
        UUID eventId = UUID.randomUUID();
        CreateInteractionRequest request = request(
                eventId,
                VISITOR_ONE,
                "VIEW",
                "vi",
                BASE_TIME,
                BASE_TIME.minusSeconds(1),
                BASE_TIME);

        postInteraction(visitorToken, payload(request, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        assertEquals(0L, countByEventId(eventId));
    }

    @Test
    void summaryCountsDistinctVisitorIdsNotUsers() {
        Instant from = Instant.parse("2026-10-20T00:00:00Z");
        Instant to = Instant.parse("2026-10-21T00:00:00Z");

        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "VIEW", "vi", from.plusSeconds(3600), from.plusSeconds(3630), from.plusSeconds(3600));
        insertInteraction(UUID.randomUUID(), VISITOR_TWO, visitorUserId,
                "VIEW", "vi", from.plusSeconds(7200), from.plusSeconds(7230), from.plusSeconds(7200));

        InteractionSummaryResponse summary = interactionService.getSummary(from, to);

        assertEquals(2L, summary.totalInteractions());
        assertEquals(2L, summary.uniqueVisitors());
    }

    @Test
    void dailyTimeSeriesFillsMissingUtcDays() throws Exception {
        Instant from = Instant.parse("2028-02-28T00:00:00Z");
        Instant to = Instant.parse("2028-03-02T00:00:00Z");

        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "VIEW", "vi", from.plusSeconds(3600), from.plusSeconds(3630), from.plusSeconds(3600));
        insertInteraction(UUID.randomUUID(), VISITOR_TWO, visitorUserId,
                "VIEW", "vi", from.plusSeconds(7200), from.plusSeconds(7230), from.plusSeconds(7200));
        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "AUDIO_PLAY", "vi",
                Instant.parse("2028-03-01T12:00:00Z"),
                Instant.parse("2028-03-01T12:00:30Z"),
                Instant.parse("2028-03-01T12:00:00Z"));

        mockMvc.perform(get("/api/analytics/interactions/timeseries")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].date").value("2028-02-28"))
                .andExpect(jsonPath("$.data[0].totalInteractions").value(2))
                .andExpect(jsonPath("$.data[0].uniqueVisitors").value(2))
                .andExpect(jsonPath("$.data[1].date").value("2028-02-29"))
                .andExpect(jsonPath("$.data[1].totalInteractions").value(0))
                .andExpect(jsonPath("$.data[1].uniqueVisitors").value(0))
                .andExpect(jsonPath("$.data[2].date").value("2028-03-01"))
                .andExpect(jsonPath("$.data[2].totalInteractions").value(1))
                .andExpect(jsonPath("$.data[2].uniqueVisitors").value(1));
    }

    @Test
    void dailyTimeSeriesReturnsZeroBucketsForEmptyRange() throws Exception {
        mockMvc.perform(get("/api/analytics/interactions/timeseries")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", "2026-01-01T00:00:00Z")
                        .param("to", "2026-01-04T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].totalInteractions").value(0))
                .andExpect(jsonPath("$.data[1].totalInteractions").value(0))
                .andExpect(jsonPath("$.data[2].totalInteractions").value(0));
    }

    @Test
    void analyticsEndpointsRequireAdmin() throws Exception {
        String[] endpoints = {
                "/api/analytics/interactions/timeseries",
                "/api/analytics/interactions/languages"
        };

        for (String endpoint : endpoints) {
            mockMvc.perform(get(endpoint)
                            .param("from", "2026-10-01T00:00:00Z")
                            .param("to", "2026-10-02T00:00:00Z"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(get(endpoint)
                            .header("Authorization", "Bearer " + visitorToken)
                            .param("from", "2026-10-01T00:00:00Z")
                            .param("to", "2026-10-02T00:00:00Z"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get(endpoint)
                            .header("Authorization", "Bearer " + adminToken)
                            .param("from", "2026-10-01T00:00:00Z")
                            .param("to", "2026-10-02T00:00:00Z"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").isArray());
        }
    }

    @Test
    void analyticsEndpointsValidateDateRange() throws Exception {
        String[] endpoints = {
                "/api/analytics/interactions/timeseries",
                "/api/analytics/interactions/languages"
        };

        for (String endpoint : endpoints) {
            mockMvc.perform(get(endpoint)
                            .header("Authorization", "Bearer " + adminToken)
                            .param("from", "2026-10-01T00:00:00Z"))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(get(endpoint)
                            .header("Authorization", "Bearer " + adminToken)
                            .param("from", "2026-10-02T00:00:00Z")
                            .param("to", "2026-10-01T00:00:00Z"))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(get(endpoint)
                            .header("Authorization", "Bearer " + adminToken)
                            .param("from", "2026-01-01T00:00:00Z")
                            .param("to", "2026-04-02T00:00:00Z"))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(get(endpoint)
                            .header("Authorization", "Bearer " + adminToken)
                            .param("from", "2026-01-01T00:00:00Z")
                            .param("to", "2026-04-01T00:00:00Z"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void languageAnalyticsAggregatesAndBucketsUnknown() throws Exception {
        Instant from = Instant.parse("2026-07-01T00:00:00Z");
        Instant to = Instant.parse("2026-07-02T00:00:00Z");

        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "VIEW", "vi", from.plusSeconds(3600), from.plusSeconds(3630), from.plusSeconds(3600));
        insertInteraction(UUID.randomUUID(), VISITOR_TWO, visitorUserId,
                "VIEW", "vi", from.plusSeconds(7200), from.plusSeconds(7230), from.plusSeconds(7200));
        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "AUDIO_PLAY", "en", from.plusSeconds(10800), from.plusSeconds(10830), from.plusSeconds(10800));
        insertInteraction(UUID.randomUUID(), VISITOR_TWO, visitorUserId,
                "SCAN", "", from.plusSeconds(14400), from.plusSeconds(14430), from.plusSeconds(14400));
        insertInteraction(UUID.randomUUID(), VISITOR_THREE, visitorUserId,
                "VIEW", "   ", from.plusSeconds(18000), from.plusSeconds(18030), from.plusSeconds(18000));
        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "VIEW", "vi", from.minusSeconds(1), from.plusSeconds(29), from.minusSeconds(1));
        insertInteraction(UUID.randomUUID(), VISITOR_ONE, visitorUserId,
                "VIEW", "en", to, to.plusSeconds(30), to);

        String response = mockMvc.perform(get("/api/analytics/interactions/languages")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(response).path("data");
        Map<String, Long> counts = new LinkedHashMap<>();
        for (JsonNode row : data) {
            counts.put(row.path("languageCode").asText(), row.path("interactionCount").asLong());
        }

        assertEquals(2L, counts.get("UNKNOWN"));
        assertEquals(2L, counts.get("vi"));
        assertEquals(1L, counts.get("en"));
        assertEquals(5L, counts.values().stream().mapToLong(Long::longValue).sum());
    }

    @Test
    void languageAnalyticsReturnsEmptyArrayForEmptyRange() throws Exception {
        mockMvc.perform(get("/api/analytics/interactions/languages")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", "2026-01-01T00:00:00Z")
                        .param("to", "2026-01-02T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void rejectsInvalidInteractionPayloads() throws Exception {
        String valid = payload(viewRequest(UUID.randomUUID(), VISITOR_ONE, BASE_TIME), null);
        String missingVisitorId = valid.replace(
                "\"visitorId\":\"" + VISITOR_ONE + "\",", "");
        String invalidType = valid.replace("\"interactionType\":\"VIEW\"",
                "\"interactionType\":\"BEACON_TRIGGER\"");
        String malformedEventId = valid.replace(
                "\"eventId\":\"" + objectMapper.readTree(valid).path("eventId").asText() + "\"",
                "\"eventId\":\"not-a-uuid\"");
        String missingStartedAt = valid.replace(
                "\"startedAt\":\"" + BASE_TIME + "\",", "");
        String missingInteractedAt = valid.replace(
                "\"interactedAt\":\"" + BASE_TIME + "\"", "\"interactedAt\":null");

        for (String body : List.of(
                missingVisitorId,
                invalidType,
                malformedEventId,
                missingStartedAt,
                missingInteractedAt)) {
            postInteraction(visitorToken, body)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        assertEquals(0L, interactionRepository.count());
    }

    @Test
    void rollbackOnDuplicateEventIdLeavesNoPartialRecord() {
        UUID eventId = UUID.randomUUID();
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        assertThrows(DataIntegrityViolationException.class, () ->
                transactionTemplate.executeWithoutResult(status -> {
                    insertInteraction(eventId, VISITOR_ONE, visitorUserId,
                            "VIEW", "vi", BASE_TIME, BASE_TIME.plusSeconds(30), BASE_TIME);
                    insertInteraction(eventId, VISITOR_ONE, visitorUserId,
                            "VIEW", "vi", BASE_TIME, BASE_TIME.plusSeconds(30), BASE_TIME);
                }));

        assertEquals(0L, countByEventId(eventId));
    }

    @Test
    void performanceBaseline() {
        Instant from = Instant.parse("2026-09-01T00:00:00Z");
        Instant to = Instant.parse("2026-09-02T00:00:00Z");
        List<UUID> visitors = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            visitors.add(UUID.nameUUIDFromBytes(("perf-visitor-" + i).getBytes()));
        }

        for (int i = 0; i < 200; i++) {
            insertInteraction(
                    UUID.randomUUID(),
                    visitors.get(i % visitors.size()),
                    visitorUserId,
                    i % 3 == 0 ? "VIEW" : i % 3 == 1 ? "AUDIO_PLAY" : "SCAN",
                    i % 2 == 0 ? "vi" : "en",
                    from.plusSeconds(i * 10L),
                    from.plusSeconds(i * 10L + 30),
                    from.plusSeconds(i * 10L));
        }

        long start = System.nanoTime();
        InteractionSummaryResponse summary = interactionService.getSummary(from, to);
        List<com.university.backend.dto.DailyInteractionResponse> daily =
                interactionService.getDailyTimeSeries(from, to);
        List<LanguageCountResponse> languages =
                interactionService.getLanguageAnalytics(from, to);
        long elapsedMs = Duration.ofNanos(System.nanoTime() - start).toMillis();

        assertEquals(200L, summary.totalInteractions());
        assertEquals(20L, summary.uniqueVisitors());
        assertEquals(1, daily.size());
        assertEquals(200L, daily.get(0).totalInteractions());
        assertEquals(200L, languages.stream()
                .mapToLong(LanguageCountResponse::interactionCount)
                .sum());
        assertTrue(elapsedMs >= 0);
        System.out.printf(
                "M5 PostgreSQL baseline: 200 interactions, analytics=%d ms%n",
                elapsedMs);
    }

    private void resetDatabase() {
        jdbcTemplate.update("delete from visitor_interaction");
        jdbcTemplate.update("delete from beacon");
        jdbcTemplate.update("delete from multimedia");
        jdbcTemplate.update("delete from artifact");
        jdbcTemplate.update("delete from heritage_site");
        jdbcTemplate.update("delete from \"user\"");
        jdbcTemplate.update("delete from role");
    }

    private int insertRole(String name) {
        return jdbcTemplate.queryForObject("""
                insert into role(name)
                values (?)
                returning role_id
                """, Integer.class, name);
    }

    private int createUser(int roleId, String username) {
        return jdbcTemplate.queryForObject("""
                insert into "user" (role_id, username, email, password_hash)
                values (?, ?, ?, ?)
                returning user_id
                """, Integer.class,
                roleId,
                username,
                username + "@example.com",
                passwordEncoder.encode(PASSWORD));
    }

    private int createArtifact() {
        int siteId = jdbcTemplate.queryForObject("""
                insert into heritage_site(name)
                values ('M5 PostgreSQL IT site')
                returning site_id
                """, Integer.class);

        return jdbcTemplate.queryForObject("""
                insert into artifact(site_id, name)
                values (?, 'M5 PostgreSQL IT artifact')
                returning artifact_id
                """, Integer.class, siteId);
    }

    private String login(String username) throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("username", username, "password", PASSWORD));
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String token = objectMapper.readTree(response)
                .path("data").path("accessToken").asText();
        assertFalse(token.isBlank());
        return token;
    }

    private ResultActions postInteraction(String token, String body) throws Exception {
        MockHttpServletRequestBuilder request = post("/api/interactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        return mockMvc.perform(request);
    }

    private String payload(CreateInteractionRequest request, Integer claimedUserId)
            throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("eventId", request.getEventId().toString());
        body.put("visitorId", request.getVisitorId().toString());
        if (claimedUserId != null) {
            body.put("userId", claimedUserId);
        }
        body.put("artifactId", request.getArtifactId());
        body.put("interactionType", request.getInteractionType());
        body.put("languageCode", request.getLanguageCode());
        body.put("startedAt", request.getStartedAt().toString());
        if (request.getEndedAt() != null) {
            body.put("endedAt", request.getEndedAt().toString());
        }
        body.put("interactedAt", request.getInteractedAt().toString());
        return objectMapper.writeValueAsString(body);
    }

    private CreateInteractionRequest viewRequest(
            UUID eventId,
            UUID visitorId,
            Instant interactedAt) {
        return request(
                eventId,
                visitorId,
                "VIEW",
                "vi",
                interactedAt,
                interactedAt.plusSeconds(30),
                interactedAt);
    }

    private CreateInteractionRequest request(
            UUID eventId,
            UUID visitorId,
            String interactionType,
            String languageCode,
            Instant startedAt,
            Instant endedAt,
            Instant interactedAt) {
        CreateInteractionRequest request = new CreateInteractionRequest();
        request.setEventId(eventId);
        request.setVisitorId(visitorId);
        request.setArtifactId(artifactId);
        request.setInteractionType(interactionType);
        request.setLanguageCode(languageCode);
        request.setStartedAt(startedAt);
        request.setEndedAt(endedAt);
        request.setInteractedAt(interactedAt);
        return request;
    }

    private void insertInteraction(
            UUID eventId,
            UUID visitorId,
            Integer userId,
            String interactionType,
            String languageCode,
            Instant startedAt,
            Instant endedAt,
            Instant interactedAt) {
        Long durationSeconds = endedAt == null
                ? null
                : Duration.between(startedAt, endedAt).getSeconds();

        jdbcTemplate.update("""
                insert into visitor_interaction
                    (event_id, visitor_id, user_id, artifact_id, interaction_type,
                     language_code, started_at, ended_at, duration_seconds, interacted_at)
                values (?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                eventId.toString(),
                visitorId.toString(),
                userId,
                artifactId,
                interactionType,
                languageCode,
                Timestamp.from(startedAt),
                endedAt == null ? null : Timestamp.from(endedAt),
                durationSeconds,
                Timestamp.from(interactedAt));
    }

    private long countByEventId(UUID eventId) {
        return jdbcTemplate.queryForObject("""
                select count(*)
                from visitor_interaction
                where event_id = ?::uuid
                """, Long.class, eventId.toString());
    }
}
