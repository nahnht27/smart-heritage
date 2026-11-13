package com.university.backend.repository;

import com.university.backend.entity.Beacon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BeaconRepository extends JpaRepository<Beacon, Integer> {

    Optional<Beacon> findByProximityUuidAndMajorAndMinor(
            UUID proximityUuid,
            Integer major,
            Integer minor);


    @Query("""
            SELECT b
            FROM Beacon b
            LEFT JOIN FETCH b.artifact a
            LEFT JOIN FETCH a.heritageSite
            WHERE b.proximityUuid = :proximityUuid
              AND b.major = :major
              AND b.minor = :minor
            """)
    Optional<Beacon> findForResolutionByIdentity(
            @Param("proximityUuid") UUID proximityUuid,
            @Param("major") Integer major,
            @Param("minor") Integer minor);

    List<Beacon> findAllByOrderByNameAsc();

    boolean existsByArtifact_ArtifactId(Integer artifactId);
}
