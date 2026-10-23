package com.university.backend.dto;

import com.university.backend.entity.VisitorInteraction;

public record InteractionCreationResult(
        VisitorInteraction interaction,
        boolean created) {
}
