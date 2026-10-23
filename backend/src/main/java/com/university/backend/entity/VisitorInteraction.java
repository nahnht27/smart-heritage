package com.university.backend.entity;

import jakarta.persistence.*;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "visitor_interaction",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_visitor_interaction_event_id",
                columnNames = "event_id"))
public class VisitorInteraction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interaction_id")
    private Integer interactionId;

    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artifact_id", nullable = false)
    private Artifact artifact;

    @Column(name = "interaction_type", nullable = false, length = 50)
    private String interactionType;

    @Column(name = "language_code", nullable = false, length = 16)
    private String languageCode;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Column(name = "interacted_at", nullable = false)
    private Instant interactedAt;

    public VisitorInteraction() {
    }

    public Integer getInteractionId() {
        return interactionId;
    }

    public void setInteractionId(Integer interactionId) {
        this.interactionId = interactionId;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Artifact getArtifact() {
        return artifact;
    }

    public void setArtifact(Artifact artifact) {
        this.artifact = artifact;
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
        this.durationSeconds = endedAt == null || startedAt == null
                ? null
                : Duration.between(startedAt, endedAt).getSeconds();
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public Instant getInteractedAt() {
        return interactedAt;
    }

    public void setInteractedAt(Instant interactedAt) {
        this.interactedAt = interactedAt;
    }
}
