import type { OfflineManifest } from './store';

export interface PlannedFile {
  multimediaId: number;
  /** Name on disk. Derived from the content hash, so unchanged files are reused. */
  localName: string;
  size: number;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'video/mp4': 'mp4',
};

const SHA_PATTERN = /^[0-9a-f]{64}$/i;

/** Files the pack needs. Items that only link to an external URL are skipped. */
export function planDownload(manifest: OfflineManifest): PlannedFile[] {
  const files: PlannedFile[] = [];

  for (const item of manifest.multimedia) {
    // The hash becomes a file name, so anything unexpected is rejected.
    if (!item.hasFileData || !item.sha256 || !SHA_PATTERN.test(item.sha256)) {
      continue;
    }
    const extension = EXTENSIONS[item.contentType ?? ''] ?? 'bin';
    files.push({
      multimediaId: item.multimediaId,
      localName: `${item.sha256.toLowerCase()}.${extension}`,
      size: item.fileSize ?? 0,
    });
  }

  return files;
}

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isOfflineManifest(value: unknown): value is OfflineManifest {
  const manifest = value as Partial<OfflineManifest> | null;
  return (
    !!manifest &&
    typeof manifest.contentVersion === 'string' &&
    Array.isArray(manifest.sites) &&
    Array.isArray(manifest.artifacts) &&
    Array.isArray(manifest.multimedia) &&
    Array.isArray(manifest.beacons)
  );
}
