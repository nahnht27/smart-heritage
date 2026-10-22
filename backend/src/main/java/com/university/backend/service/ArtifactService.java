package com.university.backend.service;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.HeritageSite;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.HeritageSiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ArtifactService {

    private final ArtifactRepository artifactRepository;
    private final HeritageSiteRepository heritageSiteRepository;

    public ArtifactService(
            ArtifactRepository artifactRepository,
            HeritageSiteRepository heritageSiteRepository) {
        this.artifactRepository = artifactRepository;
        this.heritageSiteRepository = heritageSiteRepository;
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
        artifactRepository.delete(existingArtifact);
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
