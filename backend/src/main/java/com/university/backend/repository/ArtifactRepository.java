package com.university.backend.repository;

import com.university.backend.entity.Artifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ArtifactRepository
        extends JpaRepository<Artifact,Integer>,
                JpaSpecificationExecutor<Artifact> {

    List<Artifact> findByHeritageSite_SiteId(Integer siteId);
}
