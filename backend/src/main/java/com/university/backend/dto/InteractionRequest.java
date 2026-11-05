package com.university.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class InteractionRequest {

    @NotBlank(message = "eventId is required")
    @Size(max = 36, message = "eventId must be at most 36 characters")
    private String eventId;

    @NotNull(message = "artifactId is required")
    @Positive(message = "artifactId must be positive")
    private Integer artifactId;

    @NotBlank(message = "interactionType is required")
    private String interactionType;

    @Size(max = 10, message = "languageCode must be at most 10 characters")
    private String languageCode;

    private Instant startedAt;

    private Instant endedAt;

    private Instant interactedAt;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Integer getArtifactId() { return artifactId; }
    public void setArtifactId(Integer artifactId) { this.artifactId = artifactId; }

    public String getInteractionType() { return interactionType; }
    public void setInteractionType(String interactionType) {
        this.interactionType = interactionType;
    }

    public String getLanguageCode() { return languageCode; }
    public void setLanguageCode(String languageCode) { this.languageCode = languageCode; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public Instant getInteractedAt() { return interactedAt; }
    public void setInteractedAt(Instant interactedAt) { this.interactedAt = interactedAt; }
}
