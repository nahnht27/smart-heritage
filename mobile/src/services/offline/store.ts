/**
 * In-memory view of the downloaded content pack.
 *
 * Pure TypeScript (no native modules) so the content and beacon services can
 * read it directly. `packFiles.ts` is responsible for filling it from disk.
 */

export interface ManifestSite {
  siteId: number;
  name: string;
  description: string;
  address: string | null;
}

export interface ManifestArtifact {
  artifactId: number;
  siteId: number;
  siteName: string | null;
  name: string;
  description: string;
}

export interface ManifestMultimedia {
  multimediaId: number;
  artifactId: number;
  artifactName: string | null;
  type: string;
  title: string | null;
  url: string;
  hasFileData?: boolean;
  fileName?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  sha256?: string | null;
}

export interface ManifestBeacon {
  beaconId: number;
  name: string;
  uuid: string;
  major: number;
  minor: number;
  enabled: boolean;
  artifactId: number | null;
  artifactName: string | null;
  siteId: number | null;
  siteName: string | null;
}

export interface OfflineManifest {
  contentVersion: string;
  sites: ManifestSite[];
  artifacts: ManifestArtifact[];
  multimedia: ManifestMultimedia[];
  beacons: ManifestBeacon[];
}

export interface OfflinePack {
  manifest: OfflineManifest;
  /** Local `file://` URI for each multimedia ID that has a downloaded file. */
  localFiles: Record<number, string>;
  downloadedAt: string;
  totalBytes: number;
}

type Listener = () => void;

let currentPack: OfflinePack | null = null;
const listeners = new Set<Listener>();

export function getOfflinePack(): OfflinePack | null {
  return currentPack;
}

export function setOfflinePack(pack: OfflinePack | null): void {
  currentPack = pack;
  listeners.forEach((listener) => listener());
}

export function subscribeToOfflinePack(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function findOfflineBeacon(
  uuid: string,
  major: number,
  minor: number,
): ManifestBeacon | null {
  const wanted = uuid.toLowerCase();
  return (
    currentPack?.manifest.beacons.find(
      (beacon) =>
        beacon.uuid.toLowerCase() === wanted &&
        beacon.major === major &&
        beacon.minor === minor,
    ) ?? null
  );
}
