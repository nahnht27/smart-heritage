package com.university.backend.security;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtExpirationTest {

    private static final String TEST_SECRET =
        "test-only-jwt-secret-not-for-production-1234567890";

    @Test
    void validTokenIsAccepted() {
        JwtTokenProvider provider =
            new JwtTokenProvider(TEST_SECRET, 60000L);

        String token = provider.generateToken("qa_user", "ADMIN");

        assertTrue(provider.validateToken(token));
        assertEquals("qa_user", provider.getUsernameFromToken(token));
    }

    @Test
    void expiredTokenIsRejected() {
        JwtTokenProvider issuer =
            new JwtTokenProvider(TEST_SECRET, -60000L);

        JwtTokenProvider validator =
            new JwtTokenProvider(TEST_SECRET, 60000L);

        String token = issuer.generateToken("qa_user", "ADMIN");

        assertFalse(validator.validateToken(token));

        assertThrows(
            ExpiredJwtException.class,
            () -> validator.getUsernameFromToken(token)
        );
    }

    @Test
    void malformedTokenIsRejected() {
        JwtTokenProvider provider =
            new JwtTokenProvider(TEST_SECRET, 60000L);

        assertFalse(provider.validateToken("invalid.jwt.token"));
    }
}
