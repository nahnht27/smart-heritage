
package com.university.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "artifact")
public class Artifact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "artifact_id")
    private Integer artifactId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private HeritageSite heritageSite;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public Artifact() {}

    public Integer getArtifactId() { return artifactId; }
    public void setArtifactId(Integer artifactId) {
        this.artifactId = artifactId;
    }

    public HeritageSite getHeritageSite() { return heritageSite; }
    public void setHeritageSite(HeritageSite heritageSite) {
        this.heritageSite = heritageSite;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }
}
