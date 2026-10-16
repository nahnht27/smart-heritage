
package com.university.backend.repository;

import com.university.backend.entity.Multimedia;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MultimediaRepository
        extends JpaRepository<Multimedia, Integer> {
}
