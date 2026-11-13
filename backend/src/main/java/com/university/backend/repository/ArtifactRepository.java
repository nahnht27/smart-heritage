package com.university.backend.repository;

import com.university.backend.entity.Artifact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ArtifactRepository
        extends JpaRepository<Artifact, Integer>,
                JpaSpecificationExecutor<Artifact> {

    @Override
    @EntityGraph(attributePaths = "heritageSite")
    List<Artifact> findAll(Specification<Artifact> spec, Sort sort);

    @Override
    @EntityGraph(attributePaths = "heritageSite")
    Page<Artifact> findAll(Specification<Artifact> spec, Pageable pageable);

    List<Artifact> findByHeritageSite_SiteId(Integer siteId);

    boolean existsByHeritageSite_SiteId(Integer siteId);
}
