package com.university.backend.dto;

public record PopularArtifactResponse(Integer artifactId, String artifactName, long interactionCount) {
}
