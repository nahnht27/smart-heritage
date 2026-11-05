package com.university.backend.entity;

import jakarta.persistence.*;

import java.time.Instant;

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

    @Column(name = "event_id", nullable = false, unique = true, length = 36)
    private String eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artifact_id", nullable = false)
    private Artifact artifact;

    @Column(name = "interaction_type", nullable = false, length = 20)
    private String interactionType;

    @Column(name = "language_code", length = 10)
    private String languageCode;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "interacted_at", nullable = false)
    private Instant interactedAt;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    public VisitorInteraction() {}

    public Integer getInteractionId() { return interactionId; }
    public void setInteractionId(Integer interactionId) {
        this.interactionId = interactionId;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Artifact getArtifact() { return artifact; }
    public void setArtifact(Artifact artifact) { this.artifact = artifact; }

    public String getInteractionType() { return interactionType; }
    public void setInteractionType(String interactionType) {
        this.interactionType = interactionType;
    }

    public String getLanguageCode() { return languageCode; }
    public void setLanguageCode(String languageCode) {
        this.languageCode = languageCode;
    }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Instant getInteractedAt() { return interactedAt; }
    public void setInteractedAt(Instant interactedAt) {
        this.interactedAt = interactedAt;
    }

    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
