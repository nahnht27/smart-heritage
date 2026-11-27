package com.university.backend.dto;

import com.university.backend.entity.Multimedia;

public class MultimediaResponse {

    private Integer multimediaId;
    private Integer artifactId;
    private String artifactName;
    private String type;
    private String title;
    private String url;
    private boolean hasFileData;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String sha256;

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
        return fromEntity(multimedia, null);
    }

    public static MultimediaResponse fromEntity(
            Multimedia multimedia,
            MultimediaFileInfo file) {
        MultimediaResponse response = new MultimediaResponse(
                multimedia.getMultimediaId(),
                multimedia.getArtifact().getArtifactId(),
                multimedia.getArtifact().getName(),
                multimedia.getType(),
                multimedia.getTitle(),
                multimedia.getUrl()
        );
        if (file != null) {
            response.hasFileData = true;
            response.fileName = file.fileName();
            response.contentType = file.contentType();
            response.fileSize = file.fileSize();
            response.sha256 = file.sha256();
        }
        return response;
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

    public boolean getHasFileData() {
        return hasFileData;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public String getSha256() {
        return sha256;
    }
}
