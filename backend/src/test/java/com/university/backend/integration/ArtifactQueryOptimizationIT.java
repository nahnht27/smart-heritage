package com.university.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.entity.Multimedia;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
@AutoConfigureMockMvc
@ActiveProfiles("postgres-test")
class ArtifactQueryOptimizationIT {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final List<Integer> siteIds = new ArrayList<>();
    private final List<Integer> artifactIds = new ArrayList<>();
    private final List<Integer> multimediaIds = new ArrayList<>();

    private final String marker = "LTJ56-" + UUID.randomUUID();

    private Statistics statistics;

    @BeforeEach
    void setUpFixtures() {
        statistics = entityManagerFactory
                .unwrap(SessionFactory.class)
                .getStatistics();

        statistics.setStatisticsEnabled(true);

        int sharedSiteId = createSite("shared");
        int secondSiteId = createSite("second");
        int thirdSiteId = createSite("third");

        createArtifact(
                marker + "-A-no-media", sharedSiteId);

        int oneMediaArtifactId = createArtifact(
                marker + "-B-one-media", sharedSiteId);

        int multipleMediaArtifactId = createArtifact(
                marker + "-C-multiple-media", secondSiteId);

        createArtifact(marker + "-D-other-site", thirdSiteId);

        createMultimedia(oneMediaArtifactId, "one-image");

        createMultimedia(multipleMediaArtifactId, "multiple-image-1");
        createMultimedia(multipleMediaArtifactId, "multiple-image-2");

        int[] siteIdsForBulk = {
                sharedSiteId, secondSiteId, thirdSiteId
        };

        for (int i = 0; i < 20; i++) {
            int siteId = siteIdsForBulk[i % siteIdsForBulk.length];

            createArtifact(
                    marker + "-bulk-" + String.format("%02d", i),
                    siteId
            );
        }

        assertEquals(24, artifactIds.size());
        assertEquals(3, siteIds.size());
        assertEquals(3, multimediaIds.size());
        statistics.clear();
    }

    @AfterEach
    void cleanUpFixtures() {
        for (Integer id : multimediaIds) {
            jdbcTemplate.update(
                    "delete from multimedia where multimedia_id = ?", id);
        }

        for (Integer id : artifactIds) {
            jdbcTemplate.update(
                    "delete from artifact where artifact_id = ?", id);
        }

        for (Integer id : siteIds) {
            jdbcTemplate.update(
                    "delete from heritage_site where site_id = ?", id);
        }
    }

    @Test
    void measuresUnpagedArtifactQueryAfterOptimization() throws Exception {
        statistics.clear();

        mockMvc.perform(get("/api/artifacts")
                        .param("keyword", marker)
                        .param("sortBy", "name")
                        .param("direction", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(24)));

        long statementCount = statistics.getPrepareStatementCount();
        assertEquals(1L, statementCount,
                "Truy vấn Artifact không phân trang phải dùng 1 câu SQL");

        long siteLoadCount = statistics.getEntityStatistics(
                "com.university.backend.entity.HeritageSite"
        ).getLoadCount();
        long multimediaLoadCount = statistics.getEntityStatistics(
                Multimedia.class.getName()
        ).getLoadCount();

        System.out.println(
                "[LTJ-56 AFTER] Unpaged SQL statements = "
                        + statementCount);
        System.out.println(
                "[LTJ-56 AFTER] HeritageSite entity loads = "
                        + siteLoadCount);
        System.out.println(
                "[LTJ-56 AFTER] Multimedia entity loads = "
                        + multimediaLoadCount);

        assertEquals(
                0L,
                multimediaLoadCount,
                "Artifact API không được tải Entity Multimedia"
        );
    }

    @Test
    void filtersArtifactsBySiteIdAfterOptimization() throws Exception {
        int targetSiteId = siteIds.get(0);

        mockMvc.perform(get("/api/artifacts")
                        .param("siteId", String.valueOf(targetSiteId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(9)))
                .andExpect(jsonPath("$.data[*].siteId",
                        everyItem(is(targetSiteId))));
    }

    @Test
    void measuresPagedArtifactQueryAfterOptimization() throws Exception {
        statistics.clear();

        mockMvc.perform(get("/api/artifacts")
                        .param("keyword", marker)
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortBy", "name")
                        .param("direction", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(10)))
                .andExpect(jsonPath("$.data.totalElements").value(24))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(10));

        long statementCount = statistics.getPrepareStatementCount();
        assertEquals(2L, statementCount,
                "Truy vấn Artifact phân trang phải dùng 1 câu SELECT và 1 câu COUNT");

        long multimediaLoadCount = statistics.getEntityStatistics(
                Multimedia.class.getName()
        ).getLoadCount();

        System.out.println(
                "[LTJ-56 AFTER] Paged SQL statements = "
                        + statementCount);
        System.out.println(
                "[LTJ-56 AFTER] Paged Multimedia entity loads = "
                        + multimediaLoadCount);

        assertEquals(
                0L,
                multimediaLoadCount,
                "Truy vấn Artifact có phân trang không được tải Multimedia"
        );
    }

    @Test
    void handlesLargePagedArtifactResultWithoutDuplicateArtifacts()
            throws Exception {

        for (int i = 0; i < 125; i++) {
            createArtifact(
                    marker + "-large-" + String.format("%03d", i),
                    siteIds.get(i % siteIds.size())
            );
        }

        assertEquals(149, artifactIds.size());

        String firstPageResponse = mockMvc.perform(get("/api/artifacts")
                        .param("keyword", marker)
                        .param("page", "0")
                        .param("size", "100")
                        .param("sortBy", "name")
                        .param("direction", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String secondPageResponse = mockMvc.perform(get("/api/artifacts")
                        .param("keyword", marker)
                        .param("page", "1")
                        .param("size", "100")
                        .param("sortBy", "name")
                        .param("direction", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode firstPageJson = objectMapper.readTree(firstPageResponse);
        JsonNode secondPageJson = objectMapper.readTree(secondPageResponse);

        assertEquals(
                149,
                firstPageJson.path("data").path("totalElements").asInt()
        );
        assertEquals(
                149,
                secondPageJson.path("data").path("totalElements").asInt()
        );

        List<Integer> firstPageIds = extractArtifactIds(firstPageJson);
        List<Integer> secondPageIds = extractArtifactIds(secondPageJson);

        assertEquals(100, firstPageIds.size());
        assertEquals(49, secondPageIds.size());

        assertEquals(
                firstPageIds.size(),
                new HashSet<>(firstPageIds).size(),
                "Trang đầu không được chứa Artifact trùng ID"
        );

        assertEquals(
                secondPageIds.size(),
                new HashSet<>(secondPageIds).size(),
                "Trang thứ hai không được chứa Artifact trùng ID"
        );

        Set<Integer> allIds = new HashSet<>(firstPageIds);
        allIds.addAll(secondPageIds);

        assertEquals(
                149,
                allIds.size(),
                "Hai trang phải chứa đủ 149 Artifact với ID không trùng nhau"
        );
    }
    @Test
    void measuresEmptyArtifactQueryAfterOptimization() throws Exception {
        statistics.clear();

        mockMvc.perform(get("/api/artifacts")
                        .param("keyword", marker + "-not-found"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(0)));

        long statementCount = statistics.getPrepareStatementCount();
        assertEquals(1L, statementCount,
                "Truy vấn không có kết quả phải dùng 1 câu SQL");

        System.out.println(
                "[LTJ-56 AFTER] Empty result SQL statements = "
                        + statementCount);
    }

    private List<Integer> extractArtifactIds(JsonNode response) {
        JsonNode content = response.path("data").path("content");
        List<Integer> ids = new ArrayList<>();

        for (JsonNode artifact : content) {
            ids.add(artifact.path("artifactId").asInt());
        }

        return ids;
    }
    private int createSite(String suffix) {
        Integer id = jdbcTemplate.queryForObject(
                """
                insert into heritage_site(name)
                values (?)
                returning site_id
                """,
                Integer.class,
                marker + "-site-" + suffix
        );

        siteIds.add(id);
        return id;
    }

    private int createArtifact(String name, int siteId) {
        Integer id = jdbcTemplate.queryForObject(
                """
                insert into artifact(name, description, site_id)
                values (?, ?, ?)
                returning artifact_id
                """,
                Integer.class,
                name,
                "LTJ-56 integration fixture",
                siteId
        );

        artifactIds.add(id);
        return id;
    }

    private void createMultimedia(int artifactId, String title) {
        Integer id = jdbcTemplate.queryForObject(
                """
                insert into multimedia(type, title, url, artifact_id)
                values (?, ?, ?, ?)
                returning multimedia_id
                """,
                Integer.class,
                "IMAGE",
                title,
                "https://example.com/ltj56/" + title,
                artifactId
        );

        multimediaIds.add(id);
    }
}
