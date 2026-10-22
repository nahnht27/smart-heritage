
package com.university.backend.repository;

import com.university.backend.entity.Multimedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MultimediaRepository
        extends JpaRepository<Multimedia, Integer> {

    List<Multimedia> findByArtifact_ArtifactId(Integer artifactId);
}
