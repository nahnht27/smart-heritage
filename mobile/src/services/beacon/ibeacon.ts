export const DEFAULT_BEACON_UUID =
  'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0';

export const BEACON_REGION_IDENTIFIER = 'smart-heritage';

export interface BeaconIdentity {
  uuid: string;
  major: number;
  minor: number;
}

export interface BeaconReading extends BeaconIdentity {
  rssi: number;
  distance?: number;
  timestamp?: number;
}

export interface NativeBeaconReading {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  distance?: number;
  timestamp?: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getConfiguredBeaconUuid(): string {
  const configured = process.env.EXPO_PUBLIC_BEACON_UUID?.trim();
  return configured && isValidBeaconUuid(configured)
    ? configured
    : DEFAULT_BEACON_UUID;
}

export function normalizeBeaconUuid(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidBeaconUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

export function isValidMajorMinor(value: number | null | undefined): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 65535
  );
}

export function normalizeBeaconIdentity(
  identity: Partial<BeaconIdentity> | null | undefined,
): BeaconIdentity | null {
  if (
    !identity ||
    !isValidBeaconUuid(identity.uuid) ||
    !isValidMajorMinor(identity.major) ||
    !isValidMajorMinor(identity.minor)
  ) {
    return null;
  }

  return {
    uuid: normalizeBeaconUuid(identity.uuid!),
    major: identity.major!,
    minor: identity.minor!,
  };
}

export function beaconKey(identity: BeaconIdentity): string {
  return `${normalizeBeaconUuid(identity.uuid)}:${identity.major}:${identity.minor}`;
}

export function parseNativeBeacon(
  reading: NativeBeaconReading,
): BeaconReading | null {
  const identity = normalizeBeaconIdentity(reading);
  if (!identity || typeof reading.rssi !== 'number') {
    return null;
  }

  return {
    ...identity,
    rssi: reading.rssi,
    distance:
      typeof reading.distance === 'number' ? reading.distance : undefined,
    timestamp:
      typeof reading.timestamp === 'number' ? reading.timestamp : undefined,
  };
}

export function createBeaconRegion(uuid: string = getConfiguredBeaconUuid()) {
  return {
    identifier: BEACON_REGION_IDENTIFIER,
    uuid: normalizeBeaconUuid(uuid),
  };
}
