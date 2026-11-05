
package com.university.backend.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
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
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect"
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

            System.out.println("PostgreSQL connection: PASS");
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
            .andExpect(jsonPath("$.data.durationSeconds").value(30))
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

        System.out.println(
            "VisitorInteraction persistence: PASS"
        );

      
        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message")
                .value("Interaction event was already recorded"))
            .andExpect(jsonPath("$.data.eventId")
                .value(eventId.toString()));

        assertEquals(1L, countInteractions(eventId));

        System.out.println(
            "D1 - Sequential duplicate: PASS"
        );

        
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

        System.out.println(
            "D2 - Different user duplicate: PASS"
        );
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

            System.out.println(
                "D3 first HTTP status: " + firstStatus
            );

            System.out.println(
                "D3 second HTTP status: " + secondStatus
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

            System.out.println("Concurrent duplicate event test completed successfully.");

            System.out.println(
                "Event ID: " + eventId
            );

            System.out.println(
                "Rows in PostgreSQL: " + recordCount
            );

        } finally {

            start.countDown();

            executor.shutdownNow();
        }
    }
}
