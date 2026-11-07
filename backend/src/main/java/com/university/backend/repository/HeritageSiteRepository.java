
package com.university.backend.repository;

import com.university.backend.entity.HeritageSite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface HeritageSiteRepository
        extends JpaRepository<HeritageSite, Integer>,
                JpaSpecificationExecutor<HeritageSite> {
}
