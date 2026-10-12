package com.university.backend.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {
    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    private String username;
    private Integer preferredLanguageId;

    public UpdateProfileRequest() {}
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getPreferredLanguageId() { return preferredLanguageId; }
    public void setPreferredLanguageId(Integer preferredLanguageId) { this.preferredLanguageId = preferredLanguageId; }
}
