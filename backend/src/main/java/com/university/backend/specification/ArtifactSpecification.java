package com.university.backend.specification;

import com.university.backend.entity.Artifact;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.List;

public class ArtifactSpecification {

    private ArtifactSpecification() {
    }

    public static Specification<Artifact> filter(
            Integer siteId,
            String keyword) {

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (siteId != null) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("heritageSite").get("siteId"),
                                siteId
                        )
                );
            }

            if (keyword != null && !keyword.isBlank()) {
                String searchKeyword =
                        "%" + keyword.trim().toLowerCase() + "%";

                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                searchKeyword
                        )
                );
            }

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0])
            );
        };
    }
}