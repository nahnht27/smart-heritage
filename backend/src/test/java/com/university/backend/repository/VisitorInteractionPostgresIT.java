
package com.university.backend.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.dto.InteractionTypeCountResponse;
import com.university.backend.dto.PopularArtifactResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles(value = "postgres-test", inheritProfiles = false)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/smart_heritage_test",
    "spring.datasource.username=postgres",
    "spring.datasource.password=${M5_TEST_DB_PASSWORD:postgres}",
    "spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.hibernate.ddl-auto=create",
    "spring.jpa.open-in-view=false"
})
public class VisitorInteractionPostgresIT {

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

    

    private Integer getVisitorRoleId() {
        return jdbcTemplate.queryForObject(
            """
            INSERT INTO role(name)
            VALUES ('VISITOR')
            ON CONFLICT (name)
            DO UPDATE SET name = EXCLUDED.name
            RETURNING role_id
            """,
            Integer.class
        );
    }

    private Integer createTestUser(
        Integer roleId,
        String username,
        String password
    ) {
        return jdbcTemplate.queryForObject(
            """
            INSERT INTO "user"
                (role_id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
            RETURNING user_id
            """,
            Integer.class,
            roleId,
            username,
            username + "@example.com",
            passwordEncoder.encode(password)
        );
    }

    private Integer createTestArtifact() {

        Integer siteId = jdbcTemplate.queryForObject(
            """
            INSERT INTO heritage_site(name)
            VALUES ('M5 Test Heritage Site')
            RETURNING site_id
            """,
            Integer.class
        );

        return jdbcTemplate.queryForObject(
            """
            INSERT INTO artifact(site_id, name)
            VALUES (?, 'M5 Test Artifact')
            RETURNING artifact_id
            """,
            Integer.class,
            siteId
        );
    }

    private String loginAndGetToken(
        String username,
        String password
    ) throws Exception {

        String loginBody = objectMapper.writeValueAsString(
            Map.of(
                "username", username,
                "password", password
            )
        );

        String loginResponse = mockMvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        String token = objectMapper
            .readTree(loginResponse)
            .path("data")
            .path("accessToken")
            .asText();

        assertFalse(token.isBlank());

        return token;
    }

    private String createInteractionRequest(
        UUID eventId,
        Integer artifactId
    ) throws Exception {

        return objectMapper.writeValueAsString(
            Map.of(
                "eventId", eventId.toString(),
                "artifactId", artifactId,
                "interactionType", "VIEW",
                "languageCode", "vi",
                "startedAt", "2026-11-01T10:00:00Z",
                "endedAt", "2026-11-01T10:00:30Z",
                "interactedAt", "2026-11-01T10:00:00Z"
            )
        );
    }

    private Map<String, Object> createDurationRequest(
        UUID eventId,
        Integer artifactId,
        String startedAt,
        String endedAt
    ) {

        Map<String, Object> request = new HashMap<>();

        request.put("eventId", eventId.toString());
        request.put("artifactId", artifactId);
        request.put("interactionType", "VIEW");
        request.put("languageCode", "vi");
        request.put("startedAt", startedAt);
        request.put("endedAt", endedAt);
        request.put("interactedAt", startedAt);

        return request;
    }

    private Long countInteractions(UUID eventId) {

        return jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            Long.class,
            eventId.toString()
        );
    }

    private void insertAnalyticsInteraction(
        Integer userId,
        Integer artifactId,
        String interactionType,
        String languageCode,
        Instant interactedAt
    ) {

        jdbcTemplate.update(
            """
            INSERT INTO visitor_interaction
                (event_id, user_id, artifact_id,
                 interaction_type, language_code,
                 started_at, ended_at, interacted_at,
                 duration_seconds)
            VALUES (?::uuid, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            UUID.randomUUID().toString(),
            userId,
            artifactId,
            interactionType,
            languageCode,
            Timestamp.from(interactedAt),
            Timestamp.from(interactedAt.plusSeconds(30)),
            Timestamp.from(interactedAt),
            30L
        );
    }

    

    @Test
    void shouldConnectToPostgreSQL() throws Exception {

        try (Connection connection = dataSource.getConnection()) {

            assertTrue(connection.isValid(5));

            assertEquals(
                "PostgreSQL",
                connection.getMetaData().getDatabaseProductName()
            );

            assertEquals(
                "smart_heritage_test",
                connection.getCatalog()
            );
        }
    }

    

    @Test
    void shouldPersistVisitorInteraction() throws Exception {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String username = "m5_visitor_" + suffix;
        String password = "TestPass123!";

        Integer userId = createTestUser(
            roleId,
            username,
            password
        );

        Integer artifactId = createTestArtifact();

        String token = loginAndGetToken(
            username,
            password
        );

        UUID eventId = UUID.randomUUID();

        String requestBody = createInteractionRequest(
            eventId,
            artifactId
        );

        String apiResponse = mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(
                jsonPath("$.data.durationSeconds").value(30)
            )
            .andReturn()
            .getResponse()
            .getContentAsString();

        Map<String, Object> stored = jdbcTemplate.queryForMap(
            """
            SELECT event_id, user_id, artifact_id,
                   interaction_type, language_code,
                   started_at, ended_at, interacted_at,
                   duration_seconds
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            eventId.toString()
        );

        assertEquals(eventId, stored.get("event_id"));
        assertEquals(userId, stored.get("user_id"));
        assertEquals(artifactId, stored.get("artifact_id"));
        assertEquals("VIEW", stored.get("interaction_type"));
        assertEquals("vi", stored.get("language_code"));

        assertEquals(
            30L,
            ((Number) stored.get("duration_seconds")).longValue()
        );

        assertNotNull(stored.get("started_at"));
        assertNotNull(stored.get("ended_at"));
        assertNotNull(stored.get("interacted_at"));

        JsonNode responseData = objectMapper
            .readTree(apiResponse)
            .path("data");

        assertEquals(
            eventId.toString(),
            responseData.path("eventId").asText()
        );

        assertEquals(
            artifactId.intValue(),
            responseData.path("artifactId").asInt()
        );

        assertEquals(
            30L,
            responseData.path("durationSeconds").asLong()
        );

        assertEquals(1L, countInteractions(eventId));

      

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(
                jsonPath("$.message")
                    .value("Interaction event was already recorded")
            )
            .andExpect(
                jsonPath("$.data.eventId")
                    .value(eventId.toString())
            );

        assertEquals(1L, countInteractions(eventId));

        

        String secondUsername = "m5_second_" + suffix;

        createTestUser(
            roleId,
            secondUsername,
            password
        );

        String secondToken = loginAndGetToken(
            secondUsername,
            password
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + secondToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody)
            )
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.success").value(false));

        assertEquals(1L, countInteractions(eventId));
    }

    

    @Test
    void shouldPreventConcurrentDuplicateEvents() throws Exception {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String username = "m5_concurrent_" + suffix;
        String password = "TestPass123!";

        Integer userId = createTestUser(
            roleId,
            username,
            password
        );

        Integer artifactId = createTestArtifact();

        String token = loginAndGetToken(
            username,
            password
        );

        UUID eventId = UUID.randomUUID();

        String requestBody = createInteractionRequest(
            eventId,
            artifactId
        );

        ExecutorService executor =
            Executors.newFixedThreadPool(2);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {

            Callable<Integer> requestTask = () -> {

                ready.countDown();

                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException(
                        "Concurrent start timeout"
                    );
                }

                return mockMvc.perform(
                        post("/api/interactions")
                            .header(
                                "Authorization",
                                "Bearer " + token
                            )
                            .contentType(
                                MediaType.APPLICATION_JSON
                            )
                            .content(requestBody)
                    )
                    .andReturn()
                    .getResponse()
                    .getStatus();
            };

            Future<Integer> firstFuture =
                executor.submit(requestTask);

            Future<Integer> secondFuture =
                executor.submit(requestTask);

            assertTrue(
                ready.await(10, TimeUnit.SECONDS),
                "Both requests must be ready"
            );

            start.countDown();

            int firstStatus = firstFuture.get(
                30,
                TimeUnit.SECONDS
            );

            int secondStatus = secondFuture.get(
                30,
                TimeUnit.SECONDS
            );

            long createdCount = List.of(
                firstStatus,
                secondStatus
            ).stream()
             .filter(code -> code == 201)
             .count();

            assertEquals(
                1L,
                createdCount,
                "Exactly one request must create the event"
            );

            int duplicateStatus =
                firstStatus == 201
                    ? secondStatus
                    : firstStatus;

            assertTrue(
                duplicateStatus == 200
                    || duplicateStatus == 409,
                "Duplicate must return HTTP 200 or 409"
            );

            Long recordCount = countInteractions(eventId);

            assertEquals(
                1L,
                recordCount,
                "PostgreSQL must contain exactly one event"
            );

            Integer storedUserId =
                jdbcTemplate.queryForObject(
                    """
                    SELECT user_id
                    FROM visitor_interaction
                    WHERE event_id = ?::uuid
                    """,
                    Integer.class,
                    eventId.toString()
                );

            assertEquals(userId, storedUserId);

        } finally {

            start.countDown();
            executor.shutdownNow();
        }
    }

    

    @Test
    void shouldCalculateAndPersistDurationCorrectly() throws Exception {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String username = "m5_duration_" + suffix;
        String password = "TestPass123!";

        Integer userId = createTestUser(
            roleId,
            username,
            password
        );

        Integer artifactId = createTestArtifact();

        String token = loginAndGetToken(
            username,
            password
        );

        UUID eventId = UUID.randomUUID();

        String startedAt = "2026-11-01T10:00:00Z";
        String endedAt = "2026-11-01T10:02:05Z";

        Map<String, Object> request = createDurationRequest(
            eventId,
            artifactId,
            startedAt,
            endedAt
        );

    
        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(request)
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(
                jsonPath("$.data.durationSeconds").value(125)
            );

        Map<String, Object> stored = jdbcTemplate.queryForMap(
            """
            SELECT user_id, duration_seconds,
                   started_at, ended_at, interacted_at
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            eventId.toString()
        );

        assertEquals(userId, stored.get("user_id"));

        assertEquals(
            125L,
            ((Number) stored.get("duration_seconds")).longValue()
        );

        assertEquals(
            Instant.parse(startedAt),
            ((Timestamp) stored.get("started_at")).toInstant()
        );

        assertEquals(
            Instant.parse(endedAt),
            ((Timestamp) stored.get("ended_at")).toInstant()
        );

        assertEquals(
            Instant.parse(startedAt),
            ((Timestamp) stored.get("interacted_at")).toInstant()
        );

        assertEquals(1L, countInteractions(eventId));

  

        UUID zeroEventId = UUID.randomUUID();

        request.put(
            "eventId",
            zeroEventId.toString()
        );

        request.put(
            "endedAt",
            startedAt
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(request)
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(
                jsonPath("$.data.durationSeconds").value(0)
            );

        Long zeroDuration = jdbcTemplate.queryForObject(
            """
            SELECT duration_seconds
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            Long.class,
            zeroEventId.toString()
        );

        assertEquals(0L, zeroDuration);
        assertEquals(1L, countInteractions(zeroEventId));

      

        UUID invalidEventId = UUID.randomUUID();

        request.put(
            "eventId",
            invalidEventId.toString()
        );

        request.put(
            "endedAt",
            "2026-11-01T09:59:00Z"
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(request)
                    )
            )
            .andExpect(status().isBadRequest());

        assertEquals(0L, countInteractions(invalidEventId));
    }

    

    @Test
    void shouldHandleMissingEndTime() throws Exception {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String username = "m5_null_end_" + suffix;
        String password = "TestPass123!";

        createTestUser(
            roleId,
            username,
            password
        );

        Integer artifactId = createTestArtifact();

        String token = loginAndGetToken(
            username,
            password
        );

        UUID eventId = UUID.randomUUID();

        Map<String, Object> request = createDurationRequest(
            eventId,
            artifactId,
            "2026-11-01T10:00:00Z",
            null
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(request)
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true));

        assertEquals(1L, countInteractions(eventId));

        Map<String, Object> stored = jdbcTemplate.queryForMap(
            """
            SELECT ended_at, duration_seconds
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            eventId.toString()
        );

        assertNull(stored.get("ended_at"));
        assertNull(stored.get("duration_seconds"));
    }

    

    @Test
    void shouldAggregateAnalyticsCorrectly() {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        Integer user1 = createTestUser(
            roleId,
            "analytics_user1_" + suffix,
            "TestPass123!"
        );

        Integer user2 = createTestUser(
            roleId,
            "analytics_user2_" + suffix,
            "TestPass123!"
        );

        Integer artifact1 = createTestArtifact();
        Integer artifact2 = createTestArtifact();

        Instant from = Instant.parse("2025-01-10T00:00:00Z");
        Instant to = Instant.parse("2025-01-11T00:00:00Z");

        insertAnalyticsInteraction(
            user1, artifact1, "VIEW", "vi", from
        );

        insertAnalyticsInteraction(
            user1, artifact1, "AUDIO_PLAY", "vi",
            from.plusSeconds(3600)
        );

        insertAnalyticsInteraction(
            user2, artifact1, "VIEW", "en",
            from.plusSeconds(7200)
        );

        insertAnalyticsInteraction(
            user2, artifact2, "SCAN", "en",
            from.plusSeconds(10800)
        );

        // Must be excluded: before 'from'

        insertAnalyticsInteraction(
            user1, artifact2, "VIEW", "vi",
            from.minusSeconds(1)
        );

   

        insertAnalyticsInteraction(
            user2, artifact2, "SCAN", "en", to
        );

        long totalInteractions =
            interactionRepository.countInPeriod(from, to);

        long uniqueVisitors =
            interactionRepository.countUniqueVisitorsInPeriod(from, to);

        assertEquals(4L, totalInteractions);
        assertEquals(2L, uniqueVisitors);

        List<InteractionTypeCountResponse> types =
            interactionRepository.countByTypeInPeriod(from, to);

        Map<String, Long> typeCounts = new HashMap<>();

        for (InteractionTypeCountResponse item : types) {
            typeCounts.put(
                item.interactionType(),
                item.count()
            );
        }

        assertEquals(3, typeCounts.size());
        assertEquals(2L, typeCounts.get("VIEW"));
        assertEquals(1L, typeCounts.get("AUDIO_PLAY"));
        assertEquals(1L, typeCounts.get("SCAN"));

        List<PopularArtifactResponse> popular =
            interactionRepository.findPopularArtifactsInPeriod(
                from,
                to,
                PageRequest.of(0, 10)
            );

        assertEquals(2, popular.size());

        assertEquals(
            artifact1,
            popular.get(0).artifactId()
        );

        assertEquals(
            3L,
            popular.get(0).interactionCount()
        );

        assertEquals(
            artifact2,
            popular.get(1).artifactId()
        );

        assertEquals(
            1L,
            popular.get(1).interactionCount()
        );
    }

    

    @Test
    void shouldReturnEmptyAnalyticsForPeriodWithoutData() {

        Instant from = Instant.parse("2030-01-01T00:00:00Z");
        Instant to = Instant.parse("2030-01-02T00:00:00Z");

        assertEquals(
            0L,
            interactionRepository.countInPeriod(from, to)
        );

        assertEquals(
            0L,
            interactionRepository.countUniqueVisitorsInPeriod(from, to)
        );

        assertTrue(
            interactionRepository.countByTypeInPeriod(
                from, to
            ).isEmpty()
        );

        assertTrue(
            interactionRepository.findPopularArtifactsInPeriod(
                from,
                to,
                PageRequest.of(0, 10)
            ).isEmpty()
        );
    }

   

    @Test
    void shouldLimitPopularArtifactsToTen() {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        Integer userId = createTestUser(
            roleId,
            "analytics_top_" + suffix,
            "TestPass123!"
        );

        Instant from = Instant.parse("2025-02-01T00:00:00Z");
        Instant to = Instant.parse("2025-02-02T00:00:00Z");

        List<Integer> artifactIds = new ArrayList<>();

        for (int i = 0; i < 11; i++) {

            Integer artifactId = createTestArtifact();

            artifactIds.add(artifactId);

            insertAnalyticsInteraction(
                userId,
                artifactId,
                "VIEW",
                "vi",
                from.plusSeconds(i * 60L)
            );
        }

        List<PopularArtifactResponse> popular =
            interactionRepository.findPopularArtifactsInPeriod(
                from,
                to,
                PageRequest.of(0, 10)
            );

        assertEquals(10, popular.size());

        artifactIds.sort(Integer::compareTo);

        for (int i = 0; i < 10; i++) {

            assertEquals(
                artifactIds.get(i),
                popular.get(i).artifactId()
            );

            assertEquals(
                1L,
                popular.get(i).interactionCount()
            );
        }

        assertEquals(
            11L,
            interactionRepository.countInPeriod(from, to)
        );
    }
    
    @Test
    void shouldEnforceAnalyticsAuthenticationAndAuthorization()
            throws Exception {

        String endpoint = "/api/analytics/interactions/summary";

        String from = "2025-03-01T00:00:00Z";
        String to = "2025-03-02T00:00:00Z";

        
        mockMvc.perform(
                org.springframework.test.web.servlet.request
                    .MockMvcRequestBuilders.get(endpoint)
                    .param("from", from)
                    .param("to", to)
            )
            .andExpect(status().isUnauthorized());

      
        Integer visitorRoleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String visitorUsername = "security_visitor_" + suffix;
        String password = "TestPass123!";

        createTestUser(
            visitorRoleId,
            visitorUsername,
            password
        );

        String visitorToken = loginAndGetToken(
            visitorUsername,
            password
        );

        
        mockMvc.perform(
                org.springframework.test.web.servlet.request
                    .MockMvcRequestBuilders.get(endpoint)
                    .header(
                        "Authorization",
                        "Bearer " + visitorToken
                    )
                    .param("from", from)
                    .param("to", to)
            )
            .andExpect(status().isForbidden());

       
        Integer adminRoleId = jdbcTemplate.queryForObject(
            """
            INSERT INTO role(name)
            VALUES ('ADMIN')
            ON CONFLICT (name)
            DO UPDATE SET name = EXCLUDED.name
            RETURNING role_id
            """,
            Integer.class
        );

     
        String adminUsername = "security_admin_" + suffix;

        createTestUser(
            adminRoleId,
            adminUsername,
            password
        );

        String adminToken = loginAndGetToken(
            adminUsername,
            password
        );

    
        mockMvc.perform(
                org.springframework.test.web.servlet.request
                    .MockMvcRequestBuilders.get(endpoint)
                    .header(
                        "Authorization",
                        "Bearer " + adminToken
                    )
                    .param("from", from)
                    .param("to", to)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(
                jsonPath("$.data.totalInteractions").exists()
            )
            .andExpect(
                jsonPath("$.data.uniqueVisitors").exists()
            );
    }

    
   

    @Test
    void shouldRejectInvalidInteractionRequests()
            throws Exception {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String username = "m5_reliability_" + suffix;
        String password = "TestPass123!";

        createTestUser(roleId, username, password);

        Integer artifactId = createTestArtifact();

        String token = loginAndGetToken(
            username,
            password
        );

       
        UUID missingEventId = UUID.randomUUID();

        Map<String, Object> missingIdRequest =
            createDurationRequest(
                missingEventId,
                artifactId,
                "2026-11-01T10:00:00Z",
                "2026-11-01T10:00:30Z"
            );

                        
        missingIdRequest.remove("eventId");


        Long countBefore = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM visitor_interaction",
            Long.class
        );


mockMvc.perform(
        post("/api/interactions")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                missingIdRequest
            ))
    )
    .andExpect(status().isBadRequest());


        Long countAfter = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM visitor_interaction",
            Long.class
        );


        assertEquals(
            countBefore,
            countAfter,
            "Missing eventId must not create any interaction"
         );


        
        UUID invalidTypeEventId = UUID.randomUUID();

        Map<String, Object> invalidTypeRequest =
            createDurationRequest(
                invalidTypeEventId,
                artifactId,
                "2026-11-01T10:00:00Z",
                "2026-11-01T10:00:30Z"
            );

        invalidTypeRequest.put(
            "interactionType",
            "INVALID_TYPE"
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                        invalidTypeRequest
                    ))
            )
            .andExpect(status().isBadRequest());

        assertEquals(
            0L,
            countInteractions(invalidTypeEventId)
        );

    
        UUID invalidLanguageEventId = UUID.randomUUID();

        Map<String, Object> invalidLanguageRequest =
            createDurationRequest(
                invalidLanguageEventId,
                artifactId,
                "2026-11-01T10:00:00Z",
                "2026-11-01T10:00:30Z"
            );

        invalidLanguageRequest.put(
            "languageCode",
            "123_INVALID"
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                        invalidLanguageRequest
                    ))
            )
            .andExpect(status().isBadRequest());

        assertEquals(
            0L,
            countInteractions(invalidLanguageEventId)
        );

       
        UUID invalidArtifactEventId = UUID.randomUUID();

        Map<String, Object> invalidArtifactRequest =
            createDurationRequest(
                invalidArtifactEventId,
                artifactId,
                "2026-11-01T10:00:00Z",
                "2026-11-01T10:00:30Z"
            );

        invalidArtifactRequest.put(
            "artifactId",
            -1
        );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                        invalidArtifactRequest
                    ))
            )
            .andExpect(status().isBadRequest());

        assertEquals(
            0L,
            countInteractions(invalidArtifactEventId)
        );
    }

    

    @Test
    void shouldRejectInvalidTimeWithoutPersisting()
            throws Exception {

        Integer roleId = getVisitorRoleId();

        String suffix = UUID.randomUUID()
            .toString()
            .substring(0, 8);

        String username = "m5_invalid_time_" + suffix;
        String password = "TestPass123!";

        createTestUser(
            roleId,
            username,
            password
        );

        Integer artifactId = createTestArtifact();

        String token = loginAndGetToken(
            username,
            password
        );

        UUID eventId = UUID.randomUUID();

        Map<String, Object> request =
            createDurationRequest(
                eventId,
                artifactId,
                "2026-11-01T10:05:00Z",
                "2026-11-01T10:00:00Z"
            );

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
            )
            .andExpect(status().isBadRequest());

        assertEquals(
            0L,
            countInteractions(eventId),
            "Invalid interaction must not be persisted"
        );
    }

}
