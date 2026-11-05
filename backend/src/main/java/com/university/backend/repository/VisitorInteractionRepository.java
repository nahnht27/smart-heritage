package com.university.backend.repository;

import com.university.backend.entity.VisitorInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VisitorInteractionRepository
        extends JpaRepository<VisitorInteraction, Integer> {

    Optional<VisitorInteraction> findByEventId(String eventId);

    @Query("select i from VisitorInteraction i join fetch i.user join fetch i.artifact where i.eventId = :eventId")
    Optional<VisitorInteraction> findByEventIdWithRelations(@Param("eventId") String eventId);

    boolean existsByEventId(String eventId);
}
