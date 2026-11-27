package com.university.backend.entity;

import jakarta.persistence.*;

/** Binary content of a multimedia item, kept apart from its metadata row. */
@Entity
@Table(name = "multimedia_file")
public class MultimediaFile {

    /** Upper bound used only to size the column in the H2 test schema. */
    private static final int MAX_FILE_BYTES = 100 * 1024 * 1024;

    @Id
    @Column(name = "multimedia_id")
    private Integer multimediaId;

    @Column(name = "file_data", nullable = false, length = MAX_FILE_BYTES)
    private byte[] fileData;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    public MultimediaFile() {}

    public Integer getMultimediaId() { return multimediaId; }
    public void setMultimediaId(Integer multimediaId) { this.multimediaId = multimediaId; }
    public byte[] getFileData() { return fileData; }
    public void setFileData(byte[] fileData) { this.fileData = fileData; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getSha256() { return sha256; }
    public void setSha256(String sha256) { this.sha256 = sha256; }
}
