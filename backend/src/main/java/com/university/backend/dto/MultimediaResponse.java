package com.university.backend.dto;
import com.university.backend.entity.Multimedia;

public class MultimediaResponse {
    private Integer multimediaId;
    private Integer artifactId;
    private String artifactName;
    private String type;
    private String title;
    private String url;

    public MultimediaResponse() {
    }

    public MultimediaResponse(
            Integer multimediaId,
            Integer artifactId,
            String artifactName,
            String type,
            String title,
            String url) {
        this.multimediaId = multimediaId;
        this.artifactId = artifactId;
        this.artifactName = artifactName;
        this.type = type;
        this.title = title;
        this.url = url;
    }

    public static MultimediaResponse fromEntity(Multimedia multimedia) {
        return new MultimediaResponse(
                multimedia.getMultimediaId(),
                multimedia.getArtifact().getArtifactId(),
                multimedia.getArtifact().getName(),
                multimedia.getType(),
                multimedia.getTitle(),
                multimedia.getUrl()
        );
    }

    public Integer getMultimediaId() {
        return multimediaId;
    }

    public void setMultimediaId(Integer multimediaId) {
        this.multimediaId = multimediaId;
    }

    public Integer getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(Integer artifactId) {
        this.artifactId = artifactId;
    }

    public String getArtifactName() {
        return artifactName;
    }

    public void setArtifactName(String artifactName) {
        this.artifactName = artifactName;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
