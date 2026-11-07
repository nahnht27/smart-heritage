package com.university.backend.dto;

import com.university.backend.entity.VisitorInteraction;

import java.time.Instant;
import java.util.UUID;

public record InteractionRecordResponse(
        Integer interactionId,
        UUID eventId,
        Integer artifactId,
        Integer beaconId,
        String interactionType,
        String languageCode,
        Instant startedAt,
        Instant endedAt,
        Long durationSeconds,
        Instant interactedAt) {

    public static InteractionRecordResponse fromEntity(VisitorInteraction interaction) {
        return new InteractionRecordResponse(
                interaction.getInteractionId(),
                interaction.getEventId(),
                interaction.getArtifact().getArtifactId(),
                interaction.getBeacon() == null ? null : interaction.getBeacon().getBeaconId(),
                interaction.getInteractionType(),
                interaction.getLanguageCode(),
                interaction.getStartedAt(),
                interaction.getEndedAt(),
                interaction.getDurationSeconds(),
                interaction.getInteractedAt());
    }
}
