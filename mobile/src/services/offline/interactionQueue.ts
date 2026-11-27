/**
 * Interaction events that could not be delivered yet.
 *
 * Every event keeps its original `eventId`, which the backend uses to ignore
 * duplicates, so re-sending after an uncertain failure is safe.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type QueuedEvent = Record<string, unknown> & { eventId: string };

export interface DeliveryResult {
  ok: boolean;
  status: number;
}

const QUEUE_KEY = '@smart_heritage:pending_interactions';
const MAX_QUEUED = 500;

// Serializes read-modify-write cycles on the stored list.
let tail: Promise<unknown> = Promise.resolve();
let flushing: Promise<number> | null = null;

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

async function read(): Promise<QueuedEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? (parsed as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

async function write(events: QueuedEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events));
  } catch {
    // Persistence is best-effort; analytics must never break the visitor flow.
  }
}

/** Network loss, timeouts, throttling and server errors are worth retrying. */
export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export function enqueueInteraction(event: QueuedEvent): Promise<void> {
  return exclusive(async () => {
    const events = await read();
    if (events.some((queued) => queued.eventId === event.eventId)) {
      return;
    }
    await write([...events, event].slice(-MAX_QUEUED));
  });
}

export function countQueuedInteractions(): Promise<number> {
  return exclusive(async () => (await read()).length);
}

/**
 * Sends queued events oldest first and stops at the first retryable failure.
 * Events the server rejects permanently are dropped. Returns how many were sent.
 */
export function flushInteractionQueue(
  send: (event: QueuedEvent) => Promise<DeliveryResult>,
): Promise<number> {
  if (flushing) {
    return flushing;
  }

  flushing = (async () => {
    let sent = 0;
    for (const event of await exclusive(read)) {
      const result = await send(event);
      if (!result.ok && isRetryableStatus(result.status)) {
        break;
      }
      if (result.ok) {
        sent += 1;
      }
      await exclusive(async () => {
        const remaining = await read();
        await write(remaining.filter((item) => item.eventId !== event.eventId));
      });
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });

  return flushing;
}
