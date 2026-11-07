
package com.university.backend.controller;

import com.university.backend.dto.ApiResponse;
import com.university.backend.dto.HeritageSiteRequest;
import com.university.backend.dto.HeritageSiteResponse;
import com.university.backend.dto.PageResponse;
import com.university.backend.entity.HeritageSite;
import com.university.backend.service.HeritageSiteService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/heritage-sites")
public class HeritageSiteController {

    private final HeritageSiteService heritageSiteService;

    public HeritageSiteController(HeritageSiteService heritageSiteService) {
        this.heritageSiteService = heritageSiteService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAllHeritageSites(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        // Giữ response List cũ nếu không yêu cầu phân trang.
        if (page == null && size == null) {
            List<HeritageSiteResponse> sites = heritageSiteService
                    .searchHeritageSites(keyword, sortBy, direction)
                    .stream()
                    .map(HeritageSiteResponse::fromEntity)
                    .toList();

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Heritage sites retrieved successfully",
                            sites
                    )
            );
        }

        // Có yêu cầu phân trang.
        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;

        Page<HeritageSiteResponse> sites = heritageSiteService
                .searchHeritageSites(
                        keyword,
                        pageNumber,
                        pageSize,
                        sortBy,
                        direction
                )
                .map(HeritageSiteResponse::fromEntity);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Heritage sites retrieved successfully",
                        PageResponse.from(sites)
                )
        );
    }

    @GetMapping("/{siteId}")
    public ResponseEntity<ApiResponse<HeritageSiteResponse>> getHeritageSiteById(
            @PathVariable Integer siteId) {

        HeritageSite site = heritageSiteService.getHeritageSiteById(siteId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Heritage site retrieved successfully",
                        HeritageSiteResponse.fromEntity(site)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<HeritageSiteResponse>> createHeritageSite(
            @Valid @RequestBody HeritageSiteRequest request) {

        HeritageSite site = new HeritageSite();
        site.setName(request.getName());
        site.setDescription(request.getDescription());
        site.setAddress(request.getAddress());
        site.setLatitude(request.getLatitude());
        site.setLongitude(request.getLongitude());

        HeritageSite createdSite = heritageSiteService.createHeritageSite(site);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(
                        "Heritage site created successfully",
                        HeritageSiteResponse.fromEntity(createdSite)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{siteId}")
    public ResponseEntity<ApiResponse<HeritageSiteResponse>> updateHeritageSite(
            @PathVariable Integer siteId,
            @Valid @RequestBody HeritageSiteRequest request) {

        HeritageSite updatedSite = new HeritageSite();
        updatedSite.setName(request.getName());
        updatedSite.setDescription(request.getDescription());
        updatedSite.setAddress(request.getAddress());
        updatedSite.setLatitude(request.getLatitude());
        updatedSite.setLongitude(request.getLongitude());

        HeritageSite site = heritageSiteService.updateHeritageSite(siteId, updatedSite);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Heritage site updated successfully",
                        HeritageSiteResponse.fromEntity(site)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{siteId}")
    public ResponseEntity<ApiResponse<Void>> deleteHeritageSite(
            @PathVariable Integer siteId) {

        heritageSiteService.deleteHeritageSite(siteId);

        return ResponseEntity.ok(
                ApiResponse.success("Heritage site deleted successfully", null));
    }
}
