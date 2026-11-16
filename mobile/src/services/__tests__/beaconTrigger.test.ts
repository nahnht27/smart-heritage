import {
  BeaconTriggerController,
  DEFAULT_BEACON_TRIGGER_OPTIONS,
  DEFAULT_TRIGGER_COOLDOWN_MS,
} from '../beacon/trigger';
import type { BeaconReading } from '../beacon/ibeacon';

const UUID = 'e2c56db5-dffb-48d2-b060-d0f5a71096e0';
const OTHER_UUID = '11111111-1111-4111-8111-111111111111';

function reading(
  rssi: number,
  overrides: Partial<BeaconReading> = {},
): BeaconReading {
  return {
    uuid: UUID,
    major: 1,
    minor: 1,
    rssi,
    ...overrides,
  };
}

describe('BeaconTriggerController', () => {
  it('requires a sustained above-threshold reading before triggering', () => {
    const controller = new BeaconTriggerController();

    expect(controller.observe(reading(-70), 0)).toBeNull();
    expect(controller.observe(reading(-70), 1000)).toBeNull();
    expect(controller.observe(reading(-70), 1999)).toBeNull();
    expect(controller.observe(reading(-70), 2000)).toMatchObject({
      key: `${UUID}:1:1`,
      rssi: -70,
      timestamp: 2000,
    });
  });

  it('does not trigger again while the visitor remains inside', () => {
    const controller = new BeaconTriggerController();

    controller.observe(reading(-70), 0);
    expect(controller.observe(reading(-70), 2000)).not.toBeNull();
    expect(controller.observe(reading(-70), 5000)).toBeNull();
    expect(controller.observe(reading(-65), 8000)).toBeNull();
  });

  it('resets the entry timer when the signal drops before confirmation', () => {
    const controller = new BeaconTriggerController();

    controller.observe(reading(-70), 0);
    controller.observe(reading(-70), 1000);
    expect(controller.observe(reading(-90), 1500)).toBeNull();
    expect(controller.observe(reading(-70), 2000)).toBeNull();
    expect(controller.observe(reading(-70), 3000)).toBeNull();
    expect(controller.observe(reading(-70), 4000)).not.toBeNull();
  });

  it('requires the exit delay before a beacon can trigger again', () => {
    const controller = new BeaconTriggerController({
      ...DEFAULT_BEACON_TRIGGER_OPTIONS,
      cooldownMs: 0,
    });

    controller.observe(reading(-70), 0);
    expect(controller.observe(reading(-70), 2000)).not.toBeNull();
    expect(controller.observe(reading(-90), 3000)).toBeNull();
    expect(controller.observe(reading(-90), 5999)).toBeNull();
    expect(controller.observe(reading(-90), 6000)).toBeNull();

    expect(controller.observe(reading(-70), 7000)).toBeNull();
    expect(controller.observe(reading(-70), 9000)).not.toBeNull();
  });

  it('suppresses a second trigger for the same beacon inside the cooldown', () => {
    const controller = new BeaconTriggerController();

    controller.observe(reading(-70), 0);
    expect(controller.observe(reading(-70), 2000)).not.toBeNull();

    controller.reset();
    expect(controller.size).toBe(0);

    controller.observe(reading(-70), 3000);
    expect(controller.observe(reading(-70), 5000)).toBeNull();
    expect(controller.getState(`${UUID}:1:1`)).toBe('inside');
  });

  it('allows a new trigger once the cooldown expires', () => {
    const controller = new BeaconTriggerController();

    controller.observe(reading(-70), 0);
    expect(controller.observe(reading(-70), 2000)).not.toBeNull();
    controller.reset();

    const retryAt = 2000 + DEFAULT_TRIGGER_COOLDOWN_MS;
    controller.observe(reading(-70), retryAt);
    expect(
      controller.observe(reading(-70), retryAt + 2000),
    ).not.toBeNull();
  });

  it('keeps cooldowns per beacon', () => {
    const controller = new BeaconTriggerController();

    controller.observe(reading(-70), 0);
    expect(controller.observe(reading(-70), 2000)).not.toBeNull();
    controller.reset();

    controller.observe(reading(-70, { uuid: OTHER_UUID }), 3000);
    expect(
      controller.observe(reading(-70, { uuid: OTHER_UUID }), 5000),
    ).not.toBeNull();
  });

  it('treats the configured threshold as inside', () => {
    const controller = new BeaconTriggerController({
      ...DEFAULT_BEACON_TRIGGER_OPTIONS,
      rssiThreshold: -75,
    });

    controller.observe(reading(-75), 0);
    expect(controller.observe(reading(-75), 2000)).not.toBeNull();
  });

  it('tracks multiple beacons independently', () => {
    const controller = new BeaconTriggerController();

    controller.observe(reading(-70), 0);
    controller.observe(reading(-70, { uuid: OTHER_UUID }), 500);
    expect(controller.observe(reading(-70), 2000)).not.toBeNull();
    expect(controller.observe(reading(-70, { uuid: OTHER_UUID }), 2000)).toBeNull();
    expect(controller.observe(reading(-70, { uuid: OTHER_UUID }), 2500)).not.toBeNull();
  });

  it('clears entering and inside states when readings become stale', () => {
    const entering = new BeaconTriggerController();
    entering.observe(reading(-70), 0);
    entering.tick(3000);
    expect(entering.getState(`${UUID}:1:1`)).toBeNull();

    const inside = new BeaconTriggerController();
    inside.observe(reading(-70), 0);
    inside.observe(reading(-70), 2000);
    inside.tick(5000);
    expect(inside.getState(`${UUID}:1:1`)).toBeNull();
  });

  it('reset clears all tracked beacons', () => {
    const controller = new BeaconTriggerController();
    controller.observe(reading(-70), 0);
    expect(controller.size).toBe(1);
    controller.reset();
    expect(controller.size).toBe(0);
  });
});
