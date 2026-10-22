package com.university.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.dto.LoginRequest;
import com.university.backend.entity.Role;
import com.university.backend.entity.User;
import com.university.backend.repository.RoleRepository;
import com.university.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

abstract class ContentApiTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected RoleRepository roleRepository;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanContentTestUsers() {
        userRepository.deleteAll();
    }

    protected String createUserAndGetToken(
            String username,
            String email,
            String password,
            String roleName) throws Exception {

        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        userRepository.save(user);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(username, password))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(
                result.getResponse().getContentAsString());

        String token = response.path("data").path("accessToken").asText();

        if (token.isBlank()) {
            throw new IllegalStateException(
                    "Login succeeded but no access token was returned");
        }

        return token;
    }

    protected String createAdminToken() throws Exception {
        return createUserAndGetToken(
                "content_admin",
                "content_admin@example.com",
                "AdminPass123!",
                "ADMIN");
    }

    protected String createVisitorToken() throws Exception {
        return createUserAndGetToken(
                "content_visitor",
                "content_visitor@example.com",
                "VisitorPass123!",
                "VISITOR");
    }
}
