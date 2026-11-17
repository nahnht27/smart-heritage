import { act, renderHook } from '@testing-library/react-native';
import {
  BEACON_REGION_IDENTIFIER,
  DEFAULT_BEACON_UUID,
} from '../../services/beacon/ibeacon';
import { useBeaconDiscovery } from '../use-beacon-discovery';

let mockFocusCallback: (() => void | (() => void)) | null = null;
let mockFocusCleanup: (() => void) | null = null;
let mockAppStateListeners: ((state: string) => void)[] = [];
let mockRangingCallback: ((event: any) => void) | null = null;
let mockScannerStateCallback: ((state: any) => void) | null = null;
let mockNow = 1000;

const mockStartRanging = jest.fn().mockResolvedValue(undefined);
const mockStopRanging = jest.fn().mockResolvedValue(undefined);
const mockRemoveRanging = jest.fn();
const mockRemoveFailure = jest.fn();
const mockRemoveState = jest.fn();
const mockResolve = jest.fn();
const mockRecordInteraction = jest.fn().mockResolvedValue(undefined);
const mockGetEnvironment = jest.fn(async () => ({
  bluetoothEnabled: true,
  locationServicesEnabled: true,
  canScanInForeground: true,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockFocusCallback = callback;
  },
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_event: string, callback: (state: string) => void) => {
      mockAppStateListeners.push(callback);
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'event-1'),
}));

jest.mock('../../services/beacon/beaconService', () => ({
  configureBeaconScanner: jest.fn(),
  getBeaconEnvironmentState: () => mockGetEnvironment(),
  requestBeaconPermissions: jest.fn(async () => ({ granted: true, statuses: {} })),
  startBeaconRanging: (region: unknown) => mockStartRanging(region),
  stopBeaconRanging: (region: unknown) => mockStopRanging(region),
  subscribeToBeaconRanging: jest.fn((callback: (event: any) => void) => {
    mockRangingCallback = callback;
    return { remove: mockRemoveRanging };
  }),
  subscribeToBeaconFailures: jest.fn(() => ({ remove: mockRemoveFailure })),
  subscribeToScannerStateChanges: jest.fn((callback: (state: any) => void) => {
    mockScannerStateCallback = callback;
    return { remove: mockRemoveState };
  }),
}));

jest.mock('../../services/beacon/beaconApi', () => ({
  beaconApi: { resolve: (identity: unknown) => mockResolve(identity) },
}));

jest.mock('../../services/interactionApi', () => ({
  interactionApi: { recordInteraction: (input: unknown) => mockRecordInteraction(input) },
}));

async function focus() {
  await act(async () => {
    const cleanup = mockFocusCallback?.();
    mockFocusCleanup = typeof cleanup === 'function' ? cleanup : null;
    await Promise.resolve();
  });
}

async function unmountHook(unmount: () => void) {
  await act(async () => {
    unmount();
    await Promise.resolve();
  });
}

async function blur() {
  const cleanup = mockFocusCleanup;
  mockFocusCleanup = null;
  await act(async () => {
    cleanup?.();
  });
}

function rangingEvent(rssi = -70) {
  return {
    region: {
      identifier: BEACON_REGION_IDENTIFIER,
      uuid: DEFAULT_BEACON_UUID.toLowerCase(),
    },
    beacons: [
      {
        uuid: DEFAULT_BEACON_UUID,
        major: 1,
        minor: 1,
        rssi,
      },
    ],
  };
}

describe('useBeaconDiscovery lifecycle guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartRanging.mockResolvedValue(undefined);
    mockStopRanging.mockResolvedValue(undefined);
    mockResolve.mockResolvedValue({ ok: true, status: 200, data: null });
    mockGetEnvironment.mockResolvedValue({
      bluetoothEnabled: true,
      locationServicesEnabled: true,
      canScanInForeground: true,
    });
    mockFocusCallback = null;
    mockFocusCleanup = null;
    mockAppStateListeners = [];
    mockRangingCallback = null;
    mockScannerStateCallback = null;
    mockNow = 1000;
  });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts one scanner session and stops on blur without duplicate starts', async () => {
    const { result, unmount } = await renderHook(() => useBeaconDiscovery());
    await focus();
    await act(async () => { await result.current.enable(); });

    expect(mockStartRanging).toHaveBeenCalledTimes(1);

    await focus();
    await focus();
    expect(mockStartRanging).toHaveBeenCalledTimes(1);

    await blur();
    expect(mockStopRanging).toHaveBeenCalledTimes(1);
    expect(mockRemoveRanging).toHaveBeenCalledTimes(1);
    expect(mockRemoveFailure).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('paused');

    await focus();
    expect(mockStartRanging).toHaveBeenCalledTimes(2);

    await unmountHook(unmount);
    expect(mockStopRanging).toHaveBeenCalledTimes(2);
  });

  it('pauses once on background and resumes once on foreground', async () => {
    const { result, unmount } = await renderHook(() => useBeaconDiscovery());
    await focus();
    await act(async () => { await result.current.enable(); });
    expect(mockStartRanging).toHaveBeenCalledTimes(1);

    await act(async () => { mockAppStateListeners[0]?.('background'); });
    expect(mockStopRanging).toHaveBeenCalledTimes(1);
    expect(mockRemoveRanging).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('paused');

    await act(async () => { mockAppStateListeners[0]?.('background'); });
    expect(mockStopRanging).toHaveBeenCalledTimes(1);

    await act(async () => { mockAppStateListeners[0]?.('active'); });
    expect(mockStartRanging).toHaveBeenCalledTimes(2);

    await act(async () => { mockAppStateListeners[0]?.('active'); });
    expect(mockStartRanging).toHaveBeenCalledTimes(2);

    await unmountHook(unmount);
  });

  it('removes subscriptions exactly once when unmounted while scanning', async () => {
    const { result, unmount } = await renderHook(() => useBeaconDiscovery());
    await focus();
    await act(async () => { await result.current.enable(); });
    expect(mockStartRanging).toHaveBeenCalledTimes(1);

    await unmountHook(unmount);

    expect(mockStopRanging).toHaveBeenCalledTimes(1);
    expect(mockRemoveRanging).toHaveBeenCalledTimes(1);
    expect(mockRemoveFailure).toHaveBeenCalledTimes(1);
    expect(mockRemoveState).toHaveBeenCalledTimes(1);
    expect(mockRecordInteraction).not.toHaveBeenCalled();
  });

  it('does not start scanning or record when Bluetooth is unavailable', async () => {
    mockGetEnvironment.mockResolvedValueOnce({
      bluetoothEnabled: false,
      locationServicesEnabled: true,
      canScanInForeground: true,
    });

    const { result, unmount } = await renderHook(() => useBeaconDiscovery());
    await focus();
    await act(async () => { await result.current.enable(); });

    expect(mockStartRanging).not.toHaveBeenCalled();
    expect(result.current.enabled).toBe(false);
    expect(result.current.status).toBe('bluetooth_off');
    expect(mockRecordInteraction).not.toHaveBeenCalled();

    await unmountHook(unmount);
  });

  it('stops scanning once when a scanner state change reports Bluetooth off', async () => {
    const { result, unmount } = await renderHook(() => useBeaconDiscovery());
    await focus();
    await act(async () => { await result.current.enable(); });
    expect(mockStartRanging).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockScannerStateCallback?.({
        bluetoothEnabled: false,
        locationServicesEnabled: true,
        canScanInForeground: true,
      });
    });
    expect(mockStopRanging).toHaveBeenCalledTimes(1);
    expect(mockRemoveRanging).toHaveBeenCalledTimes(1);
    expect(result.current.enabled).toBe(false);
    expect(result.current.status).toBe('bluetooth_off');

    await act(async () => {
      mockScannerStateCallback?.({
        bluetoothEnabled: false,
        locationServicesEnabled: true,
        canScanInForeground: true,
      });
    });
    expect(mockStopRanging).toHaveBeenCalledTimes(1);

    await unmountHook(unmount);
  });

  it('ignores an in-flight resolve response from a previous scan session', async () => {
    let resolveRequest: ((value: unknown) => void) | null = null;
    mockResolve.mockImplementation(
      () => new Promise((resolve) => { resolveRequest = resolve; }),
    );

    const { result, unmount } = await renderHook(() => useBeaconDiscovery());
    await focus();
    await act(async () => { await result.current.enable(); });

    await act(async () => {
      mockRangingCallback?.(rangingEvent());
    });
    mockNow = 4000;
    await act(async () => {
      mockRangingCallback?.(rangingEvent());
    });

    expect(mockResolve).toHaveBeenCalledTimes(1);
    expect(mockResolve).toHaveBeenCalledWith({
      uuid: DEFAULT_BEACON_UUID.toLowerCase(),
      major: 1,
      minor: 1,
    });

    await blur();
    expect(result.current.status).toBe('paused');

    await act(async () => {
      resolveRequest?.({
        ok: true,
        status: 200,
        data: { artifactId: 'artifact-1', beaconId: 'beacon-1' },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.banner).toBeNull();
    expect(result.current.statusMessage).toContain('Tạm dừng');
    expect(mockRecordInteraction).not.toHaveBeenCalled();

    await unmountHook(unmount);
  });
});
