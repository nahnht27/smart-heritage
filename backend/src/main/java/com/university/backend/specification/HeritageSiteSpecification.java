package com.university.backend.specification;

import com.university.backend.entity.HeritageSite;
import org.springframework.data.jpa.domain.Specification;

public class HeritageSiteSpecification {

    private HeritageSiteSpecification() {
    }

    public static Specification<HeritageSite> hasKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null || keyword.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            String searchKeyword =
                    "%" + keyword.trim().toLowerCase() + "%";

            return criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("name")),
                    searchKeyword
            );
        };
    }
}