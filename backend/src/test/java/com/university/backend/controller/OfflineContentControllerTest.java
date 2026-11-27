package com.university.backend.controller;

import com.university.backend.entity.Artifact;
import com.university.backend.entity.Beacon;
import com.university.backend.entity.HeritageSite;
import com.university.backend.entity.Multimedia;
import com.university.backend.entity.MultimediaFile;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.MultimediaFileRepository;
import com.university.backend.repository.MultimediaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Runs with open-in-view disabled, exactly like the production profile. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.jpa.open-in-view=false",
        "spring.datasource.url=jdbc:h2:mem:offlinedb;DB_CLOSE_DELAY=-1"
})
class OfflineContentControllerTest extends ContentApiTestSupport {

    private static final byte[] BYTES = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    private static final String SHA = "a".repeat(64);

    @Autowired
    private HeritageSiteRepository siteRepository;
    @Autowired
    private ArtifactRepository artifactRepository;
    @Autowired
    private MultimediaRepository multimediaRepository;
    @Autowired
    private MultimediaFileRepository fileRepository;
    @Autowired
    private BeaconRepository beaconRepository;

    private Artifact artifact;
    private Multimedia stored;
    private Multimedia linked;

    @BeforeEach
    void seed() {
        beaconRepository.deleteAll();
        fileRepository.deleteAll();
        multimediaRepository.deleteAll();
        artifactRepository.deleteAll();
        siteRepository.deleteAll();

        HeritageSite site = new HeritageSite();
        site.setName("Museum");
        site = siteRepository.save(site);

        artifact = new Artifact();
        artifact.setName("Drum");
        artifact.setHeritageSite(site);
        artifact = artifactRepository.save(artifact);

        stored = media("IMAGE", "https://example.com/source.jpg");
        linked = media("AUDIO", "https://example.com/audio.mp3");

        MultimediaFile file = new MultimediaFile();
        file.setMultimediaId(stored.getMultimediaId());
        file.setFileData(BYTES);
        file.setFileName("trống.jpg");
        file.setContentType("image/jpeg");
        file.setFileSize((long) BYTES.length);
        file.setSha256(SHA);
        fileRepository.save(file);

        beaconRepository.save(beacon("On", 1, true));
        beaconRepository.save(beacon("Off", 2, false));
    }

    private Multimedia media(String type, String url) {
        Multimedia item = new Multimedia();
        item.setArtifact(artifact);
        item.setType(type);
        item.setUrl(url);
        return multimediaRepository.save(item);
    }

    private Beacon beacon(String name, int minor, boolean enabled) {
        Beacon beacon = new Beacon();
        beacon.setName(name);
        beacon.setProximityUuid(
                UUID.fromString("e2c56db5-dffb-48d2-b060-d0f5a71096e0"));
        beacon.setMajor(1);
        beacon.setMinor(minor);
        beacon.setEnabled(enabled);
        beacon.setArtifact(artifact);
        return beacon;
    }

    @Test
    void artifactDetailWorksWithoutOpenInView() throws Exception {
        mockMvc.perform(get("/api/artifacts/{id}", artifact.getArtifactId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.siteName").value("Museum"));
    }

    @Test
    void multimediaDetailWorksWithoutOpenInView() throws Exception {
        mockMvc.perform(get("/api/multimedia/{id}", stored.getMultimediaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.artifactName").value("Drum"))
                .andExpect(jsonPath("$.data.hasFileData").value(true))
                .andExpect(jsonPath("$.data.fileSize").value(BYTES.length))
                .andExpect(jsonPath("$.data.sha256").value(SHA))
                .andExpect(jsonPath("$.data.fileData").doesNotExist());
    }

    @Test
    void storedFileIsPubliclyDownloadable() throws Exception {
        mockMvc.perform(get("/api/multimedia/{id}/file", stored.getMultimediaId()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(header().string(HttpHeaders.ETAG, "\"" + SHA + "\""))
                .andExpect(content().bytes(BYTES));
    }

    @Test
    void storedFileSupportsRangeRequests() throws Exception {
        mockMvc.perform(get("/api/multimedia/{id}/file", stored.getMultimediaId())
                        .header(HttpHeaders.RANGE, "bytes=2-4"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 2-4/10"))
                .andExpect(content().bytes(new byte[] {2, 3, 4}));
    }

    @Test
    void itemWithoutStoredFileReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/multimedia/{id}/file", linked.getMultimediaId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void manifestListsPublicContentAndOnlyEnabledBeacons() throws Exception {
        mockMvc.perform(get("/api/offline/manifest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.contentVersion").isString())
                .andExpect(jsonPath("$.data.sites.length()").value(1))
                .andExpect(jsonPath("$.data.artifacts.length()").value(1))
                .andExpect(jsonPath("$.data.multimedia.length()").value(2))
                .andExpect(jsonPath("$.data.multimedia[0].hasFileData").value(true))
                .andExpect(jsonPath("$.data.beacons.length()").value(1))
                .andExpect(jsonPath("$.data.beacons[0].name").value("On"));
    }

    @Test
    void changingTheUrlDropsTheStoredFile() throws Exception {
        String admin = createAdminToken();

        mockMvc.perform(put("/api/multimedia/{id}", stored.getMultimediaId())
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"artifactId": %d, "type": "IMAGE",
                                 "url": "https://example.com/new.jpg"}
                                """.formatted(artifact.getArtifactId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasFileData").value(false));

        assertFalse(fileRepository.existsById(stored.getMultimediaId()));
    }
}
