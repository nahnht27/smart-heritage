package com.university.backend.dto;

import java.util.List;

/**
 * Snapshot of all public content, downloaded once by the visitor app.
 *
 * <p>{@code contentVersion} changes whenever any of the listed content changes,
 * which lets the app tell whether its offline copy is out of date.</p>
 */
public record OfflineManifestResponse(
        String contentVersion,
        List<HeritageSiteResponse> sites,
        List<ArtifactResponse> artifacts,
        List<MultimediaResponse> multimedia,
        List<BeaconResponse> beacons) {
}
