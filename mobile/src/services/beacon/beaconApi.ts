import { apiClient } from '../api';
import {
  normalizeBeaconIdentity,
  type BeaconIdentity,
} from './ibeacon';

export interface ResolvedBeacon {
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

export interface BeaconResolutionResult {
  data: ResolvedBeacon | null;
  error: string | null;
  status: number;
  ok: boolean;
}

export const beaconApi = {
  async resolve(identity: BeaconIdentity): Promise<BeaconResolutionResult> {
    const normalized = normalizeBeaconIdentity(identity);
    if (!normalized) {
      return {
        data: null,
        error: 'Beacon identity is invalid.',
        status: 400,
        ok: false,
      };
    }

    const endpoint =
      'beacons/resolve' +
      `?uuid=${encodeURIComponent(normalized.uuid)}` +
      `&major=${normalized.major}` +
      `&minor=${normalized.minor}`;

    const result = await apiClient.get<ResolvedBeacon>(endpoint);
    return {
      data: result.data,
      error: result.error,
      status: result.status,
      ok: result.ok,
    };
  },
};
