package com.university.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtExpirationHttpTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Value("${app.jwt.secret}")
    private String testSecret;

    @Test
    void expiredJwtReturns401() throws Exception {

        JwtTokenProvider expiredIssuer =
            new JwtTokenProvider(testSecret, -60000L);

        String expiredToken =
            expiredIssuer.generateToken("qa_user", "VISITOR");

        assertFalse(tokenProvider.validateToken(expiredToken));

        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }
}
