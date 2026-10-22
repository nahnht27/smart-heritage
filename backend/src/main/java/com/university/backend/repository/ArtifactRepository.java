package com.university.backend.repository;

import com.university.backend.entity.Artifact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArtifactRepository
        extends JpaRepository<Artifact, Integer> {

    List<Artifact> findByHeritageSite_SiteId(Integer siteId);
}
