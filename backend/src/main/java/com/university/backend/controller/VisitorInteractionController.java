package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionRecordResponse;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.exception.BadRequestException;
import com.university.backend.service.VisitorInteractionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;

@RestController
public class VisitorInteractionController {
    private static final Duration MAX_SUMMARY_RANGE = Duration.ofDays(90);

    private final VisitorInteractionService interactionService;

    public VisitorInteractionController(VisitorInteractionService interactionService) {
        this.interactionService = interactionService;
    }

    @PostMapping("/api/interactions")
    public ResponseEntity<ApiResponse<InteractionRecordResponse>> createInteraction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateInteractionRequest request) {
        InteractionCreationResult result =
                interactionService.createInteraction(userDetails.getUsername(), request);
        InteractionRecordResponse response =
                InteractionRecordResponse.fromEntity(result.interaction());
        if (!result.created()) {
            return ResponseEntity.ok(ApiResponse.success(
                    "Interaction event was already recorded", response));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Interaction recorded successfully", response));
    }

    @GetMapping("/api/analytics/interactions/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InteractionSummaryResponse>> getSummary(
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        validateRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(
                "Interaction summary retrieved successfully",
                interactionService.getSummary(from, to)));
    }

    private void validateRange(Instant from, Instant to) {
        if ((from == null) != (to == null)) {
            throw new BadRequestException(
                    "Both from and to must be provided together");
        }
        if (from != null && !from.isBefore(to)) {
            throw new BadRequestException("from must be earlier than to");
        }
        if (from != null && Duration.between(from, to).compareTo(MAX_SUMMARY_RANGE) > 0) {
            throw new BadRequestException("Date range must not exceed 90 days");
        }
    }
}
