/**
 * Smart Heritage - Heritage Content API Service
 *
 * Sprint 3 (LTJ-33): Thay mock data bằng API backend thật cho Heritage Sites và Artifacts.
 *
 * Endpoint prefix: /api (tuân theo README_M3 và apiClient hiện có).
 * - GET /api/heritage-sites
 * - GET /api/heritage-sites/{id}
 * - GET /api/artifacts?siteId={siteId}
 * - GET /api/artifacts/{id}
 * - GET /api/multimedia?artifactId={id}
 *
 * apiRequest đã unwrap envelope ApiResponse<T> của backend về trường `data`.
 * Các field backend không cung cấp (tagline, openHours, ticketPrice, heroImageUrl,
 * era, category, locationInMuseum, imageUrl, isFeatured, durationSeconds) được để
 * null/mặc định thay vì bịa dữ liệu, tuân thủ "không giả vờ dữ liệu từ server".
 */

import { apiClient } from './api';

export interface HeritageSite {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  preferredLanguageId?: number | null;
}

export interface Artifact {
  id: number;
  name: string;
  description: string | null;
  siteId: number;
  siteName?: string | null;
  imageUrl?: string | null;
  address?: string | null;
}

export type MultimediaType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'UNKNOWN';

export interface Multimedia {
  id: number;
  artifactId: number;
  type: MultimediaType;
  title: string | null;
  url: string;
}

const SUPPORTED_MULTIMEDIA_TYPES: MultimediaType[] = [
  'IMAGE',
  'AUDIO',
  'VIDEO',
];

/**
 * The backend stores the type exactly as submitted by the admin web (`IMAGE`),
 * while older data/tests may use lowercase (`image`). Normalize once here so
 * every screen can compare against the same values.
 */
export function normalizeMultimediaType(
  type: string | null | undefined,
): MultimediaType {
  const normalized = (type ?? '').trim().toUpperCase();

  return (SUPPORTED_MULTIMEDIA_TYPES as string[]).includes(normalized)
    ? (normalized as MultimediaType)
    : 'UNKNOWN';
}

/**
 * Accept only absolute HTTP(S) URLs. `null`, empty strings, relative paths and
 * malformed values must never reach `<Image />`.
 */
export function isUsableMediaUrl(
  url: string | null | undefined,
): url is string {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());
}

/**
 * Select the first usable image from an artifact's multimedia list.
 */
export function selectArtifactThumbnail(
  multimedia: Multimedia[] | null | undefined,
): string | null {
  if (!Array.isArray(multimedia)) {
    return null;
  }

  const image = multimedia.find(
    (item) => item.type === 'IMAGE' && isUsableMediaUrl(item.url),
  );

  return image ? image.url.trim() : null;
}

// Backend DTO shapes (từ ApiResponse.data sau khi unwrap)
interface BackendHeritageSite {
  siteId: number;
  name: string;
  description: string;
  address: string | null;
  preferredLanguageId?: number | null;
}

interface BackendArtifact {
  artifactId: number;
  siteId: number;
  siteName: string | null;
  name: string;
  description: string;
}

interface BackendMultimedia {
  multimediaId: number;
  artifactId: number;
  artifactName: string | null;
  type: string;
  title: string | null;
  url: string;
}

const SITES = 'heritage-sites';
const ARTIFACTS = 'artifacts';
const MULTIMEDIA = 'multimedia';

function mapHeritageSite(s: BackendHeritageSite): HeritageSite {
  return {
    id: s.siteId,
    name: s.name,
    description: s.description,
    address: s.address,
    preferredLanguageId: s.preferredLanguageId,
  };
}

function mapArtifact(a: BackendArtifact): Artifact {
  return {
    id: a.artifactId,
    name: a.name,
    description: a.description,
    siteId: a.siteId,
    siteName: a.siteName,
    imageUrl: null,
    address: null,
  };
}

function mapMultimedia(m: BackendMultimedia): Multimedia {
  return {
    id: m.multimediaId,
    artifactId: m.artifactId,
    type: normalizeMultimediaType(m.type),
    title: m.title,
    url: m.url,
  };
}

export const heritageApi = {
  async getHeritageSites(): Promise<{
    data: HeritageSite[] | null;
    error: string | null;
    status: number;
    ok: boolean;
  }> {
    const result = await apiClient.get<BackendHeritageSite[]>(SITES);
    return {
      data: result.data?.map(mapHeritageSite) ?? null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getHeritageSiteById(id: number | string): Promise<{
    data: HeritageSite | null;
    error: string | null;
    status: number;
    ok: boolean;
  }> {
    const result = await apiClient.get<BackendHeritageSite>(`${SITES}/${id}`);
    return {
      data: result.data ? mapHeritageSite(result.data) : null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactsBySite(siteId: number | string): Promise<{
    data: Artifact[] | null;
    error: string | null;
    status: number;
    ok: boolean;
  }> {
    const result = await apiClient.get<BackendArtifact[]>(`${ARTIFACTS}?siteId=${siteId}`);
    return {
      data: result.data?.map(mapArtifact) ?? null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactById(id: string | number): Promise<{
    data: Artifact | null;
    error: string | null;
    status: number;
    ok: boolean;
  }> {
    const result = await apiClient.get<BackendArtifact>(`${ARTIFACTS}/${id}`);
    return {
      data: result.data ? mapArtifact(result.data) : null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactMultimedia(artifactId: string | number): Promise<{
    data: Multimedia[] | null;
    error: string | null;
    status: number;
    ok: boolean;
  }> {
    const result = await apiClient.get<BackendMultimedia[]>(`${MULTIMEDIA}?artifactId=${artifactId}`);
    return {
      data: result.data?.map(mapMultimedia) ?? null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactThumbnail(artifactId: string | number): Promise<string | null> {
    const result = await heritageApi.getArtifactMultimedia(artifactId);

    if (!result.ok || !result.data) {
      return null;
    }

    return selectArtifactThumbnail(result.data);
  },

  async getArtifactsWithThumbnailsBySite(
    siteId: string | number,
    limit?: number,
  ): Promise<{
    data: Artifact[] | null;
    error: string | null;
    status: number;
    ok: boolean;
  }> {
    const result = await heritageApi.getArtifactsBySite(siteId);

    if (!result.ok || !result.data) {
      return result;
    }

    const selectedArtifacts =
      typeof limit === 'number' ? result.data.slice(0, limit) : result.data;

    const data = await Promise.all(
      selectedArtifacts.map(async (artifact) => ({
        ...artifact,
        imageUrl: await heritageApi.getArtifactThumbnail(artifact.id),
      })),
    );

    return { ...result, data };
  },
};
