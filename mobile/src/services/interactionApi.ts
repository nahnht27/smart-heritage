/**
 * Smart Heritage - Visitor Interaction API Service
 *
 * LTJ-34 (S3-M3-02): Gửi sự kiện tương tác khách tham quan tới backend.
 *
 * Tuân theo contract docs/requirements/visitor-interaction-data-contract.md.
 *
 * - POST /api/interactions is public; the Bearer token is optional.
 * - Payload: { eventId, visitorId, artifactId, beaconId?, interactionType,
 *   languageCode, startedAt, interactedAt, endedAt? }
 * - interactionType: VIEW | AUDIO_PLAY | SCAN | BEACON_TRIGGER
 * - eventId is a unique UUID and must be reused when retrying one logical event.
 * - visitorId is the persistent pseudonymous installation UUID.
 * - userId and durationSeconds are never sent by the client.
 * - API/network failures return a result instead of crashing or blocking content.
 */

import { apiClient } from './api';
import { authStorage } from './authStorage';
import { visitorStorage } from './visitorStorage';

export type InteractionType = 'VIEW' | 'AUDIO_PLAY' | 'SCAN' | 'BEACON_TRIGGER';

export interface CreateInteractionEvent {
  eventId: string;
  artifactId: number;
  beaconId?: number | null;
  interactionType: InteractionType;
  languageCode: string;
  startedAt: string;
  interactedAt: string;
  endedAt?: string | null;
}

export interface InteractionResult {
  ok: boolean;
  error: string | null;
  status: number;
}

const ENDPOINT = 'interactions';

// Chỉ dùng cho test isolation
export function __resetVisitorIdForTest(): void {
  visitorStorage.__resetForTest();
}

export const interactionApi = {
  async recordInteraction(event: CreateInteractionEvent): Promise<InteractionResult> {
    if (!event.eventId || !isValidUuid(event.eventId)) {
      return {
        ok: false,
        error: 'Invalid eventId: must be a valid UUID.',
        status: 400,
      };
    }

    try {
      const [token, visitorId] = await Promise.all([
        authStorage.getToken(),
        visitorStorage.getVisitorId(),
      ]);

      if (!isValidUuid(visitorId)) {
        return {
          ok: false,
          error: 'Invalid visitorId: must be a valid UUID.',
          status: 400,
        };
      }

      const body = {
        eventId: event.eventId,
        visitorId,
        artifactId: event.artifactId,
        beaconId: event.beaconId ?? null,
        interactionType: event.interactionType,
        languageCode: event.languageCode ?? 'vi',
        startedAt: event.startedAt,
        interactedAt: event.interactedAt,
        endedAt: event.endedAt ?? null,
      };

      const result = await apiClient.post<{ interactionId?: number }>(ENDPOINT, body, {
        token: token ?? undefined,
      });

      return {
        ok: result.ok,
        error: result.error ?? null,
        status: result.status,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message ?? 'Lỗi gửi sự kiện tương tác',
        status: 0,
      };
    }
  },
};

function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
