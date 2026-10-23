package com.university.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.entity.Role;
import com.university.backend.entity.User;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.RoleRepository;
import com.university.backend.repository.UserRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VisitorInteractionControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VisitorInteractionRepository interactionRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private String visitorToken;
    private int artifactId;

    @BeforeEach
    void setUpInteractionFixtures() throws Exception {
        interactionRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
        userRepository.deleteAll();
        adminToken = createUserAndGetToken("interaction_admin", "ADMIN");
        visitorToken = createUserAndGetToken("interaction_visitor", "VISITOR");
        int siteId = createSite(adminToken);
        artifactId = createArtifact(adminToken, siteId);
    }

    @AfterEach
    void cleanInteractionFixtures() {
        interactionRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void postInteraction_shouldPersistEventAndReturnResponseEnvelope() throws Exception {
        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(interactionPayload(UUID.randomUUID(), artifactId,
                                "VIEW", "2026-10-20T10:00:00Z")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.eventId").isNotEmpty())
                .andExpect(jsonPath("$.data.durationSeconds").value(30));

        org.junit.jupiter.api.Assertions.assertEquals(1, interactionRepository.count());
    }

    @Test
    void postInteraction_shouldRejectInvalidPayload() throws Exception {
        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "%s",
                                  "artifactId": %d,
                                  "interactionType": "BEACON_TRIGGER",
                                  "languageCode": "vi",
                                  "startedAt": "2026-10-20T10:00:00Z",
                                  "interactedAt": "2026-10-20T10:00:00Z"
                                }
                                """.formatted(UUID.randomUUID(), artifactId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors", hasSize(1)));

        org.junit.jupiter.api.Assertions.assertEquals(0, interactionRepository.count());
    }

    @Test
    void postInteraction_shouldRejectUnknownArtifact() throws Exception {
        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(interactionPayload(
                                UUID.randomUUID(), Integer.MAX_VALUE,
                                "VIEW", "2026-10-20T10:00:00Z")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void postInteraction_shouldBeIdempotentForSameEventId() throws Exception {
        UUID eventId = UUID.randomUUID();
        String payload = interactionPayload(
                eventId, artifactId, "VIEW", "2026-10-20T10:00:00Z");

        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eventId").value(eventId.toString()));

        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        org.junit.jupiter.api.Assertions.assertEquals(1, interactionRepository.count());
    }

    @Test
    void summary_shouldApplyUtcHalfOpenTimeRange() throws Exception {
        postEvent(UUID.randomUUID(), "2026-10-01T00:00:00Z");
        postEvent(UUID.randomUUID(), "2026-10-15T00:00:00Z");
        postEvent(UUID.randomUUID(), "2026-10-16T00:00:00Z");

        mockMvc.perform(get("/api/analytics/interactions/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", "2026-10-01T00:00:00Z")
                        .param("to", "2026-10-16T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalInteractions").value(2))
                .andExpect(jsonPath("$.data.uniqueVisitors").value(1))
                .andExpect(jsonPath("$.data.interactionTypes", hasSize(1)))
                .andExpect(jsonPath("$.data.popularArtifacts[0].artifactId")
                        .value(artifactId));
    }

    @Test
    void summary_shouldReturnValidEmptyResultWithoutTimeFilter() throws Exception {
        mockMvc.perform(get("/api/analytics/interactions/summary")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalInteractions").value(0))
                .andExpect(jsonPath("$.data.uniqueVisitors").value(0))
                .andExpect(jsonPath("$.data.interactionTypes", hasSize(0)))
                .andExpect(jsonPath("$.data.popularArtifacts", hasSize(0)));
    }

    @Test
    void summary_shouldRejectMissingOrExcessiveRange() throws Exception {
        mockMvc.perform(get("/api/analytics/interactions/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", "2026-01-01T00:00:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(get("/api/analytics/interactions/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("from", "2026-01-01T00:00:00Z")
                        .param("to", "2026-04-02T00:00:00Z"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void summary_shouldRequireAdminRole() throws Exception {
        mockMvc.perform(get("/api/analytics/interactions/summary")
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(get("/api/analytics/interactions/summary"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    private String createUserAndGetToken(String username, String roleName) throws Exception {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash(passwordEncoder.encode("TestPass123!"));
        user.setRole(role);
        userRepository.save(user);

        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new com.university.backend.dto.LoginRequest(
                                        username, "TestPass123!"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).path("data").path("accessToken").asText();
    }

    private int createSite(String token) throws Exception {
        String body = """
                {
                  "name": "Interaction Test Site",
                  "description": "Test site",
                  "address": "Vietnam",
                  "latitude": 10.762622,
                  "longitude": 106.660172
                }
                """;
        String response = mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode data = objectMapper.readTree(response).path("data");
        return data.path("siteId").asInt();
    }

    private int createArtifact(String token, int siteId) throws Exception {
        String body = """
                {
                  "siteId": %d,
                  "name": "Interaction Test Artifact",
                  "description": "Test artifact"
                }
                """.formatted(siteId);
        String response = mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).path("data").path("artifactId").asInt();
    }

    private String interactionPayload(
            UUID eventId,
            int targetArtifactId,
            String interactionType,
            String interactedAt) {
        String start = interactedAt;
        String end = Instant.parse(interactedAt).plusSeconds(30).toString();
        return """
                {
                  "eventId": "%s",
                  "artifactId": %d,
                  "interactionType": "%s",
                  "languageCode": "vi",
                  "startedAt": "%s",
                  "endedAt": "%s",
                  "interactedAt": "%s"
                }
                """.formatted(
                eventId,
                targetArtifactId,
                interactionType,
                start,
                end,
                interactedAt);
    }

    private void postEvent(UUID eventId, String interactedAt) throws Exception {
        mockMvc.perform(post("/api/interactions")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(interactionPayload(
                                eventId, artifactId, "VIEW", interactedAt)))
                .andExpect(status().isCreated());
    }
}
