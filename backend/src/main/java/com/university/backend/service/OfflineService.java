package com.university.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.dto.ArtifactResponse;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.dto.HeritageSiteResponse;
import com.university.backend.dto.MultimediaResponse;
import com.university.backend.dto.OfflineManifestResponse;
import com.university.backend.repository.BeaconRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

@Service
public class OfflineService {

    private final HeritageSiteService heritageSiteService;
    private final ArtifactService artifactService;
    private final MultimediaService multimediaService;
    private final BeaconRepository beaconRepository;
    private final ObjectMapper objectMapper;

    public OfflineService(
            HeritageSiteService heritageSiteService,
            ArtifactService artifactService,
            MultimediaService multimediaService,
            BeaconRepository beaconRepository,
            ObjectMapper objectMapper) {
        this.heritageSiteService = heritageSiteService;
        this.artifactService = artifactService;
        this.multimediaService = multimediaService;
        this.beaconRepository = beaconRepository;
        this.objectMapper = objectMapper;
    }

    /** One transaction so that all four lists describe the same moment. */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public OfflineManifestResponse buildManifest() {
        List<HeritageSiteResponse> sites = heritageSiteService
                .searchHeritageSites(null, "siteId", "asc")
                .stream()
                .map(HeritageSiteResponse::fromEntity)
                .toList();
        List<ArtifactResponse> artifacts = artifactService
                .searchArtifacts(null, null, "artifactId", "asc")
                .stream()
                .map(ArtifactResponse::fromEntity)
                .toList();
        List<MultimediaResponse> multimedia = multimediaService
                .toResponses(multimediaService.getAllMultimedia(null))
                .stream()
                .sorted(Comparator.comparing(MultimediaResponse::getMultimediaId))
                .toList();
        List<BeaconResponse> beacons = beaconRepository.findAllResolvable()
                .stream()
                .map(BeaconResponse::fromEntity)
                .toList();

        return new OfflineManifestResponse(
                hash(List.of(sites, artifacts, multimedia, beacons)),
                sites,
                artifacts,
                multimedia,
                beacons);
    }

    private String hash(Object content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(objectMapper.writeValueAsBytes(content)));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "Unable to compute the content version", exception);
        }
    }
}
