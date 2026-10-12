package com.university.backend.service;

import com.university.backend.dto.*;
import com.university.backend.entity.Role;
import com.university.backend.entity.User;
import com.university.backend.exception.BadCredentialsException;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.RoleRepository;
import com.university.backend.repository.UserRepository;
import com.university.backend.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository; this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder; this.tokenProvider = tokenProvider;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) throw new DuplicateResourceException("Username already exists");
        if (userRepository.existsByEmail(request.getEmail())) throw new DuplicateResourceException("Email already exists");
        Role visitorRole = roleRepository.findByName("VISITOR").orElseGet(() -> roleRepository.save(new Role("VISITOR")));
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(visitorRole);
        user = userRepository.save(user);
        return toUserResponse(user);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new BadCredentialsException("Invalid username or password");
        String roleName = user.getRole().getName();
        String token = tokenProvider.generateToken(user.getUsername(), roleName);
        return new LoginResponse(token, "Bearer", tokenProvider.getExpirationSeconds(), toUserResponse(user));
    }

    public UserResponse getProfile(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (request.getUsername() != null) {
            if (!request.getUsername().equals(user.getUsername()) && userRepository.existsByUsername(request.getUsername()))
                throw new DuplicateResourceException("Username already exists");
            user.setUsername(request.getUsername());
        }
        if (request.getPreferredLanguageId() != null) user.setPreferredLanguageId(request.getPreferredLanguageId());
        user = userRepository.save(user);
        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.getUserId(), user.getUsername(), user.getEmail(), user.getRole().getName(), user.getPreferredLanguageId());
    }
}
