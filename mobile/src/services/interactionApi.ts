import { apiClient, type ApiResponse } from './api';
import { authStorage } from './authStorage';

export type InteractionType = 'VIEW' | 'AUDIO_PLAY' | 'SCAN';

export interface CreateInteractionRequest {
  eventId: string;
  artifactId: number;
  interactionType: InteractionType;
  languageCode: string;
  startedAt: string;
  endedAt?: string | null;
  interactedAt: string;
}

export interface InteractionRecord {
  interactionId: number;
  eventId: string;
  artifactId: number;
  interactionType: InteractionType;
  languageCode: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  interactedAt: string;
}

export interface BackendApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
  path: string | null;
  errors: { field: string; message: string }[] | null;
}

export function createInteractionEventId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export async function recordInteraction(
  event: CreateInteractionRequest
): Promise<ApiResponse<BackendApiResponse<InteractionRecord>>> {
  const token = await authStorage.getToken();
  if (!token) {
    return {
      data: null,
      error: 'Authentication is required to record an interaction.',
      status: 401,
      ok: false,
    };
  }

  return apiClient.post<BackendApiResponse<InteractionRecord>>(
    'interactions',
    event,
    { token }
  );
}
