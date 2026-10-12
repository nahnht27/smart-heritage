package com.university.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private String timestamp;
    private String path;
    private List<FieldError> errors;

    public ApiResponse() { this.timestamp = Instant.now().toString(); }

    public static <T> ApiResponse<T> success(String message, T data) {
        ApiResponse<T> r = new ApiResponse<>(); r.success = true; r.message = message; r.data = data; return r;
    }
    public static <T> ApiResponse<T> success(T data) { return success("Request completed successfully", data); }
    public static ApiResponse<Void> error(String message, String path) {
        ApiResponse<Void> r = new ApiResponse<>(); r.success = false; r.message = message; r.path = path; return r;
    }
    public static ApiResponse<Void> error(String message, String path, List<FieldError> errors) {
        ApiResponse<Void> r = new ApiResponse<>(); r.success = false; r.message = message; r.path = path; r.errors = errors; return r;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public List<FieldError> getErrors() { return errors; }
    public void setErrors(List<FieldError> errors) { this.errors = errors; }

    public static class FieldError {
        private String field;
        private String message;
        public FieldError() {}
        public FieldError(String field, String message) { this.field = field; this.message = message; }
        public String getField() { return field; }
        public void setField(String field) { this.field = field; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
