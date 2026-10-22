package com.university.backend.dto;

import com.university.backend.entity.HeritageSite;
import java.math.BigDecimal;

public class HeritageSiteResponse {

    private Integer siteId;
    private String name;
    private String description;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;

    public HeritageSiteResponse() {
    }

    public HeritageSiteResponse(
            Integer siteId,
            String name,
            String description,
            String address,
            BigDecimal latitude,
            BigDecimal longitude) {
        this.siteId = siteId;
        this.name = name;
        this.description = description;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static HeritageSiteResponse fromEntity(HeritageSite site) {
        return new HeritageSiteResponse(
                site.getSiteId(),
                site.getName(),
                site.getDescription(),
                site.getAddress(),
                site.getLatitude(),
                site.getLongitude()
        );
    }

    public Integer getSiteId() {
        return siteId;
    }

    public void setSiteId(Integer siteId) {
        this.siteId = siteId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }
}
