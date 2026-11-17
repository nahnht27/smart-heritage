import { act, renderHook } from '@testing-library/react-native';
import { usePauseOnBackground } from '../use-pause-on-background';

let mockListeners: ((state: string) => void)[] = [];
const mockRemove = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
      mockListeners.push(listener);
      return { remove: mockRemove };
    }),
  },
}));

describe('usePauseOnBackground', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners = [];
  });

  it('pauses when the app leaves the active state and cleans up its listener', async () => {
    const player = { pause: jest.fn() };
    const { unmount } = await renderHook(() => usePauseOnBackground(player));

    await act(async () => { mockListeners[0]?.('background'); });
    expect(player.pause).toHaveBeenCalledTimes(1);

    await act(async () => { mockListeners[0]?.('inactive'); });
    expect(player.pause).toHaveBeenCalledTimes(2);

    await act(async () => { mockListeners[0]?.('active'); });
    expect(player.pause).toHaveBeenCalledTimes(2);

    await act(async () => {
      unmount();
      await Promise.resolve();
    });
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
