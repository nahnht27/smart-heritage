package com.university.backend.service;

import com.university.backend.dto.BeaconRequest;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.Beacon;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class BeaconService {

    private final BeaconRepository beaconRepository;
    private final ArtifactRepository artifactRepository;

    public BeaconService(
            BeaconRepository beaconRepository,
            ArtifactRepository artifactRepository) {
        this.beaconRepository = beaconRepository;
        this.artifactRepository = artifactRepository;
    }

    @Transactional(readOnly = true)
    public List<BeaconResponse> getAllBeacons() {
        return beaconRepository.findAllByOrderByNameAsc().stream()
                .map(BeaconResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public BeaconResponse getBeaconById(Integer beaconId) {
        return BeaconResponse.fromEntity(getBeaconEntity(beaconId));
    }

    @Transactional
    public BeaconResponse createBeacon(BeaconRequest request) {
        validateIdentityAvailable(
                request.getUuid(),
                request.getMajor(),
                request.getMinor(),
                null);

        Beacon beacon = new Beacon();
        applyRequest(beacon, request);
        return BeaconResponse.fromEntity(beaconRepository.save(beacon));
    }

    @Transactional
    public BeaconResponse updateBeacon(Integer beaconId, BeaconRequest request) {
        Beacon beacon = getBeaconEntity(beaconId);
        validateIdentityAvailable(
                request.getUuid(),
                request.getMajor(),
                request.getMinor(),
                beaconId);

        applyRequest(beacon, request);
        return BeaconResponse.fromEntity(beaconRepository.save(beacon));
    }

    @Transactional
    public void deleteBeacon(Integer beaconId) {
        beaconRepository.delete(getBeaconEntity(beaconId));
    }

    @Transactional(readOnly = true)
    public BeaconResponse resolveBeacon(UUID uuid, Integer major, Integer minor) {
        Beacon beacon = beaconRepository
                .findByProximityUuidAndMajorAndMinor(uuid, major, minor)
                .filter(Beacon::isEnabled)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beacon not found or disabled"));

        return BeaconResponse.fromEntity(beacon);
    }

    private Beacon getBeaconEntity(Integer beaconId) {
        return beaconRepository.findById(beaconId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beacon not found with ID: " + beaconId));
    }

    private void applyRequest(Beacon beacon, BeaconRequest request) {
        beacon.setName(request.getName().trim());
        beacon.setProximityUuid(request.getUuid());
        beacon.setMajor(request.getMajor());
        beacon.setMinor(request.getMinor());
        beacon.setEnabled(request.getEnabled() == null || request.getEnabled());

        if (request.getArtifactId() == null) {
            beacon.setArtifact(null);
            return;
        }

        Artifact artifact = artifactRepository.findById(request.getArtifactId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifact not found with ID: " + request.getArtifactId()));
        beacon.setArtifact(artifact);
    }

    private void validateIdentityAvailable(
            UUID uuid,
            Integer major,
            Integer minor,
            Integer currentBeaconId) {
        beaconRepository.findByProximityUuidAndMajorAndMinor(uuid, major, minor)
                .filter(existing -> !existing.getBeaconId().equals(currentBeaconId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "A beacon with the same UUID, major and minor already exists");
                });
    }
}
