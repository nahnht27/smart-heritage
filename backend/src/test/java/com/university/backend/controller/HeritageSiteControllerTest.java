
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
class HeritageSiteControllerTest extends ContentApiTestSupport {

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private MultimediaRepository multimediaRepository;

    @BeforeEach
    void cleanHeritageSiteTestData() {
        multimediaRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
    }

    private String validRequest(String name) {
        return """
                {
                    "name": "%s",
                    "description": "Historical heritage site",
                    "address": "Vietnam",
                    "latitude": 10.762622,
                    "longitude": 106.660172
                }
                """.formatted(name);
    }

    private int createSite(String token, String name) throws Exception {
        String response = mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(response).path("data");
        return data.path("siteId").asInt();
    }

    @Test
    void getAllHeritageSitesShouldReturnOk() throws Exception {
        String token = createAdminToken();
        createSite(token, "Test Heritage Site");

        mockMvc.perform(get("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Test Heritage Site"));
    }

    @Test
    void getHeritageSiteByIdShouldReturnSite() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Test Heritage Site");

        mockMvc.perform(get("/api/heritage-sites/{siteId}", siteId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.siteId").value(siteId))
                .andExpect(jsonPath("$.data.name").value("Test Heritage Site"));
    }

    @Test
    void adminShouldCreateHeritageSite() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest("New Heritage Site")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("New Heritage Site"));
    }

    @Test
    void adminShouldUpdateHeritageSite() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Old Name");

        mockMvc.perform(put("/api/heritage-sites/{siteId}", siteId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest("Updated Name")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Updated Name"));
    }

    @Test
    void adminShouldDeleteHeritageSite() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Site To Delete");

        mockMvc.perform(delete("/api/heritage-sites/{siteId}", siteId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertFalse(
                heritageSiteRepository.existsById(siteId));
    }

    @Test
    void visitorShouldNotCreateHeritageSite() throws Exception {
        String token = createVisitorToken();

        mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest("Visitor Site")))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitorShouldNotUpdateHeritageSite() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Original Name");

        String visitorToken = createVisitorToken();

        mockMvc.perform(put("/api/heritage-sites/{siteId}", siteId)
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest("Changed Name")))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitorShouldNotDeleteHeritageSite() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Protected Site");

        String visitorToken = createVisitorToken();

        mockMvc.perform(delete("/api/heritage-sites/{siteId}", siteId)
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void createShouldRejectBlankName() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": " ",
                                    "description": "Invalid site",
                                    "address": "Vietnam",
                                    "latitude": 10.762622,
                                    "longitude": 106.660172
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

        @Test
    void searchHeritageSitesByKeywordShouldReturnMatchingSites() throws Exception {
        String token = createAdminToken();

        createSite(token, "Hue Imperial Citadel");
        createSite(token, "Hoi An Ancient Town");

        mockMvc.perform(get("/api/heritage-sites")
                        .param("keyword", "  hue  ")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Hue Imperial Citadel"));
    }

    @Test
    void searchHeritageSitesShouldSupportPagination() throws Exception {
        String token = createAdminToken();

        createSite(token, "Heritage Site A");
        createSite(token, "Heritage Site B");
        createSite(token, "Heritage Site C");

        mockMvc.perform(get("/api/heritage-sites")
                        .param("page", "0")
                        .param("size", "2")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2));
    }

    @Test
    void searchHeritageSitesShouldSupportDescendingSort() throws Exception {
        String token = createAdminToken();

        createSite(token, "Heritage Site A");
        createSite(token, "Heritage Site C");
        createSite(token, "Heritage Site B");

        mockMvc.perform(get("/api/heritage-sites")
                        .param("sortBy", "name")
                        .param("direction", "desc")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Heritage Site C"))
                .andExpect(jsonPath("$.data[1].name").value("Heritage Site B"))
                .andExpect(jsonPath("$.data[2].name").value("Heritage Site A"));
    }

    @Test
    void searchHeritageSitesShouldRejectInvalidPageSize() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(get("/api/heritage-sites")
                        .param("page", "0")
                        .param("size", "101")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }
}
