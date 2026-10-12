package com.university.backend.controller;

import com.university.backend.dto.*;
import com.university.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final AuthService authService;
    public UserController(AuthService authService) { this.authService = authService; }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        UserResponse profile = authService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse updated = authService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }
}
