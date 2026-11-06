package com.university.backend.repository;

import java.time.LocalDate;

public interface DailyInteractionProjection {

    LocalDate getInteractionDate();

    Long getTotalInteractions();

    Long getUniqueVisitors();
}
