package com.university.backend.dto;

/** Describes a stored file without its bytes. */
public record MultimediaFileInfo(
        Integer multimediaId,
        String fileName,
        String contentType,
        Long fileSize,
        String sha256) {
}
