package com.university.backend.service;

import com.university.backend.dto.BeaconRequest;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.Beacon;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BeaconServiceTest {

    private static final UUID BEACON_UUID =
            UUID.fromString("e2c56db5-dffb-48d2-b060-d0f5a71096e0");

    @Mock
    private BeaconRepository beaconRepository;

    @Mock
    private ArtifactRepository artifactRepository;

    @InjectMocks
    private BeaconService beaconService;

    private BeaconRequest request;

    @BeforeEach
    void setUp() {
        request = new BeaconRequest();
        request.setName("  Main entrance  ");
        request.setUuid(BEACON_UUID);
        request.setMajor(1);
        request.setMinor(101);
        request.setEnabled(true);
        request.setArtifactId(7);
    }

    @Test
    void createBeacon_shouldNormalizeNameAndAttachArtifact() {
        Artifact artifact = artifact(7);
        when(beaconRepository.findByProximityUuidAndMajorAndMinor(
                BEACON_UUID, 1, 101)).thenReturn(Optional.empty());
        when(artifactRepository.findById(7)).thenReturn(Optional.of(artifact));
        when(beaconRepository.save(any(Beacon.class)))
                .thenAnswer(invocation -> {
                    Beacon saved = invocation.getArgument(0);
                    saved.setBeaconId(11);
                    return saved;
                });

        BeaconResponse response = beaconService.createBeacon(request);

        assertEquals(11, response.beaconId());
        assertEquals("Main entrance", response.name());
        assertEquals(BEACON_UUID, response.uuid());
        assertEquals(1, response.major());
        assertEquals(101, response.minor());
        assertTrue(response.enabled());
        assertEquals(7, response.artifactId());
        assertEquals("Artifact 7", response.artifactName());
        ArgumentCaptor<Beacon> beaconCaptor = ArgumentCaptor.forClass(Beacon.class);
        verify(beaconRepository).save(beaconCaptor.capture());
        assertSame(artifact, beaconCaptor.getValue().getArtifact());
    }

    @Test
    void createBeacon_shouldRejectDuplicateIdentity() {
        Beacon existing = new Beacon();
        existing.setBeaconId(3);
        when(beaconRepository.findByProximityUuidAndMajorAndMinor(
                BEACON_UUID, 1, 101)).thenReturn(Optional.of(existing));

        assertThrows(
                DuplicateResourceException.class,
                () -> beaconService.createBeacon(request));

        verify(beaconRepository, never()).save(any());
        verifyNoInteractions(artifactRepository);
    }

    @Test
    void createBeacon_shouldRejectUnknownArtifact() {
        when(beaconRepository.findByProximityUuidAndMajorAndMinor(
                BEACON_UUID, 1, 101)).thenReturn(Optional.empty());
        when(artifactRepository.findById(7)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> beaconService.createBeacon(request));

        verify(beaconRepository, never()).save(any());
    }

    @Test
    void updateBeacon_shouldAllowKeepingItsOwnIdentity() {
        Beacon existing = new Beacon();
        existing.setBeaconId(3);
        existing.setProximityUuid(BEACON_UUID);
        existing.setMajor(1);
        existing.setMinor(101);
        when(beaconRepository.findById(3)).thenReturn(Optional.of(existing));
        when(beaconRepository.findByProximityUuidAndMajorAndMinor(
                BEACON_UUID, 1, 101)).thenReturn(Optional.of(existing));
        Artifact artifact = artifact(7);
        when(artifactRepository.findById(7)).thenReturn(Optional.of(artifact));
        when(beaconRepository.save(any(Beacon.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        BeaconResponse response = beaconService.updateBeacon(3, request);

        assertEquals(3, response.beaconId());
        assertEquals("Main entrance", response.name());
    }

    @Test
    void resolveBeacon_shouldRejectDisabledBeacon() {
        Beacon disabled = new Beacon();
        disabled.setBeaconId(4);
        disabled.setEnabled(false);
        when(beaconRepository.findForResolutionByIdentity(
                BEACON_UUID, 1, 101)).thenReturn(Optional.of(disabled));

        assertThrows(
                ResourceNotFoundException.class,
                () -> beaconService.resolveBeacon(BEACON_UUID, 1, 101));
    }

    @Test
    void resolveBeacon_shouldReturnEnabledBeacon() {
        Beacon enabled = new Beacon();
        enabled.setBeaconId(4);
        enabled.setName("Entrance");
        enabled.setProximityUuid(BEACON_UUID);
        enabled.setMajor(1);
        enabled.setMinor(101);
        enabled.setEnabled(true);
        when(beaconRepository.findForResolutionByIdentity(
                BEACON_UUID, 1, 101)).thenReturn(Optional.of(enabled));

        BeaconResponse response = beaconService.resolveBeacon(BEACON_UUID, 1, 101);

        assertEquals(4, response.beaconId());
        assertNull(response.artifactId());
    }

    @Test
    void deleteBeacon_shouldRejectUnknownBeacon() {
        when(beaconRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> beaconService.deleteBeacon(99));

        verify(beaconRepository, never()).delete(any());
    }

    private Artifact artifact(int artifactId) {
        Artifact artifact = mock(Artifact.class);
        when(artifact.getArtifactId()).thenReturn(artifactId);
        when(artifact.getName()).thenReturn("Artifact " + artifactId);
        return artifact;
    }
}
