package com.university.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.MultimediaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MultimediaControllerTest extends ContentApiTestSupport {

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private MultimediaRepository multimediaRepository;

    @BeforeEach
    void cleanMultimediaTestData() {
        multimediaRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
    }

    private String validSiteRequest(String name) {
        return """
                {
                    "name": "%s",
                    "description": "Test heritage site",
                    "address": "Vietnam",
                    "latitude": 10.762622,
                    "longitude": 106.660172
                }
                """.formatted(name);
    }

    private String validArtifactRequest(int siteId, String name) {
        return """
                {
                    "siteId": %d,
                    "name": "%s",
                    "description": "Test artifact description"
                }
                """.formatted(siteId, name);
    }

    private String validMultimediaRequest(int artifactId, String title) {
        return """
                {
                    "artifactId": %d,
                    "type": "IMAGE",
                    "title": "%s",
                    "url": "https://example.com/heritage-image.jpg"
                }
                """.formatted(artifactId, title);
    }

    private int createSite(String token, String name) throws Exception {
        String response = mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSiteRequest(name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).path("data").path("siteId").asInt();
    }

    private int createArtifact(String token, int siteId, String name) throws Exception {
        String response = mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validArtifactRequest(siteId, name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).path("data").path("artifactId").asInt();
    }

    private int createMultimedia(String token, int artifactId, String title) throws Exception {
        String response = mockMvc.perform(post("/api/multimedia")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validMultimediaRequest(artifactId, title)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(response).path("data");
        return data.path("multimediaId").asInt();
    }

    @Test
    void getAllMultimediaShouldReturnOk() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Multimedia Test Site");
        int artifactId = createArtifact(token, siteId, "Multimedia Test Artifact");
        createMultimedia(token, artifactId, "Artifact Image");

        mockMvc.perform(get("/api/multimedia")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title").value("Artifact Image"))
                .andExpect(jsonPath("$.data[0].artifactId").value(artifactId));
    }

    @Test
    void getMultimediaByArtifactIdShouldReturnOnlyMatchingItems() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Multimedia Filter Site");
        int firstArtifactId = createArtifact(token, siteId, "First Artifact");
        int secondArtifactId = createArtifact(token, siteId, "Second Artifact");

        createMultimedia(token, firstArtifactId, "First Artifact Image");
        createMultimedia(token, secondArtifactId, "Second Artifact Image");

        mockMvc.perform(get("/api/multimedia")
                        .param("artifactId", String.valueOf(firstArtifactId))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title").value("First Artifact Image"))
                .andExpect(jsonPath("$.data[0].artifactId").value(firstArtifactId));
    }

    @Test
    void getMultimediaByUnknownArtifactShouldReturnNotFound() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(get("/api/multimedia")
                        .param("artifactId", "999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getMultimediaByIdShouldReturnItem() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Multimedia Detail Site");
        int artifactId = createArtifact(token, siteId, "Multimedia Detail Artifact");
        int multimediaId = createMultimedia(token, artifactId, "Artifact Audio");

        mockMvc.perform(get("/api/multimedia/{multimediaId}", multimediaId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.multimediaId").value(multimediaId))
                .andExpect(jsonPath("$.data.title").value("Artifact Audio"))
                .andExpect(jsonPath("$.data.artifactId").value(artifactId));
    }

    @Test
    void getUnknownMultimediaShouldReturnNotFound() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(get("/api/multimedia/{multimediaId}", 999999)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminShouldUpdateMultimedia() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Update Multimedia Site");
        int artifactId = createArtifact(token, siteId, "Update Multimedia Artifact");
        int multimediaId = createMultimedia(token, artifactId, "Old Multimedia Title");

        mockMvc.perform(put("/api/multimedia/{multimediaId}", multimediaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validMultimediaRequest(artifactId, "Updated Multimedia Title")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.multimediaId").value(multimediaId))
                .andExpect(jsonPath("$.data.title").value("Updated Multimedia Title"))
                .andExpect(jsonPath("$.data.artifactId").value(artifactId));
    }

    @Test
    void adminShouldDeleteMultimedia() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Delete Multimedia Site");
        int artifactId = createArtifact(token, siteId, "Delete Multimedia Artifact");
        int multimediaId = createMultimedia(token, artifactId, "Multimedia To Delete");

        mockMvc.perform(delete("/api/multimedia/{multimediaId}", multimediaId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertFalse(
                multimediaRepository.existsById(multimediaId));
    }

    @Test
    void createMultimediaShouldRejectBlankType() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Validation Multimedia Site");
        int artifactId = createArtifact(token, siteId, "Validation Multimedia Artifact");

        mockMvc.perform(post("/api/multimedia")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "artifactId": %d,
                                    "type": " ",
                                    "title": "Invalid Media",
                                    "url": "https://example.com/media.jpg"
                                }
                                """.formatted(artifactId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMultimediaShouldRejectBlankUrl() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "URL Validation Site");
        int artifactId = createArtifact(token, siteId, "URL Validation Artifact");

        mockMvc.perform(post("/api/multimedia")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "artifactId": %d,
                                    "type": "IMAGE",
                                    "title": "Invalid URL",
                                    "url": " "
                                }
                                """.formatted(artifactId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMultimediaShouldRejectMissingArtifactId() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/api/multimedia")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "type": "IMAGE",
                                    "title": "Media Without Artifact",
                                    "url": "https://example.com/media.jpg"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMultimediaShouldRejectUnknownArtifactId() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/api/multimedia")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validMultimediaRequest(999999, "Orphan Multimedia")))
                .andExpect(status().isNotFound());
    }

    @Test
    void visitorShouldNotCreateMultimedia() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Permission Multimedia Site");
        int artifactId = createArtifact(adminToken, siteId, "Permission Multimedia Artifact");
        String visitorToken = createVisitorToken();

        mockMvc.perform(post("/api/multimedia")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validMultimediaRequest(artifactId, "Visitor Multimedia")))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitorShouldNotUpdateMultimedia() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Protected Multimedia Site");
        int artifactId = createArtifact(adminToken, siteId, "Protected Multimedia Artifact");
        int multimediaId = createMultimedia(adminToken, artifactId, "Protected Multimedia");
        String visitorToken = createVisitorToken();

        mockMvc.perform(put("/api/multimedia/{multimediaId}", multimediaId)
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validMultimediaRequest(artifactId, "Changed Multimedia")))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitorShouldNotDeleteMultimedia() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Protected Delete Multimedia Site");
        int artifactId = createArtifact(adminToken, siteId, "Protected Delete Multimedia Artifact");
        int multimediaId = createMultimedia(adminToken, artifactId, "Protected Delete Multimedia");
        String visitorToken = createVisitorToken();

        mockMvc.perform(delete("/api/multimedia/{multimediaId}", multimediaId)
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isForbidden());
    }
}
