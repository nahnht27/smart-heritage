package com.university.backend.service;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.Multimedia;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.MultimediaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class MultimediaService {

    private final MultimediaRepository multimediaRepository;
    private final ArtifactRepository artifactRepository;

    public MultimediaService(
            MultimediaRepository multimediaRepository,
            ArtifactRepository artifactRepository) {
        this.multimediaRepository = multimediaRepository;
        this.artifactRepository = artifactRepository;
    }

    @Transactional(readOnly = true)
    public List<Multimedia> getAllMultimedia(Integer artifactId) {
        if (artifactId == null) {
            return multimediaRepository.findAll();
        }

        validateArtifactExists(artifactId);
        return multimediaRepository.findByArtifact_ArtifactId(artifactId);
    }

    @Transactional(readOnly = true)
    public Multimedia getMultimediaById(Integer multimediaId) {
        return multimediaRepository.findById(multimediaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Multimedia not found with ID: " + multimediaId));
    }

    @Transactional
    public Multimedia createMultimedia(
            Multimedia multimedia,
            Integer artifactId) {

        Artifact artifact = getArtifact(artifactId);

        multimedia.setMultimediaId(null);
        multimedia.setArtifact(artifact);

        return multimediaRepository.save(multimedia);
    }

    @Transactional
    public Multimedia updateMultimedia(
            Integer multimediaId,
            Multimedia updatedMultimedia,
            Integer artifactId) {

        Multimedia existingMultimedia = getMultimediaById(multimediaId);
        Artifact artifact = getArtifact(artifactId);

        existingMultimedia.setArtifact(artifact);
        existingMultimedia.setType(updatedMultimedia.getType());
        existingMultimedia.setTitle(updatedMultimedia.getTitle());
        existingMultimedia.setUrl(updatedMultimedia.getUrl());

        return multimediaRepository.save(existingMultimedia);
    }

    @Transactional
    public void deleteMultimedia(Integer multimediaId) {
        Multimedia existingMultimedia = getMultimediaById(multimediaId);
        multimediaRepository.delete(existingMultimedia);
    }

    private Artifact getArtifact(Integer artifactId) {
        return artifactRepository.findById(artifactId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifact not found with ID: " + artifactId));
    }

    private void validateArtifactExists(Integer artifactId) {
        if (!artifactRepository.existsById(artifactId)) {
            throw new ResourceNotFoundException(
                    "Artifact not found with ID: " + artifactId);
        }
    }
}
