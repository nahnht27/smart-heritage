package com.university.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public class CreateInteractionRequest {
    @NotNull
    private UUID eventId;

    @NotNull
    @Positive
    private Integer artifactId;

    @NotBlank
    @Pattern(regexp = "(?i:VIEW|AUDIO_PLAY|SCAN)")
    private String interactionType;

    @NotBlank
    @Size(max = 16)
    @Pattern(regexp = "[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*")
    private String languageCode;

    @NotNull
    private Instant startedAt;

    private Instant endedAt;

    @NotNull
    private Instant interactedAt;

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public Integer getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(Integer artifactId) {
        this.artifactId = artifactId;
    }

    public String getInteractionType() {
        return interactionType;
    }

    public void setInteractionType(String interactionType) {
        this.interactionType = interactionType;
    }

    public String getLanguageCode() {
        return languageCode;
    }

    public void setLanguageCode(String languageCode) {
        this.languageCode = languageCode;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public Instant getInteractedAt() {
        return interactedAt;
    }

    public void setInteractedAt(Instant interactedAt) {
        this.interactedAt = interactedAt;
    }
}
