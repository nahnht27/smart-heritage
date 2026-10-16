
package com.university.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "heritage_site")
public class HeritageSite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "site_id")
    private Integer siteId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    public HeritageSite() {}

    public Integer getSiteId() { return siteId; }
    public void setSiteId(Integer siteId) { this.siteId = siteId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }
}
