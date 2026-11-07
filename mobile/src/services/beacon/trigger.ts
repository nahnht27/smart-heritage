import {
  beaconKey,
  type BeaconIdentity,
  type BeaconReading,
} from './ibeacon';

export const DEFAULT_RSSI_THRESHOLD = -75;
export const DEFAULT_ENTRY_DELAY_MS = 2000;
export const DEFAULT_EXIT_DELAY_MS = 3000;
export const DEFAULT_STALE_DELAY_MS = 3000;

export interface BeaconTriggerOptions {
  rssiThreshold: number;
  entryDelayMs: number;
  exitDelayMs: number;
  staleDelayMs: number;
}

export const DEFAULT_BEACON_TRIGGER_OPTIONS: BeaconTriggerOptions = {
  rssiThreshold: DEFAULT_RSSI_THRESHOLD,
  entryDelayMs: DEFAULT_ENTRY_DELAY_MS,
  exitDelayMs: DEFAULT_EXIT_DELAY_MS,
  staleDelayMs: DEFAULT_STALE_DELAY_MS,
};

export interface BeaconTriggerEvent {
  identity: BeaconIdentity;
  key: string;
  rssi: number;
  distance?: number;
  timestamp: number;
}

type BeaconZoneState = 'outside' | 'entering' | 'inside';

interface BeaconState {
  status: BeaconZoneState;
  firstAboveAt: number | null;
  lastAboveAt: number | null;
  firstBelowAt: number | null;
}

export class BeaconTriggerController {
  private readonly states = new Map<string, BeaconState>();

  constructor(
    private readonly options: BeaconTriggerOptions =
      DEFAULT_BEACON_TRIGGER_OPTIONS,
  ) {}

  observe(reading: BeaconReading, now: number = Date.now()): BeaconTriggerEvent | null {
    const key = beaconKey(reading);
    const state = this.states.get(key) ?? {
      status: 'outside' as const,
      firstAboveAt: null,
      lastAboveAt: null,
      firstBelowAt: null,
    };

    if (reading.rssi >= this.options.rssiThreshold) {
      state.lastAboveAt = now;
      state.firstBelowAt = null;

      if (state.status === 'outside') {
        state.status = 'entering';
        state.firstAboveAt = now;
        this.states.set(key, state);
        return null;
      }

      if (state.status === 'entering') {
        if (
          state.firstAboveAt !== null &&
          now - state.firstAboveAt >= this.options.entryDelayMs
        ) {
          state.status = 'inside';
          this.states.set(key, state);
          return {
            identity: {
              uuid: reading.uuid,
              major: reading.major,
              minor: reading.minor,
            },
            key,
            rssi: reading.rssi,
            distance: reading.distance,
            timestamp: now,
          };
        }
        this.states.set(key, state);
        return null;
      }

      this.states.set(key, state);
      return null;
    }

    if (state.status === 'entering') {
      this.states.delete(key);
      return null;
    }

    if (state.status === 'inside') {
      if (state.firstBelowAt === null) {
        state.firstBelowAt = now;
      }
      if (now - state.firstBelowAt >= this.options.exitDelayMs) {
        this.states.delete(key);
        return null;
      }
      this.states.set(key, state);
    }

    return null;
  }

  tick(now: number = Date.now()): void {
    for (const [key, state] of this.states) {
      if (state.status === 'entering') {
        if (
          state.lastAboveAt !== null &&
          now - state.lastAboveAt >= this.options.staleDelayMs
        ) {
          this.states.delete(key);
        }
        continue;
      }

      if (state.status === 'inside') {
        if (
          state.lastAboveAt !== null &&
          now - state.lastAboveAt >= this.options.exitDelayMs
        ) {
          this.states.delete(key);
          continue;
        }

        if (
          state.firstBelowAt !== null &&
          now - state.firstBelowAt >= this.options.exitDelayMs
        ) {
          this.states.delete(key);
        }
      }
    }
  }

  reset(): void {
    this.states.clear();
  }

  getState(key: string): BeaconZoneState | null {
    return this.states.get(key)?.status ?? null;
  }

  get size(): number {
    return this.states.size;
  }
}
