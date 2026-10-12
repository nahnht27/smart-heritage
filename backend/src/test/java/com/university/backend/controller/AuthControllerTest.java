package com.university.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.dto.LoginRequest;
import com.university.backend.dto.RegisterRequest;
import com.university.backend.entity.Role;
import com.university.backend.entity.User;
import com.university.backend.repository.RoleRepository;
import com.university.backend.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanup() { userRepository.deleteAll(); }

    @Test @DisplayName("Register valid input 201")
    void register_valid() throws Exception {
        RegisterRequest req = new RegisterRequest("testuser", "test@example.com", "secret123");
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.username").value("testuser")).andExpect(jsonPath("$.data.role").value("VISITOR"))
            .andExpect(jsonPath("$.data.userId").isNumber()).andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test @DisplayName("Password stored hashed")
    void register_hashed() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("hashtest", "hash@example.com", "mypassword"))))
            .andExpect(status().isCreated());
        User saved = userRepository.findByUsername("hashtest").orElseThrow();
        assertNotEquals("mypassword", saved.getPasswordHash());
        assertTrue(passwordEncoder.matches("mypassword", saved.getPasswordHash()));
    }

    @Test @DisplayName("Missing fields 400")
    void register_missing() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("", "", ""))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errors", hasSize(greaterThanOrEqualTo(3))));
    }

    @Test @DisplayName("Invalid email 400")
    void register_badEmail() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("testuser", "not-an-email", "secret123"))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
    }

    @Test @DisplayName("Duplicate username 409")
    void register_dupUser() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("dup", "dup@example.com", "secret123")))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("dup", "other@example.com", "secret123"))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.success").value(false));
    }

    @Test @DisplayName("Duplicate email 409")
    void register_dupEmail() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("user1", "same@example.com", "secret123")))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("user2", "same@example.com", "secret123"))))
            .andExpect(status().isConflict());
    }

    @Test @DisplayName("Login valid 200 with token")
    void login_valid() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("loginuser", "login@example.com", "secret123")))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new LoginRequest("loginuser", "secret123"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").isString())
            .andExpect(jsonPath("$.data.tokenType").value("Bearer")).andExpect(jsonPath("$.data.expiresIn").isNumber())
            .andExpect(jsonPath("$.data.user.role").value("VISITOR")).andExpect(jsonPath("$.data.user.passwordHash").doesNotExist());
    }

    @Test @DisplayName("Login wrong password 401")
    void login_wrongPw() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("wpuser", "wp@example.com", "secret123")))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new LoginRequest("wpuser", "wrong"))))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test @DisplayName("Login no user 401")
    void login_noUser() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new LoginRequest("nouser", "secret123"))))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test @DisplayName("Profile no token 401")
    void profile_noToken() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false));
    }

    @Test @DisplayName("Profile with token 200")
    void profile_withToken() throws Exception {
        String token = registerAndLogin("puser", "p@example.com", "secret123");
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.username").value("puser"))
            .andExpect(jsonPath("$.data.role").value("VISITOR")).andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test @DisplayName("Update profile 200")
    void updateProfile() throws Exception {
        String token = registerAndLogin("upd", "upd@example.com", "secret123");
        mockMvc.perform(put("/api/users/me").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(java.util.Map.of("username","newname","preferredLanguageId",1))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.username").value("newname")).andExpect(jsonPath("$.data.preferredLanguageId").value(1));
    }

    @Test @DisplayName("Cannot escalate role")
    void noEscalate() throws Exception {
        String token = registerAndLogin("esc", "esc@example.com", "secret123");
        mockMvc.perform(put("/api/users/me").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("VISITOR"));
    }

    @Test @DisplayName("Admin login and access")
    void adminAccess() throws Exception {
        Role ar = roleRepository.findByName("ADMIN").orElseGet(() -> roleRepository.save(new Role("ADMIN")));
        User a = new User(); a.setUsername("adm"); a.setEmail("adm@example.com");
        a.setPasswordHash(passwordEncoder.encode("adminpass")); a.setRole(ar); userRepository.save(a);
        MvcResult r = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new LoginRequest("adm", "adminpass"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.user.role").value("ADMIN")).andReturn();
        String token = objectMapper.readTree(r.getResponse().getContentAsString()).path("data").path("accessToken").asText();
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("ADMIN"));
    }

    @Test @DisplayName("Health endpoint works")
    void health() throws Exception {
        mockMvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }

    @Test @DisplayName("Validation error format")
    void validationFormat() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("ab", "bad", "12"))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Request validation failed")).andExpect(jsonPath("$.path").value("/api/auth/register"))
            .andExpect(jsonPath("$.errors").isArray()).andExpect(jsonPath("$.errors[0].field").isString());
    }

    @Test @DisplayName("Malformed JSON 400")
    void malformed() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{bad"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Malformed request body"));
    }

    @Test @DisplayName("Success envelope format")
    void envelope() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest("env", "env@example.com", "secret123"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").isString()).andExpect(jsonPath("$.data").isMap()).andExpect(jsonPath("$.timestamp").isString());
    }

    private String registerAndLogin(String u, String e, String p) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new RegisterRequest(u, e, p)))).andExpect(status().isCreated());
        MvcResult r = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new LoginRequest(u, p)))).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).path("data").path("accessToken").asText();
    }
}
