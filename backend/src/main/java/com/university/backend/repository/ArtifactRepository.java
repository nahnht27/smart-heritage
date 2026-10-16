
package com.university.backend.repository;

import com.university.backend.entity.Artifact;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtifactRepository
        extends JpaRepository<Artifact, Integer> {
}
