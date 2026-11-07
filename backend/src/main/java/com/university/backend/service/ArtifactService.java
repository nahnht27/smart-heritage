
package com.university.backend.service;

import com.university.backend.entity.Artifact;
import com.university.backend.entity.HeritageSite;
import com.university.backend.exception.BadRequestException;
import com.university.backend.exception.ResourceConflictException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.MultimediaRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import com.university.backend.specification.ArtifactSpecification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ArtifactService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final List<String> ALLOWED_SORT_FIELDS =
            List.of("name", "artifactId");

    private final ArtifactRepository artifactRepository;
    private final HeritageSiteRepository heritageSiteRepository;
    private final MultimediaRepository multimediaRepository;
    private final VisitorInteractionRepository visitorInteractionRepository;
    private final BeaconRepository beaconRepository;

    public ArtifactService(
            ArtifactRepository artifactRepository,
            HeritageSiteRepository heritageSiteRepository,
            MultimediaRepository multimediaRepository,
            VisitorInteractionRepository visitorInteractionRepository,
            BeaconRepository beaconRepository) {

        this.artifactRepository = artifactRepository;
        this.heritageSiteRepository = heritageSiteRepository;
        this.multimediaRepository = multimediaRepository;
        this.visitorInteractionRepository = visitorInteractionRepository;
        this.beaconRepository = beaconRepository;
    }

    @Transactional(readOnly = true)
    public List<Artifact> getAllArtifacts(Integer siteId) {
        if (siteId == null) {
            return artifactRepository.findAll();
        }

        validateHeritageSiteExists(siteId);
        return artifactRepository.findByHeritageSite_SiteId(siteId);
    }

    @Transactional(readOnly = true)
    public List<Artifact> searchArtifacts(
            Integer siteId,
            String keyword,
            String sortBy,
            String direction) {

        validateSiteId(siteId);
        validateHeritageSiteExistsIfProvided(siteId);

        var specification = ArtifactSpecification.filter(
                siteId,
                normalizeKeyword(keyword)
        );

        if (sortBy == null || sortBy.isBlank()) {
            return artifactRepository.findAll(specification);
        }

        Sort sort = createSort(sortBy, direction);
        return artifactRepository.findAll(specification, sort);
    }

    @Transactional(readOnly = true)
    public Page<Artifact> searchArtifacts(
            Integer siteId,
            String keyword,
            int page,
            int size,
            String sortBy,
            String direction) {

        validateSiteId(siteId);
        validateHeritageSiteExistsIfProvided(siteId);
        validatePagination(page, size);

        var specification = ArtifactSpecification.filter(
                siteId,
                normalizeKeyword(keyword)
        );

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(sortBy, direction)
        );

        return artifactRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public Artifact getArtifactById(Integer artifactId) {
        return artifactRepository.findById(artifactId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifact not found with ID: " + artifactId));
    }

    @Transactional
    public Artifact createArtifact(Artifact artifact, Integer siteId) {
        HeritageSite heritageSite = getHeritageSite(siteId);

        artifact.setArtifactId(null);
        artifact.setHeritageSite(heritageSite);

        return artifactRepository.save(artifact);
    }

    @Transactional
    public Artifact updateArtifact(
            Integer artifactId,
            Artifact updatedArtifact,
            Integer siteId) {

        Artifact existingArtifact = getArtifactById(artifactId);
        HeritageSite heritageSite = getHeritageSite(siteId);

        existingArtifact.setHeritageSite(heritageSite);
        existingArtifact.setName(updatedArtifact.getName());
        existingArtifact.setDescription(updatedArtifact.getDescription());

        return artifactRepository.save(existingArtifact);
    }

    @Transactional
    public void deleteArtifact(Integer artifactId) {
        Artifact existingArtifact = getArtifactById(artifactId);

        if (multimediaRepository.existsByArtifact_ArtifactId(artifactId)) {
            throw new ResourceConflictException(
                    "Cannot delete artifact because it has associated multimedia.");
        }

        if (visitorInteractionRepository.existsByArtifact_ArtifactId(artifactId)) {
            throw new ResourceConflictException(
                    "Cannot delete artifact because it has visitor interaction history.");
        }

        if (beaconRepository.existsByArtifact_ArtifactId(artifactId)) {
            throw new ResourceConflictException(
                    "Cannot delete artifact because it is associated with one or more beacons.");
        }

        artifactRepository.delete(existingArtifact);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }

    private void validateSiteId(Integer siteId) {
        if (siteId != null && siteId <= 0) {
            throw new BadRequestException("siteId must be greater than 0");
        }
    }

    private void validateHeritageSiteExistsIfProvided(Integer siteId) {
        if (siteId != null) {
            validateHeritageSiteExists(siteId);
        }
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

    private HeritageSite getHeritageSite(Integer siteId) {
        return heritageSiteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Heritage site not found with ID: " + siteId));
    }

    private void validateHeritageSiteExists(Integer siteId) {
        if (!heritageSiteRepository.existsById(siteId)) {
            throw new ResourceNotFoundException(
                    "Heritage site not found with ID: " + siteId);
        }
    }
}
