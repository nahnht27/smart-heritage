
package com.university.backend.repository;

import com.university.backend.entity.Multimedia;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MultimediaRepository
        extends JpaRepository<Multimedia, Integer> {

    @Override
    @EntityGraph(attributePaths = "artifact")
    List<Multimedia> findAll();

    @EntityGraph(attributePaths = "artifact")
    List<Multimedia> findByArtifact_ArtifactId(Integer artifactId);

    boolean existsByArtifact_ArtifactId(Integer artifactId);
}
