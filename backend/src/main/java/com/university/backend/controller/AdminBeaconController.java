package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.BeaconRequest;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.service.BeaconService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/beacons")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBeaconController {

    private final BeaconService beaconService;

    public AdminBeaconController(BeaconService beaconService) {
        this.beaconService = beaconService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BeaconResponse>>> getAllBeacons() {
        return ResponseEntity.ok(ApiResponse.success(
                "Beacons retrieved successfully",
                beaconService.getAllBeacons()));
    }

    @GetMapping("/{beaconId}")
    public ResponseEntity<ApiResponse<BeaconResponse>> getBeaconById(
            @PathVariable Integer beaconId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Beacon retrieved successfully",
                beaconService.getBeaconById(beaconId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BeaconResponse>> createBeacon(
            @Valid @RequestBody BeaconRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(
                        "Beacon created successfully",
                        beaconService.createBeacon(request)));
    }

    @PutMapping("/{beaconId}")
    public ResponseEntity<ApiResponse<BeaconResponse>> updateBeacon(
            @PathVariable Integer beaconId,
            @Valid @RequestBody BeaconRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Beacon updated successfully",
                beaconService.updateBeacon(beaconId, request)));
    }

    @DeleteMapping("/{beaconId}")
    public ResponseEntity<ApiResponse<Void>> deleteBeacon(
            @PathVariable Integer beaconId) {
        beaconService.deleteBeacon(beaconId);
        return ResponseEntity.ok(ApiResponse.success(
                "Beacon deleted successfully",
                null));
    }
}
