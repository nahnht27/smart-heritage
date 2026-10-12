package com.university.backend.dto;

public class LoginResponse {
    private String accessToken;
    private String tokenType;
    private long expiresIn;
    private UserResponse user;

    public LoginResponse() {}
    public LoginResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {
        this.accessToken = accessToken; this.tokenType = tokenType; this.expiresIn = expiresIn; this.user = user;
    }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    public long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(long expiresIn) { this.expiresIn = expiresIn; }
    public UserResponse getUser() { return user; }
    public void setUser(UserResponse user) { this.user = user; }
}
