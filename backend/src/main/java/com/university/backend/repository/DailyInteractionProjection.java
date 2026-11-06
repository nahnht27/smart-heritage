
package com.university.backend.repository;

import java.time.LocalDate;

public interface DailyInteractionProjection {

    LocalDate getDate();

    Long getTotalInteractions();

    Long getUniqueVisitors();
}
