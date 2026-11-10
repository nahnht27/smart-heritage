package com.university.backend.dto;

import com.university.backend.entity.Beacon;

import java.util.UUID;

public record BeaconResponse(
        Integer beaconId,
        String name,
        UUID uuid,
        Integer major,
        Integer minor,
        boolean enabled,
        Integer artifactId,
        String artifactName,
        Integer siteId,
        String siteName) {

    public static BeaconResponse fromEntity(Beacon beacon) {
        return new BeaconResponse(
                beacon.getBeaconId(),
                beacon.getName(),
                beacon.getProximityUuid(),
                beacon.getMajor(),
                beacon.getMinor(),
                beacon.isEnabled(),
                beacon.getArtifact() == null ? null : beacon.getArtifact().getArtifactId(),
                beacon.getArtifact() == null ? null : beacon.getArtifact().getName(),
                beacon.getArtifact() == null || beacon.getArtifact().getHeritageSite() == null
                        ? null
                        : beacon.getArtifact().getHeritageSite().getSiteId(),
                beacon.getArtifact() == null || beacon.getArtifact().getHeritageSite() == null
                        ? null
                        : beacon.getArtifact().getHeritageSite().getName());
    }
}
