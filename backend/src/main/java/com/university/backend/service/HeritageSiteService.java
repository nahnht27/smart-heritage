
package com.university.backend.service;

import com.university.backend.entity.HeritageSite;
import com.university.backend.exception.BadRequestException;
import com.university.backend.exception.ResourceConflictException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.specification.HeritageSiteSpecification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HeritageSiteService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final List<String> ALLOWED_SORT_FIELDS =
            List.of("name", "siteId");

    private final HeritageSiteRepository heritageSiteRepository;
    private final ArtifactRepository artifactRepository;

    public HeritageSiteService(
            HeritageSiteRepository heritageSiteRepository,
            ArtifactRepository artifactRepository) {
        this.heritageSiteRepository = heritageSiteRepository;
        this.artifactRepository = artifactRepository;
    }

    @Transactional(readOnly = true)
    public List<HeritageSite> getAllHeritageSites() {
        return heritageSiteRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<HeritageSite> searchHeritageSites(
            String keyword,
            String sortBy,
            String direction) {

        var specification = HeritageSiteSpecification.hasKeyword(
                normalizeKeyword(keyword)
        );

        if (sortBy == null || sortBy.isBlank()) {
            return heritageSiteRepository.findAll(specification);
        }

        return heritageSiteRepository.findAll(
                specification,
                createSort(sortBy, direction)
        );
    }

    @Transactional(readOnly = true)
    public Page<HeritageSite> searchHeritageSites(
            String keyword,
            int page,
            int size,
            String sortBy,
            String direction) {

        validatePagination(page, size);

        var specification = HeritageSiteSpecification.hasKeyword(
                normalizeKeyword(keyword)
        );

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(sortBy, direction)
        );

        return heritageSiteRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public HeritageSite getHeritageSiteById(Integer siteId) {
        return heritageSiteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Heritage site not found with ID: " + siteId));
    }

    @Transactional
    public HeritageSite createHeritageSite(HeritageSite heritageSite) {
        heritageSite.setSiteId(null);
        return heritageSiteRepository.save(heritageSite);
    }

    @Transactional
    public HeritageSite updateHeritageSite(
            Integer siteId,
            HeritageSite updatedHeritageSite) {

        HeritageSite existingSite = getHeritageSiteById(siteId);

        existingSite.setName(updatedHeritageSite.getName());
        existingSite.setDescription(updatedHeritageSite.getDescription());
        existingSite.setAddress(updatedHeritageSite.getAddress());
        existingSite.setLatitude(updatedHeritageSite.getLatitude());
        existingSite.setLongitude(updatedHeritageSite.getLongitude());

        return heritageSiteRepository.save(existingSite);
    }

    @Transactional
    public void deleteHeritageSite(Integer siteId) {
        HeritageSite existingSite = getHeritageSiteById(siteId);

        if (artifactRepository.existsByHeritageSite_SiteId(siteId)) {
            throw new ResourceConflictException(
                    "Cannot delete heritage site because it has associated artifacts.");
        }

        heritageSiteRepository.delete(existingSite);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new BadRequestException(
                    "page must be greater than or equal to 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException(
                    "size must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private Sort createSort(String sortBy, String direction) {
        String field = (sortBy == null || sortBy.isBlank())
                ? "name"
                : sortBy.trim();

        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException(
                    "Invalid sortBy field. Allowed fields: "
                            + String.join(", ", ALLOWED_SORT_FIELDS));
        }

        try {
            Sort.Direction sortDirection =
                    Sort.Direction.fromString(
                            direction == null ? "asc" : direction.trim());

            return Sort.by(sortDirection, field);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException(
                    "direction must be either 'asc' or 'desc'");
        }
    }
}
