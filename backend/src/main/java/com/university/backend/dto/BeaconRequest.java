package com.university.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class BeaconRequest {

    @NotBlank(message = "Beacon name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @NotNull(message = "Beacon UUID is required")
    private UUID uuid;

    @NotNull(message = "Major is required")
    @Min(value = 0, message = "Major must be between 0 and 65535")
    @Max(value = 65535, message = "Major must be between 0 and 65535")
    private Integer major;

    @NotNull(message = "Minor is required")
    @Min(value = 0, message = "Minor must be between 0 and 65535")
    @Max(value = 65535, message = "Minor must be between 0 and 65535")
    private Integer minor;

    private Boolean enabled;

    @Positive(message = "Artifact ID must be positive")
    private Integer artifactId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
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

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Integer getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(Integer artifactId) {
        this.artifactId = artifactId;
    }
}
