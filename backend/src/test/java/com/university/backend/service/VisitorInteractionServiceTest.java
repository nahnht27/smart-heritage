package com.university.backend.service;

import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.dto.InteractionTypeCountResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.User;
import com.university.backend.entity.VisitorInteraction;
import com.university.backend.exception.BadRequestException;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
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
