package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.OfflineManifestResponse;
import com.university.backend.service.OfflineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offline")
public class OfflineController {

    private final OfflineService offlineService;

    public OfflineController(OfflineService offlineService) {
        this.offlineService = offlineService;
    }

    @GetMapping("/manifest")
    public ResponseEntity<ApiResponse<OfflineManifestResponse>> getManifest() {
        return ResponseEntity.ok(ApiResponse.success(
                "Offline content retrieved successfully",
                offlineService.buildManifest()));
    }
}
