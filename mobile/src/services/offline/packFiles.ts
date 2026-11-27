/**
 * Downloads the content pack and keeps it in the app's document directory.
 *
 * The pack index (`pack.json`) is replaced only after every file is present, so
 * an interrupted update leaves the previous pack usable. Downloaded files are
 * named by content hash and are reused by the next attempt.
 */

import { Directory, File, Paths } from 'expo-file-system';
import { apiClient, buildApiUrl } from '../api';
import { isOfflineManifest, planDownload } from './plan';
import { setOfflinePack, type OfflineManifest, type OfflinePack } from './store';

const FREE_SPACE_MARGIN = 50 * 1024 * 1024;

interface PackIndex {
  manifest: OfflineManifest;
  downloadedAt: string;
}

export interface DownloadProgress {
  doneFiles: number;
  totalFiles: number;
  doneBytes: number;
  totalBytes: number;
}

const rootDirectory = () => new Directory(Paths.document, 'offline');
const mediaDirectory = () => new Directory(rootDirectory(), 'media');
const indexFile = () => new File(rootDirectory(), 'pack.json');

function toPack(index: PackIndex): OfflinePack {
  const localFiles: Record<number, string> = {};
  let totalBytes = 0;

  for (const planned of planDownload(index.manifest)) {
    const file = new File(mediaDirectory(), planned.localName);
    if (file.exists && file.size === planned.size) {
      localFiles[planned.multimediaId] = file.uri;
      totalBytes += planned.size;
    }
  }

  return { ...index, localFiles, totalBytes };
}

/** Restores the pack saved earlier. Safe to call when nothing was downloaded. */
export async function loadOfflinePack(): Promise<void> {
  try {
    const file = indexFile();
    if (!file.exists) {
      return;
    }
    const index = JSON.parse(await file.text()) as PackIndex;
    if (isOfflineManifest(index.manifest)) {
      setOfflinePack(toPack(index));
    }
  } catch {
    // A damaged index behaves like "not downloaded"; the user can download again.
  }
}

export async function fetchManifest(): Promise<OfflineManifest> {
  const result = await apiClient.get<OfflineManifest>('offline/manifest', {
    timeoutMs: 20000,
  });
  if (!result.ok || !isOfflineManifest(result.data)) {
    throw new Error(result.error || 'Máy chủ không trả về gói nội dung hợp lệ.');
  }
  return result.data;
}

export async function downloadOfflinePack(
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
  const manifest = await fetchManifest();
  const files = planDownload(manifest);
  const media = mediaDirectory();
  media.create({ intermediates: true, idempotent: true });

  const isPresent = (name: string, size: number) => {
    const file = new File(media, name);
    return file.exists && file.size === size;
  };

  const missingBytes = files
    .filter((file) => !isPresent(file.localName, file.size))
    .reduce((sum, file) => sum + file.size, 0);
  if (Paths.availableDiskSpace < missingBytes + FREE_SPACE_MARGIN) {
    throw new Error('Điện thoại không đủ dung lượng trống để tải nội dung.');
  }

  const progress: DownloadProgress = {
    doneFiles: 0,
    totalFiles: files.length,
    doneBytes: 0,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  };
  onProgress({ ...progress });

  for (const planned of files) {
    if (!isPresent(planned.localName, planned.size)) {
      const partial = new File(media, `${planned.localName}.part`);
      await File.downloadFileAsync(
        buildApiUrl(`multimedia/${planned.multimediaId}/file`),
        partial,
        { idempotent: true },
      );
      if (partial.size !== planned.size) {
        partial.delete();
        throw new Error('Tệp tải về không đầy đủ. Vui lòng thử lại.');
      }
      await partial.move(new File(media, planned.localName), { overwrite: true });
    }
    progress.doneFiles += 1;
    progress.doneBytes += planned.size;
    onProgress({ ...progress });
  }

  const index: PackIndex = { manifest, downloadedAt: new Date().toISOString() };
  const temporary = new File(rootDirectory(), 'pack.json.part');
  temporary.create({ overwrite: true });
  temporary.write(JSON.stringify(index));
  await temporary.move(indexFile(), { overwrite: true });
  setOfflinePack(toPack(index));

  // Remove files that the new pack no longer references.
  const wanted = new Set(files.map((file) => file.localName));
  for (const entry of media.list()) {
    if (entry instanceof File && !wanted.has(entry.name)) {
      entry.delete();
    }
  }
}

export async function removeOfflinePack(): Promise<void> {
  setOfflinePack(null);
  const root = rootDirectory();
  if (root.exists) {
    root.delete();
  }
}
