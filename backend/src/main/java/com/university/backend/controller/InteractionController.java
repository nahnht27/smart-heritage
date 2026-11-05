package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.InteractionRequest;
import com.university.backend.dto.InteractionResponse;
import com.university.backend.service.InteractionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interactions")
public class InteractionController {

    private final InteractionService interactionService;

    public InteractionController(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InteractionResponse>> recordInteraction(
            @Valid @RequestBody InteractionRequest request,
            Authentication authentication) {

        InteractionService.InteractionRecordResult result =
                interactionService.recordInteraction(
                        authentication.getName(), request);

        HttpStatus status = result.created()
                ? HttpStatus.CREATED
                : HttpStatus.OK;
        String message = result.created()
                ? "Interaction recorded successfully"
                : "Interaction already recorded";

        return ResponseEntity.status(status).body(
                ApiResponse.success(
                        message,
                        InteractionResponse.fromEntity(result.interaction())));
    }
}
