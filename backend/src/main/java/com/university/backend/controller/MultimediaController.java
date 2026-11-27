package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.MultimediaRequest;
import com.university.backend.dto.MultimediaResponse;
import com.university.backend.entity.Multimedia;
import com.university.backend.entity.MultimediaFile;
import com.university.backend.service.MultimediaService;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/multimedia")
public class MultimediaController {

    private final MultimediaService multimediaService;

    public MultimediaController(MultimediaService multimediaService) {
        this.multimediaService = multimediaService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MultimediaResponse>>> getAllMultimedia(
            @RequestParam(required = false) Integer artifactId) {

        List<MultimediaResponse> multimediaList = multimediaService.toResponses(
                multimediaService.getAllMultimedia(artifactId));

        return ResponseEntity.ok(
                ApiResponse.success("Multimedia retrieved successfully", multimediaList));
    }

    @GetMapping("/{multimediaId}")
    public ResponseEntity<ApiResponse<MultimediaResponse>> getMultimediaById(
            @PathVariable Integer multimediaId) {

        Multimedia multimedia = multimediaService.getMultimediaById(multimediaId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Multimedia retrieved successfully",
                        multimediaService.toResponse(multimedia)));
    }

    /**
     * Serves the stored bytes. Spring handles HTTP range requests for resource
     * bodies, which media players rely on for seeking.
     */
    @GetMapping("/{multimediaId}/file")
    public ResponseEntity<ByteArrayResource> downloadMultimediaFile(
            @PathVariable Integer multimediaId) {

        MultimediaFile file = multimediaService.getMultimediaFile(multimediaId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .eTag("\"" + file.getSha256() + "\"")
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline()
                                .filename(file.getFileName(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .body(new ByteArrayResource(file.getFileData()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<MultimediaResponse>> createMultimedia(
            @Valid @RequestBody MultimediaRequest request) {

        Multimedia multimedia = new Multimedia();
        multimedia.setType(request.getType());
        multimedia.setTitle(request.getTitle());
        multimedia.setUrl(request.getUrl());

        Multimedia createdMultimedia = multimediaService.createMultimedia(
                multimedia, request.getArtifactId());

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(
                        "Multimedia created successfully",
                        MultimediaResponse.fromEntity(createdMultimedia)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{multimediaId}")
    public ResponseEntity<ApiResponse<MultimediaResponse>> updateMultimedia(
            @PathVariable Integer multimediaId,
            @Valid @RequestBody MultimediaRequest request) {

        Multimedia updatedMultimedia = new Multimedia();
        updatedMultimedia.setType(request.getType());
        updatedMultimedia.setTitle(request.getTitle());
        updatedMultimedia.setUrl(request.getUrl());

        Multimedia multimedia = multimediaService.updateMultimedia(
                multimediaId, updatedMultimedia, request.getArtifactId());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Multimedia updated successfully",
                        multimediaService.toResponse(multimedia)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{multimediaId}")
    public ResponseEntity<ApiResponse<Void>> deleteMultimedia(
            @PathVariable Integer multimediaId) {

        multimediaService.deleteMultimedia(multimediaId);

        return ResponseEntity.ok(
                ApiResponse.success("Multimedia deleted successfully", null));
    }
}
