package com.university.backend.service;
import com.university.backend.dto.MultimediaFileInfo;
import com.university.backend.dto.MultimediaResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.Multimedia;
import com.university.backend.entity.MultimediaFile;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.MultimediaFileRepository;
import com.university.backend.repository.MultimediaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MultimediaService {

    private final MultimediaRepository multimediaRepository;
    private final ArtifactRepository artifactRepository;
    private final MultimediaFileRepository multimediaFileRepository;

    public MultimediaService(
            MultimediaRepository multimediaRepository,
            ArtifactRepository artifactRepository,
            MultimediaFileRepository multimediaFileRepository) {
        this.multimediaRepository = multimediaRepository;
        this.artifactRepository = artifactRepository;
        this.multimediaFileRepository = multimediaFileRepository;
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

    @Transactional(readOnly = true)
    public MultimediaFile getMultimediaFile(Integer multimediaId) {
        return multimediaFileRepository.findById(multimediaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No stored file for multimedia ID: " + multimediaId));
    }

    /** Attaches stored-file details (never the bytes) to each item. */
    @Transactional(readOnly = true)
    public List<MultimediaResponse> toResponses(List<Multimedia> items) {
        if (items.isEmpty()) {
            return List.of();
        }

        Map<Integer, MultimediaFileInfo> files = multimediaFileRepository
                .findInfoByIds(items.stream().map(Multimedia::getMultimediaId).toList())
                .stream()
                .collect(Collectors.toMap(
                        MultimediaFileInfo::multimediaId, Function.identity()));

        return items.stream()
                .map(item -> MultimediaResponse.fromEntity(
                        item, files.get(item.getMultimediaId())))
                .toList();
    }

    public MultimediaResponse toResponse(Multimedia item) {
        return toResponses(List.of(item)).get(0);
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

        // A stored file takes precedence over the URL during playback, so it
        // must be dropped when an administrator points the item elsewhere.
        boolean sourceChanged =
                !Objects.equals(existingMultimedia.getUrl(), updatedMultimedia.getUrl())
                        || !existingMultimedia.getType()
                                .equalsIgnoreCase(updatedMultimedia.getType());
        if (sourceChanged && multimediaFileRepository.existsById(multimediaId)) {
            multimediaFileRepository.deleteById(multimediaId);
        }

        existingMultimedia.setArtifact(artifact);
        existingMultimedia.setType(updatedMultimedia.getType());
        existingMultimedia.setTitle(updatedMultimedia.getTitle());
        existingMultimedia.setUrl(updatedMultimedia.getUrl());

        return multimediaRepository.save(existingMultimedia);
    }

    @Transactional
    public void deleteMultimedia(Integer multimediaId) {
        Multimedia existingMultimedia = getMultimediaById(multimediaId);
        if (multimediaFileRepository.existsById(multimediaId)) {
            multimediaFileRepository.deleteById(multimediaId);
        }
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
