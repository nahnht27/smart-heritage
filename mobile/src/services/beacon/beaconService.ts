import { Platform } from 'react-native';
import Beacon, {
  type BeaconEnvironmentState,
  type BeaconFailureEvent,
  type BeaconRegion,
  type BeaconsRangedEvent,
} from 'react-native-beacon-kit';
import {
  PERMISSIONS,
  RESULTS,
  requestMultiple,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';

export interface BeaconPermissionResult {
  granted: boolean;
  statuses: Partial<Record<Permission, PermissionStatus>>;
}

function getRuntimePermissions(): Permission[] {
  if (Platform.OS === 'android') {
    const permissions: Permission[] = [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];
    if (Number(Platform.Version) >= 31) {
      permissions.push(
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      );
    }
    return permissions;
  }

  return [PERMISSIONS.IOS.LOCATION_WHEN_IN_USE, PERMISSIONS.IOS.BLUETOOTH];
}

export async function requestBeaconPermissions(): Promise<BeaconPermissionResult> {
  const permissions = getRuntimePermissions();

  try {
    const statuses = await requestMultiple(permissions);
    return {
      granted: permissions.every(
        (permission) => statuses[permission] === RESULTS.GRANTED,
      ),
      statuses,
    };
  } catch {
    return { granted: false, statuses: {} };
  }
}

export function getBeaconEnvironmentState(): Promise<BeaconEnvironmentState> {
  return Beacon.getEnvironmentState();
}

export function configureBeaconScanner(): void {
  Beacon.configure({
    scanPeriod: 1100,
    backgroundScanPeriod: 10000,
    betweenScanPeriod: 0,
    foregroundService: false,
    kalmanFilter: { enabled: true },
  });
}

export function startBeaconRanging(region: BeaconRegion): Promise<void> {
  return Beacon.startRanging(region);
}

export function stopBeaconRanging(region: BeaconRegion): Promise<void> {
  return Beacon.stopRanging(region);
}

export function subscribeToBeaconRanging(
  callback: (event: BeaconsRangedEvent) => void,
) {
  return Beacon.onBeaconsRanged(callback);
}

export function subscribeToBeaconFailures(
  callback: (event: BeaconFailureEvent) => void,
) {
  return Beacon.onRangingFailed(callback);
}
