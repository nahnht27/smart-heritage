package com.university.backend.service;

import com.university.backend.dto.InteractionRequest;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.User;
import com.university.backend.entity.VisitorInteraction;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.InvalidInteractionException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.UserRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class InteractionService {

    private static final Set<String> SUPPORTED_TYPES =
            Set.of("VIEW", "AUDIO_PLAY", "SCAN");

    private final VisitorInteractionRepository interactionRepository;
    private final UserRepository userRepository;
    private final ArtifactRepository artifactRepository;

    public InteractionService(
            VisitorInteractionRepository interactionRepository,
            UserRepository userRepository,
            ArtifactRepository artifactRepository) {
        this.interactionRepository = interactionRepository;
        this.userRepository = userRepository;
        this.artifactRepository = artifactRepository;
    }

    @Transactional
    public InteractionRecordResult recordInteraction(
            String username,
            InteractionRequest request) {

        String eventId = request.getEventId().trim();
        String interactionType = request.getInteractionType()
                .trim()
                .toUpperCase(Locale.ROOT);

        if (!SUPPORTED_TYPES.contains(interactionType)) {
            throw new InvalidInteractionException(
                    "Unsupported interactionType: " + request.getInteractionType()
                            + ". Supported values: VIEW, AUDIO_PLAY, SCAN");
        }

        Optional<VisitorInteraction> existing =
                interactionRepository.findByEventId(eventId);
        if (existing.isPresent()) {
            return new InteractionRecordResult(existing.get(), false);
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + username));

        Artifact artifact = artifactRepository.findById(request.getArtifactId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifact not found with ID: " + request.getArtifactId()));

        Instant startedAt = request.getStartedAt() != null
                ? request.getStartedAt()
                : Instant.now();
        Instant endedAt = request.getEndedAt();
        Instant interactedAt = request.getInteractedAt() != null
                ? request.getInteractedAt()
                : startedAt;

        VisitorInteraction interaction = new VisitorInteraction();
        interaction.setEventId(eventId);
        interaction.setUser(user);
        interaction.setArtifact(artifact);
        interaction.setInteractionType(interactionType);
        interaction.setLanguageCode(normalizeLanguageCode(request.getLanguageCode()));
        interaction.setStartedAt(startedAt);
        interaction.setEndedAt(endedAt);
        interaction.setDurationSeconds(calculateDuration(startedAt, endedAt));
        interaction.setInteractedAt(interactedAt);
        interaction.setRecordedAt(Instant.now());

        try {
            VisitorInteraction saved = interactionRepository.saveAndFlush(interaction);
            return new InteractionRecordResult(saved, true);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException(
                    "Interaction already recorded for eventId: " + eventId);
        }
    }

    private String normalizeLanguageCode(String languageCode) {
        if (languageCode == null) {
            return null;
        }
        String trimmed = languageCode.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Integer calculateDuration(Instant startedAt, Instant endedAt) {
        if (startedAt == null || endedAt == null) {
            return null;
        }

        long seconds = Duration.between(startedAt, endedAt).getSeconds();
        if (seconds < 0) {
            seconds = 0;
        }
        return seconds > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) seconds;
    }

    public record InteractionRecordResult(
            VisitorInteraction interaction,
            boolean created) {}
}
