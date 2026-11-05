package com.university.backend.dto;

import com.university.backend.entity.VisitorInteraction;

import java.time.Instant;

public class InteractionResponse {

    private Integer interactionId;
    private String eventId;
    private Integer artifactId;
    private String interactionType;
    private String languageCode;
    private Instant startedAt;
    private Instant endedAt;
    private Integer durationSeconds;
    private Instant interactedAt;
    private Instant recordedAt;

    public static InteractionResponse fromEntity(VisitorInteraction interaction) {
        InteractionResponse response = new InteractionResponse();
        response.interactionId = interaction.getInteractionId();
        response.eventId = interaction.getEventId();
        response.artifactId = interaction.getArtifact().getArtifactId();
        response.interactionType = interaction.getInteractionType();
        response.languageCode = interaction.getLanguageCode();
        response.startedAt = interaction.getStartedAt();
        response.endedAt = interaction.getEndedAt();
        response.durationSeconds = interaction.getDurationSeconds();
        response.interactedAt = interaction.getInteractedAt();
        response.recordedAt = interaction.getRecordedAt();
        return response;
    }

    public Integer getInteractionId() { return interactionId; }
    public String getEventId() { return eventId; }
    public Integer getArtifactId() { return artifactId; }
    public String getInteractionType() { return interactionType; }
    public String getLanguageCode() { return languageCode; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public Instant getInteractedAt() { return interactedAt; }
    public Instant getRecordedAt() { return recordedAt; }
}
