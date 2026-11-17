import { isUsableMediaUrl } from './url';

export type PlayableMediaType = 'AUDIO' | 'VIDEO';

export function canRetryMediaSource(
  url: string | null | undefined,
): url is string {
  return isUsableMediaUrl(url);
}

export function shouldActivateMediaSession(
  isPlaying: boolean,
  alreadyActivated: boolean,
): boolean {
  return isPlaying && !alreadyActivated;
}

export function shouldReportAudioPlayback(
  isPlaying: boolean,
  alreadyReported: boolean,
): boolean {
  return isPlaying && !alreadyReported;
}

export function shouldPauseMediaPlayback(
  shouldPause: boolean,
  isPlaying: boolean,
  pendingActivation = false,
): boolean {
  return shouldPause && isPlaying && !pendingActivation;
}

export function isMediaLoading(
  hasError: boolean,
  isLoaded: boolean,
): boolean {
  return !hasError && !isLoaded;
}

export class MediaRetryGate {
  private inFlight = false;

  tryStart(): boolean {
    if (this.inFlight) {
      return false;
    }
    this.inFlight = true;
    return true;
  }

  finish(): void {
    this.inFlight = false;
  }
}

export function getMediaErrorMessage(type: PlayableMediaType): string {
  return type === 'AUDIO'
    ? 'Không phát được âm thanh. Vui lòng kiểm tra kết nối và thử lại.'
    : 'Không phát được video. Vui lòng kiểm tra kết nối và thử lại.';
}
