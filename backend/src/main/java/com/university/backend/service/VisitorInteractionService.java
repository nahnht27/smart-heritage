package com.university.backend.service;

import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.DailyInteractionResponse;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.dto.LanguageCountResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.User;
import com.university.backend.entity.VisitorInteraction;
import com.university.backend.exception.BadRequestException;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.DailyInteractionProjection;
import com.university.backend.repository.UserRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class VisitorInteractionService {
    private static final int POPULAR_ARTIFACTS_LIMIT = 10;
    private static final String UNKNOWN_LANGUAGE = "UNKNOWN";

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
                    if (!isSameIdentity(existing, username, request.getVisitorId())) {
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

    @Transactional(readOnly = true)
    public List<DailyInteractionResponse> getDailyTimeSeries(Instant from, Instant to) {
        List<DailyInteractionProjection> rows =
                interactionRepository.findDailyInteractions(from, to);
        Map<LocalDate, DailyInteractionProjection> rowsByDate = new HashMap<>();
        for (DailyInteractionProjection row : rows) {
            rowsByDate.put(row.getInteractionDate(), row);
        }

        LocalDate firstDate = from.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate lastDate = to.minusNanos(1).atZone(ZoneOffset.UTC).toLocalDate();

        List<DailyInteractionResponse> response = new ArrayList<>();
        for (LocalDate date = firstDate;
                !date.isAfter(lastDate);
                date = date.plusDays(1)) {
            DailyInteractionProjection row = rowsByDate.get(date);
            response.add(new DailyInteractionResponse(
                    date,
                    row == null || row.getTotalInteractions() == null
                            ? 0L
                            : row.getTotalInteractions(),
                    row == null || row.getUniqueVisitors() == null
                            ? 0L
                            : row.getUniqueVisitors()));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<LanguageCountResponse> getLanguageAnalytics(Instant from, Instant to) {
        Map<String, Long> counts = new HashMap<>();
        for (LanguageCountResponse row
                : interactionRepository.countByLanguageInPeriod(from, to)) {
            counts.merge(
                    normalizeLanguage(row.languageCode()),
                    row.interactionCount(),
                    Long::sum);
        }

        return counts.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> new LanguageCountResponse(
                        entry.getKey(), entry.getValue()))
                .toList();
    }

    private String normalizeLanguage(String languageCode) {
        return languageCode == null || languageCode.isBlank()
                ? UNKNOWN_LANGUAGE
                : languageCode.trim();
    }

    private boolean isSameIdentity(
            VisitorInteraction existing,
            String username,
            UUID visitorId) {
        if (username != null) {
            // Authenticated events belong to the principal; the visitor ID may
            // legitimately change after reinstalling the app.
            return existing.getUser() != null
                    && username.equals(existing.getUser().getUsername());
        }
        return existing.getUser() == null
                && Objects.equals(existing.getVisitorId(), visitorId);
    }

    private InteractionCreationResult saveInteraction(
            String username,
            CreateInteractionRequest request) {
        User user = username == null
                ? null
                : userRepository.findByUsername(username)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Artifact artifact = artifactRepository.findById(request.getArtifactId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifact not found with ID: " + request.getArtifactId()));

        VisitorInteraction interaction = new VisitorInteraction();
        interaction.setEventId(request.getEventId());
        interaction.setVisitorId(request.getVisitorId());
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
