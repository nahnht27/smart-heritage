package com.university.backend.dto;

import java.time.LocalDate;

public record DailyInteractionResponse(
        LocalDate date,
        long totalInteractions,
        long uniqueVisitors) {
}
