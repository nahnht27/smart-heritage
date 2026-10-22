package com.university.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class MultimediaRequest {

    @NotNull(message = "Artifact ID is required")
    @Positive(message = "Artifact ID must be positive")
    private Integer artifactId;

    @NotBlank(message = "Multimedia type is required")
    @Size(max = 20, message = "Type must not exceed 20 characters")
    private String type;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Multimedia URL is required")
    private String url;

    public MultimediaRequest() {
    }

    public Integer getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(Integer artifactId) {
        this.artifactId = artifactId;
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
