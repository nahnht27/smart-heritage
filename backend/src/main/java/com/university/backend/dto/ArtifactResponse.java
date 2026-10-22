package com.university.backend.dto;
import com.university.backend.entity.Artifact;

public class ArtifactResponse {

    private Integer artifactId;
    private Integer siteId;
    private String siteName;
    private String name;
    private String description;

    public ArtifactResponse() {
    }

    public ArtifactResponse(
            Integer artifactId,
            Integer siteId,
            String siteName,
            String name,
            String description) {
        this.artifactId = artifactId;
        this.siteId = siteId;
        this.siteName = siteName;
        this.name = name;
        this.description = description;
    }

    public static ArtifactResponse fromEntity(Artifact artifact) {
        return new ArtifactResponse(
                artifact.getArtifactId(),
                artifact.getHeritageSite().getSiteId(),
                artifact.getHeritageSite().getName(),
                artifact.getName(),
                artifact.getDescription()
        );
    }

    public Integer getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(Integer artifactId) {
        this.artifactId = artifactId;
    }

    public Integer getSiteId() {
        return siteId;
    }

    public void setSiteId(Integer siteId) {
        this.siteId = siteId;
    }

    public String getSiteName() {
        return siteName;
    }

    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
