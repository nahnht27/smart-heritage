
package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.ArtifactRequest;
import com.university.backend.dto.ArtifactResponse;
import com.university.backend.dto.PageResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.service.ArtifactService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/artifacts")
public class ArtifactController {

    private final ArtifactService artifactService;

    public ArtifactController(ArtifactService artifactService) {
        this.artifactService = artifactService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAllArtifacts(
            @RequestParam(required = false) Integer siteId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            List<ArtifactResponse> artifacts = artifactService
                    .searchArtifacts(siteId, keyword, sortBy, direction)
                    .stream()
                    .map(ArtifactResponse::fromEntity)
                    .toList();

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Artifacts retrieved successfully",
                            artifacts
                    )
            );
        }

        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;

        Page<ArtifactResponse> artifacts = artifactService
                .searchArtifacts(
                        siteId,
                        keyword,
                        pageNumber,
                        pageSize,
                        sortBy,
                        direction
                )
                .map(ArtifactResponse::fromEntity);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Artifacts retrieved successfully",
                        PageResponse.from(artifacts)
                )
        );
    }

    @GetMapping("/{artifactId}")
    public ResponseEntity<ApiResponse<ArtifactResponse>> getArtifactById(
            @PathVariable Integer artifactId) {

        Artifact artifact = artifactService.getArtifactById(artifactId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Artifact retrieved successfully",
                        ArtifactResponse.fromEntity(artifact)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<ArtifactResponse>> createArtifact(
            @Valid @RequestBody ArtifactRequest request) {

        Artifact artifact = new Artifact();
        artifact.setName(request.getName());
        artifact.setDescription(request.getDescription());

        Artifact createdArtifact = artifactService.createArtifact(
                artifact, request.getSiteId());

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(
                        "Artifact created successfully",
                        ArtifactResponse.fromEntity(createdArtifact)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{artifactId}")
    public ResponseEntity<ApiResponse<ArtifactResponse>> updateArtifact(
            @PathVariable Integer artifactId,
            @Valid @RequestBody ArtifactRequest request) {

        Artifact updatedArtifact = new Artifact();
        updatedArtifact.setName(request.getName());
        updatedArtifact.setDescription(request.getDescription());

        Artifact artifact = artifactService.updateArtifact(
                artifactId, updatedArtifact, request.getSiteId());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Artifact updated successfully",
                        ArtifactResponse.fromEntity(artifact)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{artifactId}")
    public ResponseEntity<ApiResponse<Void>> deleteArtifact(
            @PathVariable Integer artifactId) {

        artifactService.deleteArtifact(artifactId);

        return ResponseEntity.ok(
                ApiResponse.success("Artifact deleted successfully", null));
    }
}
