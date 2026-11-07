package com.university.backend.service;

import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.DailyInteractionResponse;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.dto.InteractionTypeCountResponse;
import com.university.backend.dto.LanguageCountResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.Beacon;
import com.university.backend.entity.User;
import com.university.backend.entity.VisitorInteraction;
import com.university.backend.exception.BadRequestException;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import com.university.backend.repository.DailyInteractionProjection;
import com.university.backend.repository.UserRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VisitorInteractionServiceTest {
    private static final UUID EVENT_ID =
            UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final Instant STARTED_AT = Instant.parse("2026-10-20T10:00:00Z");
    private static final UUID VISITOR_ID =
            UUID.fromString("11111111-1111-4111-8111-111111111111");

    @Mock
    private VisitorInteractionRepository interactionRepository;

    @Mock
    private ArtifactRepository artifactRepository;

    @Mock
    private BeaconRepository beaconRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VisitorInteractionService interactionService;

    private CreateInteractionRequest request;

    @BeforeEach
    void setUp() {
        request = new CreateInteractionRequest();
        request.setEventId(EVENT_ID);
        request.setVisitorId(VISITOR_ID);
        request.setArtifactId(1);
        request.setInteractionType("view");
        request.setLanguageCode("vi");
        request.setStartedAt(STARTED_AT);
        request.setEndedAt(STARTED_AT.plusSeconds(45));
        request.setInteractedAt(STARTED_AT);
    }

    @Test
    void createInteraction_shouldRejectEndBeforeStart() {
        request.setEndedAt(STARTED_AT.minusSeconds(1));

        assertThrows(
                BadRequestException.class,
                () -> interactionService.createInteraction("visitor", request));

        verifyNoInteractions(interactionRepository, artifactRepository, userRepository);
    }

    @Test
    void createInteraction_shouldRejectUnknownArtifact() {
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(userRepository.findByUsername("visitor")).thenReturn(Optional.of(mock(User.class)));
        when(artifactRepository.findById(1)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interactionService.createInteraction("visitor", request));

        verify(interactionRepository, never()).save(any());
    }

    @Test
    void createInteraction_shouldSaveNormalizedEventAndCalculateDuration() {
        User user = mock(User.class);
        Artifact artifact = mock(Artifact.class);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(userRepository.findByUsername("visitor")).thenReturn(Optional.of(user));
        when(artifactRepository.findById(1)).thenReturn(Optional.of(artifact));
        when(interactionRepository.save(any(VisitorInteraction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InteractionCreationResult result =
                interactionService.createInteraction("visitor", request);

        assertTrue(result.created());
        assertEquals(EVENT_ID, result.interaction().getEventId());
        assertEquals("VIEW", result.interaction().getInteractionType());
        assertEquals("vi", result.interaction().getLanguageCode());
        assertEquals(45L, result.interaction().getDurationSeconds());
        assertEquals(VISITOR_ID, result.interaction().getVisitorId());
        assertSame(user, result.interaction().getUser());
        assertSame(artifact, result.interaction().getArtifact());
        verify(interactionRepository).save(any(VisitorInteraction.class));
    }

    @Test
    void createInteraction_shouldReturnExistingEventWithoutSavingDuplicate() {
        VisitorInteraction existing = new VisitorInteraction();
        User existingUser = mock(User.class);
        when(existingUser.getUsername()).thenReturn("visitor");
        existing.setUser(existingUser);
        existing.setEventId(EVENT_ID);
        existing.setVisitorId(VISITOR_ID);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.of(existing));

        InteractionCreationResult result =
                interactionService.createInteraction("visitor", request);

        assertFalse(result.created());
        assertSame(existing, result.interaction());
        verify(interactionRepository, never()).save(any());
        verifyNoInteractions(artifactRepository, userRepository);
    }

    @Test
    void createInteraction_shouldReturnAuthenticatedEventWhenVisitorIdChanged() {
        VisitorInteraction existing = new VisitorInteraction();
        User existingUser = mock(User.class);
        when(existingUser.getUsername()).thenReturn("visitor");
        existing.setUser(existingUser);
        existing.setEventId(EVENT_ID);
        existing.setVisitorId(UUID.fromString("22222222-2222-4222-8222-222222222222"));
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.of(existing));

        InteractionCreationResult result =
                interactionService.createInteraction("visitor", request);

        assertFalse(result.created());
        assertSame(existing, result.interaction());
        verify(interactionRepository, never()).save(any());
        verifyNoInteractions(artifactRepository, userRepository);
    }

    @Test
    void createInteraction_shouldPersistAnonymousEventWithoutLookingUpAUser() {
        Artifact artifact = mock(Artifact.class);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(artifactRepository.findById(1)).thenReturn(Optional.of(artifact));
        when(interactionRepository.save(any(VisitorInteraction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InteractionCreationResult result =
                interactionService.createInteraction(null, request);

        assertTrue(result.created());
        assertNull(result.interaction().getUser());
        assertEquals(VISITOR_ID, result.interaction().getVisitorId());
        verifyNoInteractions(userRepository);
    }

    @Test
    void createInteraction_shouldReturnAnonymousEventForSameVisitor() {
        VisitorInteraction existing = new VisitorInteraction();
        existing.setEventId(EVENT_ID);
        existing.setVisitorId(VISITOR_ID);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.of(existing));

        InteractionCreationResult result =
                interactionService.createInteraction(null, request);

        assertFalse(result.created());
        assertSame(existing, result.interaction());
        verify(interactionRepository, never()).save(any());
        verifyNoInteractions(artifactRepository, userRepository);
    }

    @Test
    void createInteraction_shouldRejectAnonymousReuseByAnotherVisitor() {
        VisitorInteraction existing = new VisitorInteraction();
        existing.setEventId(EVENT_ID);
        existing.setVisitorId(UUID.fromString("22222222-2222-4222-8222-222222222222"));
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.of(existing));

        assertThrows(
                DuplicateResourceException.class,
                () -> interactionService.createInteraction(null, request));

        verify(interactionRepository, never()).save(any());
    }

    @Test
    void createInteraction_shouldPersistBeaconTriggerForMatchingArtifact() {
        Artifact artifact = mock(Artifact.class);
        when(artifact.getArtifactId()).thenReturn(1);
        Beacon beacon = mock(Beacon.class);
        when(beacon.isEnabled()).thenReturn(true);
        when(beacon.getArtifact()).thenReturn(artifact);

        request.setInteractionType("BEACON_TRIGGER");
        request.setBeaconId(9);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(artifactRepository.findById(1)).thenReturn(Optional.of(artifact));
        when(beaconRepository.findById(9)).thenReturn(Optional.of(beacon));
        when(interactionRepository.save(any(VisitorInteraction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InteractionCreationResult result =
                interactionService.createInteraction(null, request);

        assertTrue(result.created());
        assertEquals("BEACON_TRIGGER", result.interaction().getInteractionType());
        assertSame(beacon, result.interaction().getBeacon());
    }

    @Test
    void createInteraction_shouldRequireBeaconIdForBeaconTrigger() {
        Artifact artifact = mock(Artifact.class);
        request.setInteractionType("BEACON_TRIGGER");
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(artifactRepository.findById(1)).thenReturn(Optional.of(artifact));

        assertThrows(
                BadRequestException.class,
                () -> interactionService.createInteraction(null, request));

        verify(interactionRepository, never()).save(any());
    }

    @Test
    void createInteraction_shouldRejectBeaconIdForNonBeaconType() {
        Artifact artifact = mock(Artifact.class);
        request.setBeaconId(9);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(artifactRepository.findById(1)).thenReturn(Optional.of(artifact));

        assertThrows(
                BadRequestException.class,
                () -> interactionService.createInteraction(null, request));

        verify(interactionRepository, never()).save(any());
    }

    @Test
    void createInteraction_shouldRejectDisabledOrMismatchedBeacon() {
        Artifact artifact = mock(Artifact.class);
        when(artifact.getArtifactId()).thenReturn(1);
        Beacon disabled = mock(Beacon.class);
        when(disabled.isEnabled()).thenReturn(false);
        request.setInteractionType("BEACON_TRIGGER");
        request.setBeaconId(9);
        when(interactionRepository.findByEventId(EVENT_ID)).thenReturn(Optional.empty());
        when(artifactRepository.findById(1)).thenReturn(Optional.of(artifact));
        when(beaconRepository.findById(9)).thenReturn(Optional.of(disabled));

        assertThrows(
                BadRequestException.class,
                () -> interactionService.createInteraction(null, request));

        Beacon otherArtifactBeacon = mock(Beacon.class);
        when(otherArtifactBeacon.isEnabled()).thenReturn(true);
        Artifact otherArtifact = mock(Artifact.class);
        when(otherArtifact.getArtifactId()).thenReturn(2);
        when(otherArtifactBeacon.getArtifact()).thenReturn(otherArtifact);
        when(beaconRepository.findById(9)).thenReturn(Optional.of(otherArtifactBeacon));

        assertThrows(
                BadRequestException.class,
                () -> interactionService.createInteraction(null, request));

        verify(interactionRepository, never()).save(any());
    }

    @Test
    void getSummary_shouldReturnFilteredAggregation() {
        Instant from = STARTED_AT.minusSeconds(10);
        Instant to = STARTED_AT.plusSeconds(100);
        when(interactionRepository.countInPeriod(from, to)).thenReturn(10L);
        when(interactionRepository.countUniqueVisitorsInPeriod(from, to)).thenReturn(4L);
        when(interactionRepository.countByTypeInPeriod(from, to))
                .thenReturn(List.of(new InteractionTypeCountResponse("VIEW", 10L)));
        when(interactionRepository.findPopularArtifactsInPeriod(
                eq(from), eq(to), any()))
                .thenReturn(List.of());

        InteractionSummaryResponse result = interactionService.getSummary(from, to);

        assertEquals(10L, result.totalInteractions());
        assertEquals(4L, result.uniqueVisitors());
        assertEquals(1, result.interactionTypes().size());
        assertEquals("VIEW", result.interactionTypes().get(0).interactionType());
    }

    @Test
    void getDailyTimeSeries_shouldFillMissingDaysAcrossLeapDayInUtc() {
        Instant from = Instant.parse("2028-02-28T00:00:00Z");
        Instant to = Instant.parse("2028-03-02T00:00:00Z");
        DailyInteractionProjection feb28 = dailyRow("2028-02-28", 2L, 1L);
        DailyInteractionProjection mar01 = dailyRow("2028-03-01", 1L, 1L);
        when(interactionRepository.findDailyInteractions(from, to))
                .thenReturn(List.of(feb28, mar01));

        List<DailyInteractionResponse> result =
                interactionService.getDailyTimeSeries(from, to);

        assertEquals(3, result.size());
        assertEquals(LocalDate.parse("2028-02-28"), result.get(0).date());
        assertEquals(2L, result.get(0).totalInteractions());
        assertEquals(1L, result.get(0).uniqueVisitors());
        assertEquals(LocalDate.parse("2028-02-29"), result.get(1).date());
        assertEquals(0L, result.get(1).totalInteractions());
        assertEquals(0L, result.get(1).uniqueVisitors());
        assertEquals(LocalDate.parse("2028-03-01"), result.get(2).date());
        assertEquals(1L, result.get(2).totalInteractions());
    }

    @Test
    void getDailyTimeSeries_shouldUseUtcDateBucketsAndExcludeUpperBound() {
        Instant from = Instant.parse("2026-12-31T23:00:00Z");
        Instant to = Instant.parse("2027-01-01T01:00:00Z");
        when(interactionRepository.findDailyInteractions(from, to))
                .thenReturn(List.of());

        List<DailyInteractionResponse> result =
                interactionService.getDailyTimeSeries(from, to);

        assertEquals(2, result.size());
        assertEquals(LocalDate.parse("2026-12-31"), result.get(0).date());
        assertEquals(LocalDate.parse("2027-01-01"), result.get(1).date());
        assertEquals(0L, result.get(0).totalInteractions());
        assertEquals(0L, result.get(1).totalInteractions());
    }

    @Test
    void getDailyTimeSeries_shouldReturnOnlyZeroBucketsWhenThereIsNoData() {
        Instant from = Instant.parse("2026-01-01T00:00:00Z");
        Instant to = Instant.parse("2026-01-04T00:00:00Z");
        when(interactionRepository.findDailyInteractions(from, to))
                .thenReturn(List.of());

        List<DailyInteractionResponse> result =
                interactionService.getDailyTimeSeries(from, to);

        assertEquals(3, result.size());
        assertTrue(result.stream().allMatch(row ->
                row.totalInteractions() == 0L && row.uniqueVisitors() == 0L));
    }

    @Test
    void getLanguageAnalytics_shouldTrimMergeUnknownAndSortByCountThenCode() {
        Instant from = Instant.parse("2026-01-01T00:00:00Z");
        Instant to = Instant.parse("2026-01-02T00:00:00Z");
        when(interactionRepository.countByLanguageInPeriod(from, to))
                .thenReturn(List.of(
                        new LanguageCountResponse("vi", 2L),
                        new LanguageCountResponse("vi ", 1L),
                        new LanguageCountResponse("en", 3L),
                        new LanguageCountResponse("", 1L),
                        new LanguageCountResponse(null, 1L)));

        List<LanguageCountResponse> result =
                interactionService.getLanguageAnalytics(from, to);

        assertEquals(3, result.size());
        assertEquals("en", result.get(0).languageCode());
        assertEquals(3L, result.get(0).interactionCount());
        assertEquals("vi", result.get(1).languageCode());
        assertEquals(3L, result.get(1).interactionCount());
        assertEquals("UNKNOWN", result.get(2).languageCode());
        assertEquals(2L, result.get(2).interactionCount());
        assertEquals(8L, result.stream()
                .mapToLong(LanguageCountResponse::interactionCount)
                .sum());
    }

    @Test
    void getLanguageAnalytics_shouldReturnEmptyListWhenThereIsNoData() {
        Instant from = Instant.parse("2026-01-01T00:00:00Z");
        Instant to = Instant.parse("2026-01-02T00:00:00Z");
        when(interactionRepository.countByLanguageInPeriod(from, to))
                .thenReturn(List.of());

        assertTrue(interactionService.getLanguageAnalytics(from, to).isEmpty());
    }

    private DailyInteractionProjection dailyRow(
            String date,
            long totalInteractions,
            long uniqueVisitors) {
        DailyInteractionProjection projection =
                mock(DailyInteractionProjection.class);
        when(projection.getInteractionDate()).thenReturn(LocalDate.parse(date));
        when(projection.getTotalInteractions()).thenReturn(totalInteractions);
        when(projection.getUniqueVisitors()).thenReturn(uniqueVisitors);
        return projection;
    }

    @Test
    void getSummary_withoutRange_shouldQueryWithNonNullBounds() {
        when(interactionRepository.countInPeriod(any(), any())).thenReturn(0L);
        when(interactionRepository.countUniqueVisitorsInPeriod(any(), any())).thenReturn(0L);
        when(interactionRepository.countByTypeInPeriod(any(), any())).thenReturn(List.of());
        when(interactionRepository.findPopularArtifactsInPeriod(any(), any(), any()))
                .thenReturn(List.of());

        InteractionSummaryResponse result = interactionService.getSummary(null, null);

        ArgumentCaptor<Instant> fromCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> toCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(interactionRepository)
                .countInPeriod(fromCaptor.capture(), toCaptor.capture());

        // PostgreSQL cannot type a null query parameter; bounds must be concrete.
        assertNotNull(fromCaptor.getValue());
        assertNotNull(toCaptor.getValue());
        assertTrue(fromCaptor.getValue().isBefore(toCaptor.getValue()));

        // The response still reports the unfiltered (null) range.
        assertNull(result.from());
        assertNull(result.to());
    }
}
