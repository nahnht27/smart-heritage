
package com.university.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "multimedia")
public class Multimedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "multimedia_id")
    private Integer multimediaId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artifact_id", nullable = false)
    private Artifact artifact;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "url", nullable = false, columnDefinition = "TEXT")
    private String url;

    public Multimedia() {}

    public Integer getMultimediaId() {
        return multimediaId;
    }

    public void setMultimediaId(Integer multimediaId) {
        this.multimediaId = multimediaId;
    }

    public Artifact getArtifact() {
        return artifact;
    }

    public void setArtifact(Artifact artifact) {
        this.artifact = artifact;
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
