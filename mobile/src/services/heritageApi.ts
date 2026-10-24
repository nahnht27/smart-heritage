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
  tagline: string | null;
  location: string | null;
  openHours: string | null;
  ticketPrice: string | null;
  description: string;
  heroImageUrl: string | null;
}

export interface Artifact {
  id: string | number;
  name: string;
  era: string | null;
  category: string | null;
  description: string;
  locationInMuseum: string | null;
  imageUrl: string | null;
  isFeatured?: boolean;
}

export interface Multimedia {
  id: string | number;
  artifactId: string | number;
  type: 'image' | 'audio' | 'video';
  url: string;
  title?: string | null;
  durationSeconds?: number | null;
}

export interface HeritageApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

// Backend DTO shapes (từ ApiResponse.data sau khi unwrap)
interface BackendHeritageSite {
  siteId: number;
  name: string;
  description: string;
  address: string | null;
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
    tagline: null,
    location: s.address,
    openHours: null,
    ticketPrice: null,
    description: s.description,
    heroImageUrl: null,
  };
}

function mapArtifact(a: BackendArtifact): Artifact {
  return {
    id: a.artifactId,
    name: a.name,
    era: null,
    category: null,
    description: a.description,
    locationInMuseum: null,
    imageUrl: null,
    isFeatured: false,
  };
}

function mapMultimedia(m: BackendMultimedia): Multimedia {
  return {
    id: m.multimediaId,
    artifactId: m.artifactId,
    type: (m.type === 'image' || m.type === 'audio' || m.type === 'video'
      ? m.type
      : 'image') as Multimedia['type'],
    url: m.url,
    title: m.title,
    durationSeconds: null,
  };
}

export const heritageApi = {
  async getHeritageSites(): Promise<HeritageApiResponse<HeritageSite[]>> {
    const result = await apiClient.get<BackendHeritageSite[]>(SITES);
    return {
      data: result.data?.map(mapHeritageSite) ?? null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getHeritageSiteById(id: number | string): Promise<HeritageApiResponse<HeritageSite>> {
    const result = await apiClient.get<BackendHeritageSite>(`${SITES}/${id}`);
    return {
      data: result.data ? mapHeritageSite(result.data) : null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactsBySite(siteId: number | string): Promise<HeritageApiResponse<Artifact[]>> {
    const result = await apiClient.get<BackendArtifact[]>(`${ARTIFACTS}?siteId=${siteId}`);
    return {
      data: result.data?.map(mapArtifact) ?? null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactById(id: string | number): Promise<HeritageApiResponse<Artifact>> {
    const result = await apiClient.get<BackendArtifact>(`${ARTIFACTS}/${id}`);
    return {
      data: result.data ? mapArtifact(result.data) : null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },

  async getArtifactMultimedia(artifactId: string | number): Promise<HeritageApiResponse<Multimedia[]>> {
    const result = await apiClient.get<BackendMultimedia[]>(`${MULTIMEDIA}?artifactId=${artifactId}`);
    return {
      data: result.data?.map(mapMultimedia) ?? null,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },
};
