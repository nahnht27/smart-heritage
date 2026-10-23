package com.university.backend.dto;

import java.time.Instant;
import java.util.List;

public record InteractionSummaryResponse(
        Instant from,
        Instant to,
        long totalInteractions,
        long uniqueVisitors,
        List<InteractionTypeCountResponse> interactionTypes,
        List<PopularArtifactResponse> popularArtifacts) {
}
