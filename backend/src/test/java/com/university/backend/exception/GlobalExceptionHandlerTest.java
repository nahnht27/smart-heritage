package com.university.backend.exception;

import com.university.backend.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleDataIntegrityViolation_eventIdConstraintReturnsDuplicateMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "Unique index or primary key violation: \"UK_VISITOR_INTERACTION_EVENT_ID\" ON PUBLIC.VISITOR_INTERACTION(EVENT_ID)",
                null);
        ResponseEntity<ApiResponse<Void>> res = handler.handleDataIntegrityViolation(ex, new MockHttpServletRequest());
        assertEquals(HttpStatus.CONFLICT, res.getStatusCode());
        assertNotNull(res.getBody());
        assertFalse(res.getBody().isSuccess());
        assertEquals("The submitted eventId has already been recorded.", res.getBody().getMessage());
    }

    @Test
    void handleDataIntegrityViolation_otherConstraintReturnsGenericMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "Unique index or primary key violation: \"UK_OTHER_CONSTRAINT\" ON PUBLIC.OTHER_TABLE(COLUMN)",
                null);
        ResponseEntity<ApiResponse<Void>> res = handler.handleDataIntegrityViolation(ex, new MockHttpServletRequest());
        assertEquals(HttpStatus.CONFLICT, res.getStatusCode());
        assertNotNull(res.getBody());
        assertFalse(res.getBody().isSuccess());
        assertEquals("Lỗi toàn vẹn dữ liệu. Vui lòng kiểm tra lại dữ liệu gửi lên.", res.getBody().getMessage());
    }
}
