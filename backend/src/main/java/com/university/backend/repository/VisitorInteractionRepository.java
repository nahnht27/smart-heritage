package com.university.backend.repository;

import com.university.backend.dto.InteractionTypeCountResponse;
import com.university.backend.dto.LanguageCountResponse;
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
            where i.interactedAt >= :from
                and i.interactedAt < :to
            """)
    long countInPeriod(@Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select count(distinct i.visitorId)
            from VisitorInteraction i
            where i.interactedAt >= :from
                and i.interactedAt < :to
            """)
    long countUniqueVisitorsInPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
            select new com.university.backend.dto.InteractionTypeCountResponse(
                i.interactionType, count(i))
            from VisitorInteraction i
            where i.interactedAt >= :from
                and i.interactedAt < :to
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
            where i.interactedAt >= :from
                and i.interactedAt < :to
            group by i.artifact.artifactId, i.artifact.name
            order by count(i) desc, i.artifact.artifactId asc
            """)
    List<PopularArtifactResponse> findPopularArtifactsInPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query(value = """
            SELECT
                CAST(i.interacted_at AT TIME ZONE 'UTC' AS DATE) AS "interactionDate",
                COUNT(*) AS "totalInteractions",
                COUNT(DISTINCT i.visitor_id) AS "uniqueVisitors"
            FROM visitor_interaction i
            WHERE i.interacted_at >= :from
              AND i.interacted_at < :to
            GROUP BY CAST(i.interacted_at AT TIME ZONE 'UTC' AS DATE)
            ORDER BY CAST(i.interacted_at AT TIME ZONE 'UTC' AS DATE) ASC
            """, nativeQuery = true)
    List<DailyInteractionProjection> findDailyInteractions(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
            select new com.university.backend.dto.LanguageCountResponse(
                i.languageCode, count(i))
            from VisitorInteraction i
            where i.interactedAt >= :from
                and i.interactedAt < :to
            group by i.languageCode
            order by count(i) desc, i.languageCode asc
            """)
    List<LanguageCountResponse> countByLanguageInPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to);
}
