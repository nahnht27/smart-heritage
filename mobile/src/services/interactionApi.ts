/**
 * Smart Heritage - Visitor Interaction API Service
 *
 * LTJ-34 (S3-M3-02): Gửi sự kiện tương tác khách tham quan tới backend.
 *
 * Tuân theo contract: docs/requirements/visitor-interaction-data-contract.md.
 *
 * QUAN TRỌNG:
 * - Backend CHƯA cung cấp endpoint POST /api/interactions tại thời điểm viết code.
 * - Dịch vụ này đã sẵn sàng gọi khi M1/M5 chốt contract và backend triển khai endpoint.
 * - Hàm gửi được bảo vệ bởi try/catch: lỗi API/Network KHÔNG làm crash hay chặn luồng xem nội dung.
 * - Không ghi log token hay dữ liệu cá nhân.
 * - eventId được sinh lato client (UUID) để backend detect duplicate submissions.
 * - visitorId là pseudonymous ID ổn định, lưu trong AsyncStorage, không gắn liền với thông tin cá nhân.
 */

import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VISITOR_ID_KEY = '@smart_heritage:visitor_id';

let cachedVisitorId: string | null = null;

async function getVisitorId(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;
  try {
    const existing = await AsyncStorage.getItem(VISITOR_ID_KEY);
    if (existing) {
      cachedVisitorId = existing;
      return existing;
    }
    const newId = `visitor-${crypto.randomUUID()}`;
    await AsyncStorage.setItem(VISITOR_ID_KEY, newId);
    cachedVisitorId = newId;
    return newId;
  } catch {
    const fallback = `visitor-${crypto.randomUUID()}`;
    cachedVisitorId = fallback;
    return fallback;
  }
}

// Chỉ dùng cho test isolation
export function __resetVisitorIdForTest(): void {
  cachedVisitorId = null;
}

export type InteractionType = 'BEACON_TRIGGER' | 'MANUAL_VIEW' | 'FAVORITE_ADD' | 'FAVORITE_REMOVE';

export interface InteractionEvent {
  artifactId: number;
  interactionType: InteractionType;
  languageCode?: string;
  startedAt?: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
  interactedAt?: string;
  userId?: number | null;
  beaconId?: number | null;
}

export interface InteractionResult {
  ok: boolean;
  error: string | null;
  status: number;
}

const ENDPOINT = 'interactions';

function nowIso(): string {
  return new Date().toISOString();
}

export const interactionApi = {
  async sendInteraction(payload: InteractionEvent): Promise<InteractionResult> {
    try {
      const visitorId = await getVisitorId();

      const body = {
        eventId: crypto.randomUUID(),
        visitorId,
        userId: payload.userId ?? null,
        artifactId: payload.artifactId,
        beaconId: payload.beaconId ?? null,
        interactionType: payload.interactionType,
        languageCode: payload.languageCode ?? 'vi',
        startedAt: payload.startedAt ?? nowIso(),
        endedAt: payload.endedAt ?? null,
        durationSeconds: payload.durationSeconds ?? null,
        interactedAt: payload.interactedAt ?? nowIso(),
      };

      const result = await apiClient.post<{ interactionId?: number }>(ENDPOINT, body);

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
