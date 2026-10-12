package com.university.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {
    private final ObjectMapper objectMapper;
    public SecurityErrorHandler(ObjectMapper objectMapper) { this.objectMapper = objectMapper; }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {
        writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication is required to access this resource", request.getRequestURI());
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException {
        writeError(response, HttpServletResponse.SC_FORBIDDEN, "You do not have permission to access this resource", request.getRequestURI());
    }

    private void writeError(HttpServletResponse response, int status, String message, String path) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(message, path));
    }
}
