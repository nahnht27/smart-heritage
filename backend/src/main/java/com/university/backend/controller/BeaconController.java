package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.service.BeaconService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/beacons")
public class BeaconController {

    private final BeaconService beaconService;

    public BeaconController(BeaconService beaconService) {
        this.beaconService = beaconService;
    }

    @GetMapping("/resolve")
    public ResponseEntity<ApiResponse<BeaconResponse>> resolveBeacon(
            @RequestParam UUID uuid,
            @RequestParam @Min(0) @Max(65535) Integer major,
            @RequestParam @Min(0) @Max(65535) Integer minor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Beacon resolved successfully",
                beaconService.resolveBeacon(uuid, major, minor)));
    }
}
