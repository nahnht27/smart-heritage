import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { interactionApi } from '../services/interactionApi';
import {
  beaconApi,
  type ResolvedBeacon,
} from '../services/beacon/beaconApi';
import {
  configureBeaconScanner,
  getBeaconEnvironmentState,
  requestBeaconPermissions,
  startBeaconRanging,
  stopBeaconRanging,
  subscribeToBeaconFailures,
  subscribeToBeaconRanging,
} from '../services/beacon/beaconService';
import {
  createBeaconRegion,
  parseNativeBeacon,
} from '../services/beacon/ibeacon';
import {
  BeaconTriggerController,
  type BeaconTriggerEvent,
} from '../services/beacon/trigger';

export type BeaconDiscoveryStatus =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'bluetooth_off'
  | 'location_off'
  | 'paused'
  | 'scanning'
  | 'error';

export interface UseBeaconDiscoveryResult {
  enabled: boolean;
  status: BeaconDiscoveryStatus;
  statusMessage: string;
  banner: ResolvedBeacon | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  dismissBanner: () => void;
}

const IDLE_MESSAGE =
  'Bật quét beacon để tự động khám phá hiện vật khi bạn đến gần.';

export function useBeaconDiscovery(): UseBeaconDiscoveryResult {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<BeaconDiscoveryStatus>('idle');
  const [statusMessage, setStatusMessage] = useState(IDLE_MESSAGE);
  const [banner, setBanner] = useState<ResolvedBeacon | null>(null);

  const enabledRef = useRef(false);
  const scanningRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const mountedRef = useRef(true);
  const regionRef = useRef(createBeaconRegion());
  const controllerRef = useRef(new BeaconTriggerController());
  const rangingSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const failureSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRequestRef = useRef(0);

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  }, []);

  const dismissBanner = useCallback(() => {
    clearBannerTimer();
    setBanner(null);
  }, [clearBannerTimer]);

  const resolveAndRecord = useCallback(
    async (trigger: BeaconTriggerEvent) => {
      const requestId = ++resolveRequestRef.current;
      const result = await beaconApi.resolve(trigger.identity);

      if (
        !mountedRef.current ||
        !enabledRef.current ||
        requestId !== resolveRequestRef.current
      ) {
        return;
      }

      if (!result.ok || !result.data) {
        setStatusMessage(
          'Không tìm thấy hiện vật cho beacon này. Hãy thử lại khi đến gần hơn.',
        );
        return;
      }

      const resolved = result.data;
      if (!resolved.artifactId) {
        setStatusMessage('Beacon này chưa được gán với hiện vật.');
        return;
      }

      setBanner(resolved);
      setStatusMessage('Đã phát hiện hiện vật gần bạn.');
      clearBannerTimer();
      bannerTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setBanner(null);
        }
      }, 8000);

      const now = new Date().toISOString();
      void interactionApi.recordInteraction({
        eventId: Crypto.randomUUID(),
        artifactId: resolved.artifactId,
        beaconId: resolved.beaconId,
        interactionType: 'BEACON_TRIGGER',
        languageCode: 'vi',
        startedAt: now,
        interactedAt: now,
      });
    },
    [clearBannerTimer],
  );

  const stopScanning = useCallback(async () => {
    scanningRef.current = false;

    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (rangingSubscriptionRef.current) {
      rangingSubscriptionRef.current.remove();
      rangingSubscriptionRef.current = null;
    }
    if (failureSubscriptionRef.current) {
      failureSubscriptionRef.current.remove();
      failureSubscriptionRef.current = null;
    }

    controllerRef.current.reset();

    try {
      await stopBeaconRanging(regionRef.current);
    } catch {
      // The native scanner may already be stopped or unavailable.
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (scanningRef.current || !enabledRef.current) {
      return;
    }

    setStatus('requesting_permission');
    setStatusMessage('Đang xin quyền Bluetooth và vị trí...');

    const permission = await requestBeaconPermissions();
    if (!mountedRef.current || !enabledRef.current) {
      return;
    }
    if (!permission.granted) {
      enabledRef.current = false;
      setEnabled(false);
      setStatus('permission_denied');
      setStatusMessage(
        'Cần quyền Bluetooth và vị trí để quét beacon. Hãy bật lại và cấp quyền khi được hỏi.',
      );
      return;
    }

    const environment = await getBeaconEnvironmentState();
    if (!mountedRef.current || !enabledRef.current) {
      return;
    }
    if (!environment.bluetoothEnabled) {
      enabledRef.current = false;
      setEnabled(false);
      setStatus('bluetooth_off');
      setStatusMessage('Bluetooth đang tắt. Hãy bật Bluetooth rồi thử lại.');
      return;
    }
    if (!environment.locationServicesEnabled) {
      enabledRef.current = false;
      setEnabled(false);
      setStatus('location_off');
      setStatusMessage('Dịch vụ vị trí đang tắt. Hãy bật định vị rồi thử lại.');
      return;
    }
    if (!environment.canScanInForeground) {
      enabledRef.current = false;
      setEnabled(false);
      setStatus('error');
      setStatusMessage('Thiết bị chưa sẵn sàng để quét beacon.');
      return;
    }

    if (appStateRef.current !== 'active') {
      setStatus('paused');
      setStatusMessage('Tạm dừng quét beacon khi ứng dụng ở nền.');
      return;
    }

    configureBeaconScanner();
    const region = regionRef.current;

    rangingSubscriptionRef.current = subscribeToBeaconRanging((event) => {
      if (
        event.region.identifier !== region.identifier ||
        event.region.uuid.toLowerCase() !== region.uuid.toLowerCase()
      ) {
        return;
      }

      const now = Date.now();
      for (const nativeReading of event.beacons) {
        const reading = parseNativeBeacon(nativeReading);
        if (!reading) {
          continue;
        }
        const trigger = controllerRef.current.observe(reading, now);
        if (trigger) {
          void resolveAndRecord(trigger);
        }
      }
    });

    failureSubscriptionRef.current = subscribeToBeaconFailures((event) => {
      if (
        event.region &&
        event.region.identifier !== region.identifier
      ) {
        return;
      }
      setStatus('error');
      setStatusMessage(event.message || 'Không thể quét beacon.');
    });

    try {
      await startBeaconRanging(region);
    } catch (error) {
      rangingSubscriptionRef.current?.remove();
      rangingSubscriptionRef.current = null;
      failureSubscriptionRef.current?.remove();
      failureSubscriptionRef.current = null;
      enabledRef.current = false;
      setEnabled(false);
      setStatus('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Không thể bắt đầu quét beacon.',
      );
      return;
    }

    if (!mountedRef.current || !enabledRef.current) {
      await stopScanning();
      return;
    }

    scanningRef.current = true;
    tickTimerRef.current = setInterval(() => {
      controllerRef.current.tick(Date.now());
    }, 1000);
    setStatus('scanning');
    setStatusMessage('Đang quét beacon gần bạn...');
  }, [resolveAndRecord, stopScanning]);

  const enable = useCallback(async () => {
    if (enabledRef.current) {
      return;
    }
    enabledRef.current = true;
    setEnabled(true);
    dismissBanner();
    await startScanning();
  }, [dismissBanner, startScanning]);

  const disable = useCallback(async () => {
    enabledRef.current = false;
    setEnabled(false);
    await stopScanning();
    dismissBanner();
    setStatus('idle');
    setStatusMessage(IDLE_MESSAGE);
  }, [dismissBanner, stopScanning]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      resolveRequestRef.current += 1;
      clearBannerTimer();
      void stopScanning();
    };
  }, [clearBannerTimer, stopScanning]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        if (enabledRef.current) {
          void startScanning();
        }
        return;
      }

      if (enabledRef.current) {
        void stopScanning();
        setStatus('paused');
        setStatusMessage('Tạm dừng quét beacon khi ứng dụng ở nền.');
      }
    });

    return () => subscription.remove();
  }, [startScanning, stopScanning]);

  return {
    enabled,
    status,
    statusMessage,
    banner,
    enable,
    disable,
    dismissBanner,
  };
}
