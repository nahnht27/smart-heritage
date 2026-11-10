package com.university.backend.dto;

public record LanguageCountResponse(
        String languageCode,
        long interactionCount) {
}
