/**
 * Smart Heritage - Visitor Interaction API Service
 *
 * LTJ-34 (S3-M3-02): Gửi sự kiện tương tác khách tham quan tới backend.
 *
 * Tuân theo contract backend M5 (docs/integration/api-contract.md).
 *
 * - POST /api/interactions với Authorization: Bearer <token>
 * - Payload: { eventId, artifactId, interactionType, languageCode, startedAt, interactedAt, endedAt? }
 * - interactionType: VIEW | AUDIO_PLAY | SCAN
 * - eventId là UUID duy nhất, giữ nguyên khi retry cùng một event logic
 * - Nếu chưa đăng nhập, không gửi request (trả về ok=false, error rõ ràng)
 * - Lỗi mạng/API không làm crash hay chặn luồng xem nội dung
 * - Không gửi visitorId, userId, beaconId, durationSeconds (không thuộc contract)
 */

import { apiClient } from './api';
import { authStorage } from './authStorage';

export type InteractionType = 'VIEW' | 'AUDIO_PLAY' | 'SCAN';

export interface CreateInteractionEvent {
  eventId: string;
  artifactId: number;
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
  cachedVisitorId = null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const interactionApi = {
  async recordInteraction(event: CreateInteractionEvent): Promise<InteractionResult> {
    // Nếu chưa đăng nhập, không gửi request (backend yêu cầu xác thực)
    const token = await authStorage.getToken();
    if (!token) {
      return {
        ok: false,
        error: 'Authentication is required to record an interaction.',
        status: 401,
      };
    }

    // eventId phải là UUID hợp lệ
    if (!event.eventId || !isValidUuid(event.eventId)) {
      return {
        ok: false,
        error: 'Invalid eventId: must be a valid UUID.',
        status: 400,
      };
    }

    try {
      const body = {
        eventId: event.eventId,
        artifactId: event.artifactId,
        interactionType: event.interactionType,
        languageCode: event.languageCode ?? 'vi',
        startedAt: event.startedAt,
        interactedAt: event.interactedAt,
        endedAt: event.endedAt ?? null,
      };

      const result = await apiClient.post<{ interactionId?: number }>(ENDPOINT, body, {
        token,
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
