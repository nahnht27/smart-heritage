import { useEffect } from 'react';
import { AppState } from 'react-native';

interface PausablePlayer {
  pause: () => void;
}

export function usePauseOnBackground(player: PausablePlayer) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [player]);
}
