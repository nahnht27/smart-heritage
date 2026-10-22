package com.university.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Kiểm tra cấu hình CORS cho tích hợp frontend (Admin Web, Expo Web, Android Emulator).
 * CORS được xử lý trước bước xác thực JWT, do preflight OPTIONS không yêu cầu token.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CorsIntegrationTest {

    private static final String ADMIN_WEB_ORIGIN = "http://localhost:5173";
    private static final String DISALLOWED_ORIGIN = "http://evil.example.com";

    @Autowired
    private MockMvc mockMvc;

    private static String allowOrigin(MvcResult result) {
        return result.getResponse().getHeader("Access-Control-Allow-Origin");
    }

    private static boolean hasMethod(MvcResult result, String method) {
        String methods = result.getResponse().getHeader("Access-Control-Allow-Methods");
        return methods != null && methods.contains(method);
    }

    private static boolean hasHeader(MvcResult result, String header) {
        String headers = result.getResponse().getHeader("Access-Control-Allow-Headers");
        return headers != null && headers.contains(header);
    }

    @Test
    void preflightFromAdminWebOriginIsAllowed() throws Exception {
        MvcResult result = mockMvc.perform(options("/api/auth/login")
                        .header("Origin", ADMIN_WEB_ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Authorization, Content-Type"))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals(ADMIN_WEB_ORIGIN, allowOrigin(result));
        assertTrue(hasMethod(result, "POST"));
        assertTrue(hasHeader(result, "Authorization"));
    }

    @Test
    void preflightWithAuthorizationHeaderIsAllowed() throws Exception {
        MvcResult result = mockMvc.perform(options("/api/users/me")
                        .header("Origin", ADMIN_WEB_ORIGIN)
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals(ADMIN_WEB_ORIGIN, allowOrigin(result));
        assertTrue(hasMethod(result, "GET"));
    }

    @Test
    void disallowedOriginIsNotAllowed() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", DISALLOWED_ORIGIN)
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(result -> assertFalse(allowOrigin(result) != null));
    }

    @Test
    void corsDoesNotBypassAuthorization() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Origin", ADMIN_WEB_ORIGIN)
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicGetEndpointWorksWithCors() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/health")
                        .header("Origin", ADMIN_WEB_ORIGIN))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals(ADMIN_WEB_ORIGIN, allowOrigin(result));
    }

    @Test
    void adminWriteEndpointRequiresTokenEvenWithCors() throws Exception {
        mockMvc.perform(post("/api/heritage-sites")
                        .header("Origin", ADMIN_WEB_ORIGIN)
                        .contentType("application/json")
                        .content("{\"name\":\"x\",\"description\":\"y\",\"address\":\"z\",\"latitude\":10,\"longitude\":10}"))
                .andExpect(status().isUnauthorized());
    }
}
