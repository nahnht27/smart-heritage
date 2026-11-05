
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
import java.util.Map;
import java.util.UUID;

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

  
        Integer roleId = jdbcTemplate.queryForObject(
            """
            INSERT INTO role(name)
            VALUES ('VISITOR')
            RETURNING role_id
            """,
            Integer.class
        );

        String username = "m5_pg_visitor";
        String password = "TestPass123!";

        Integer userId = jdbcTemplate.queryForObject(
            """
            INSERT INTO "user"
                (role_id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
            RETURNING user_id
            """,
            Integer.class,
            roleId,
            username,
            "m5_pg_visitor@example.com",
            passwordEncoder.encode(password)
        );

        Integer siteId = jdbcTemplate.queryForObject(
            """
            INSERT INTO heritage_site(name)
            VALUES ('M5 Test Heritage Site')
            RETURNING site_id
            """,
            Integer.class
        );

        Integer artifactId = jdbcTemplate.queryForObject(
            """
            INSERT INTO artifact(site_id, name)
            VALUES (?, 'M5 Test Artifact')
            RETURNING artifact_id
            """,
            Integer.class,
            siteId
        );

       
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

     
        UUID eventId = UUID.randomUUID();

        String requestBody = objectMapper.writeValueAsString(
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
        assertEquals(30L, stored.get("duration_seconds"));

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
            ((Number) stored.get("duration_seconds")).longValue(),
            responseData.path("durationSeconds").asLong()
        );

        Long recordCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            Long.class,
            eventId.toString()
        );

        assertEquals(1L, recordCount);

        System.out.println("VisitorInteraction persistence: PASS");

        
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

        Long countAfterDuplicate = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            Long.class,
            eventId.toString()
        );

        assertEquals(1L, countAfterDuplicate);

        System.out.println("D1 - Sequential duplicate: PASS");

        // TEST D2: A different user submits the same eventId
        String secondUsername = "m5_pg_visitor_2";

        jdbcTemplate.update(
            """
            INSERT INTO "user"
                (role_id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
            """,
            roleId,
            secondUsername,
            "m5_pg_visitor_2@example.com",
            passwordEncoder.encode(password)
        );

        String secondLoginBody = objectMapper.writeValueAsString(
            Map.of(
                "username", secondUsername,
                "password", password
            )
        );

        String secondLoginResponse = mockMvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(secondLoginBody)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        String secondToken = objectMapper
            .readTree(secondLoginResponse)
            .path("data")
            .path("accessToken")
            .asText();

        assertFalse(secondToken.isBlank());

        mockMvc.perform(
                post("/api/interactions")
                    .header("Authorization", "Bearer " + secondToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody)
            )
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.success").value(false));

        Long countAfterOtherUser = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM visitor_interaction
            WHERE event_id = ?::uuid
            """,
            Long.class,
            eventId.toString()
        );

        assertEquals(1L, countAfterOtherUser);

        System.out.println("D2 - Different user duplicate: PASS");
    }
}
