
package com.university.backend.integration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("postgres-test")
class ContentRelationshipPostgresIT {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MockMvc mockMvc;

    private final String marker = "LTJ69-" + UUID.randomUUID();

    private Integer siteId;
    private Integer artifactId;
    private Integer multimediaId;

    @BeforeEach
    void createContentFixtures() {
        siteId = jdbcTemplate.queryForObject(
                """
                INSERT INTO heritage_site(name)
                VALUES (?)
                RETURNING site_id
                """,
                Integer.class,
                marker + "-Site"
        );

        artifactId = jdbcTemplate.queryForObject(
                """
                INSERT INTO artifact(name, description, site_id)
                VALUES (?, ?, ?)
                RETURNING artifact_id
                """,
                Integer.class,
                marker + "-Artifact",
                "LTJ-69 PostgreSQL relationship fixture",
                siteId
        );

        multimediaId = jdbcTemplate.queryForObject(
                """
                INSERT INTO multimedia(type, title, url, artifact_id)
                VALUES (?, ?, ?, ?)
                RETURNING multimedia_id
                """,
                Integer.class,
                "IMAGE",
                marker + "-Multimedia",
                "https://example.com/ltj69/" + marker,
                artifactId
        );
    }

    @AfterEach
    void cleanUpFixtures() {
        if (multimediaId != null) {
            jdbcTemplate.update(
                    "DELETE FROM multimedia WHERE multimedia_id = ?",
                    multimediaId
            );
        }

        if (artifactId != null) {
            jdbcTemplate.update(
                    "DELETE FROM artifact WHERE artifact_id = ?",
                    artifactId
            );
        }

        if (siteId != null) {
            jdbcTemplate.update(
                    "DELETE FROM heritage_site WHERE site_id = ?",
                    siteId
            );
        }
    }

    @Test
    void shouldExposeSiteArtifactMultimediaRelationshipThroughPostgresApis()
            throws Exception {

        // Site detail
        mockMvc.perform(get("/api/heritage-sites/{siteId}", siteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.siteId").value(siteId))
                .andExpect(jsonPath("$.data.name").value(marker + "-Site"));

        // Artifact belongs to the expected Site
        mockMvc.perform(get("/api/artifacts")
                        .param("siteId", String.valueOf(siteId))
                        .param("keyword", marker))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].artifactId").value(artifactId))
                .andExpect(jsonPath("$.data[0].siteId").value(siteId))
                .andExpect(jsonPath("$.data[0].name").value(marker + "-Artifact"));

        // Multimedia belongs to the expected Artifact
        mockMvc.perform(get("/api/multimedia")
                        .param("artifactId", String.valueOf(artifactId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].multimediaId").value(multimediaId))
                .andExpect(jsonPath("$.data[0].artifactId").value(artifactId))
                .andExpect(jsonPath("$.data[0].title").value(marker + "-Multimedia"));
    }
}
