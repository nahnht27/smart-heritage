package com.university.backend.repository;

import com.university.backend.dto.InteractionTypeCountResponse;
import com.university.backend.dto.PopularArtifactResponse;
import com.university.backend.entity.VisitorInteraction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VisitorInteractionRepository
        extends JpaRepository<VisitorInteraction, Integer> {

    Optional<VisitorInteraction> findByEventId(UUID eventId);

    @Query("""
            select count(i)
            from VisitorInteraction i
            where (:from is null or i.interactedAt >= :from)
                and (:to is null or i.interactedAt < :to)
            """)
    long countInPeriod(@Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select count(distinct i.user.userId)
            from VisitorInteraction i
            where (:from is null or i.interactedAt >= :from)
                and (:to is null or i.interactedAt < :to)
            """)
    long countUniqueVisitorsInPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
            select new com.university.backend.dto.InteractionTypeCountResponse(
                i.interactionType, count(i))
            from VisitorInteraction i
            where (:from is null or i.interactedAt >= :from)
                and (:to is null or i.interactedAt < :to)
            group by i.interactionType
            order by count(i) desc, i.interactionType asc
            """)
    List<InteractionTypeCountResponse> countByTypeInPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
            select new com.university.backend.dto.PopularArtifactResponse(
                i.artifact.artifactId, i.artifact.name, count(i))
            from VisitorInteraction i
            where (:from is null or i.interactedAt >= :from)
                and (:to is null or i.interactedAt < :to)
            group by i.artifact.artifactId, i.artifact.name
            order by count(i) desc, i.artifact.artifactId asc
            """)
    List<PopularArtifactResponse> findPopularArtifactsInPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);
}
