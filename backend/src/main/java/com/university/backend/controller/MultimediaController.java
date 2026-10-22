package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.MultimediaRequest;
import com.university.backend.dto.MultimediaResponse;
import com.university.backend.entity.Multimedia;
import com.university.backend.service.MultimediaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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

        List<MultimediaResponse> multimediaList = multimediaService
                .getAllMultimedia(artifactId)
                .stream()
                .map(MultimediaResponse::fromEntity)
                .toList();

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
                        MultimediaResponse.fromEntity(multimedia)));
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
                        MultimediaResponse.fromEntity(multimedia)));
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
