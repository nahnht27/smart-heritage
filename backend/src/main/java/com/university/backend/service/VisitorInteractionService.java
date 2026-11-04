package com.university.backend.service;

import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.User;
import com.university.backend.entity.VisitorInteraction;
import com.university.backend.exception.BadRequestException;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.UserRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;

@Service
public class VisitorInteractionService {
    private static final int POPULAR_ARTIFACTS_LIMIT = 10;

    // PostgreSQL cannot infer the type of a NULL JDBC parameter used in
    // `(:param is null or ...)`. Use concrete, wide bounds for the "no filter"
    // case instead of binding null; the response still reports the caller's
    // original (possibly null) from/to values.
    private static final Instant UNBOUNDED_FROM = Instant.EPOCH;
    private static final Instant UNBOUNDED_TO =
            Instant.parse("9999-12-31T23:59:59.999Z");

    private final VisitorInteractionRepository interactionRepository;
    private final ArtifactRepository artifactRepository;
    private final UserRepository userRepository;

    public VisitorInteractionService(
            VisitorInteractionRepository interactionRepository,
            ArtifactRepository artifactRepository,
            UserRepository userRepository) {
        this.interactionRepository = interactionRepository;
        this.artifactRepository = artifactRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public InteractionCreationResult createInteraction(
            String username,
            CreateInteractionRequest request) {
        validateTimes(request);

        return interactionRepository.findByEventId(request.getEventId())
                .map(existing -> {
                    if (!existing.getUser().getUsername().equals(username)) {
                        throw new DuplicateResourceException(
                                "eventId has already been used");
                    }
                    return new InteractionCreationResult(existing, false);
                })
                .orElseGet(() -> saveInteraction(username, request));
    }

    @Transactional(readOnly = true)
    public InteractionSummaryResponse getSummary(Instant from, Instant to) {
        Instant queryFrom = from != null ? from : UNBOUNDED_FROM;
        Instant queryTo = to != null ? to : UNBOUNDED_TO;

        return new InteractionSummaryResponse(
                from,
                to,
                interactionRepository.countInPeriod(queryFrom, queryTo),
                interactionRepository.countUniqueVisitorsInPeriod(queryFrom, queryTo),
                interactionRepository.countByTypeInPeriod(queryFrom, queryTo),
                interactionRepository.findPopularArtifactsInPeriod(
                        queryFrom,
                        queryTo,
                        PageRequest.of(0, POPULAR_ARTIFACTS_LIMIT)));
    }

    private InteractionCreationResult saveInteraction(
            String username,
            CreateInteractionRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Artifact artifact = artifactRepository.findById(request.getArtifactId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifact not found with ID: " + request.getArtifactId()));

        VisitorInteraction interaction = new VisitorInteraction();
        interaction.setEventId(request.getEventId());
        interaction.setUser(user);
        interaction.setArtifact(artifact);
        interaction.setInteractionType(
                request.getInteractionType().trim().toUpperCase(Locale.ROOT));
        interaction.setLanguageCode(request.getLanguageCode().trim());
        interaction.setStartedAt(request.getStartedAt());
        interaction.setEndedAt(request.getEndedAt());
        interaction.setInteractedAt(request.getInteractedAt());

        return new InteractionCreationResult(interactionRepository.save(interaction), true);
    }

    private void validateTimes(CreateInteractionRequest request) {
        if (request.getEndedAt() != null
                && request.getEndedAt().isBefore(request.getStartedAt())) {
            throw new BadRequestException("endedAt must not be before startedAt");
        }
    }
}
