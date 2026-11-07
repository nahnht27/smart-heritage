package com.university.backend.entity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(
        name = "beacon",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_beacon_identity",
                columnNames = {"proximity_uuid", "major", "minor"}))
public class Beacon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "beacon_id")
    private Integer beaconId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "proximity_uuid", nullable = false)
    private UUID proximityUuid;

    @Column(name = "major", nullable = false)
    private Integer major;

    @Column(name = "minor", nullable = false)
    private Integer minor;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artifact_id")
    private Artifact artifact;

    public Beacon() {
    }

    public Integer getBeaconId() {
        return beaconId;
    }

    public void setBeaconId(Integer beaconId) {
        this.beaconId = beaconId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getProximityUuid() {
        return proximityUuid;
    }

    public void setProximityUuid(UUID proximityUuid) {
        this.proximityUuid = proximityUuid;
    }

    public Integer getMajor() {
        return major;
    }

    public void setMajor(Integer major) {
        this.major = major;
    }

    public Integer getMinor() {
        return minor;
    }

    public void setMinor(Integer minor) {
        this.minor = minor;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Artifact getArtifact() {
        return artifact;
    }

    public void setArtifact(Artifact artifact) {
        this.artifact = artifact;
    }
}
