package com.university.backend.repository;

import com.university.backend.entity.Beacon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BeaconRepository extends JpaRepository<Beacon, Integer> {

    Optional<Beacon> findByProximityUuidAndMajorAndMinor(
            UUID proximityUuid,
            Integer major,
            Integer minor);


    List<Beacon> findAllByOrderByNameAsc();
}
