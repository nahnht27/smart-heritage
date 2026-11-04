package com.university.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * M2 contract: content GET endpoints are public for anonymous visitors, while
 * writes still require a JWT with the ADMIN role.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicContentAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void heritageSitesGetIsPublic() throws Exception {
        mockMvc.perform(get("/api/heritage-sites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void artifactsGetIsPublic() throws Exception {
        mockMvc.perform(get("/api/artifacts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void multimediaGetIsPublic() throws Exception {
        mockMvc.perform(get("/api/multimedia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void anonymousWriteIsRejected() throws Exception {
        mockMvc.perform(post("/api/heritage-sites")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Anonymous attempt",
                                    "description": "should fail",
                                    "address": "nowhere",
                                    "latitude": 10.0,
                                    "longitude": 106.0
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }
}
