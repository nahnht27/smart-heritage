import {
  canRetryMediaSource,
  getMediaErrorMessage,
  isMediaLoading,
  shouldActivateMediaSession,
  shouldPauseMediaPlayback,
  shouldReportAudioPlayback,
} from '../media/playback';

describe('media playback helpers', () => {
  describe('canRetryMediaSource', () => {
    it.each([
      ['https://example.com/audio.mp3', true],
      ['http://example.com/video.mp4', true],
      [' https://example.com/audio.mp3 ', true],
      ['', false],
      [null, false],
      [undefined, false],
      ['ftp://example.com/audio.mp3', false],
      ['/relative/audio.mp3', false],
      ['not-a-url', false],
    ] as const)('validates %s', (input, expected) => {
      expect(canRetryMediaSource(input)).toBe(expected);
    });
  });

  describe('shouldActivateMediaSession', () => {
    it('chỉ kích hoạt session khi media bắt đầu phát lần đầu', () => {
      expect(shouldActivateMediaSession(false, false)).toBe(false);
      expect(shouldActivateMediaSession(true, false)).toBe(true);
      expect(shouldActivateMediaSession(true, true)).toBe(false);
    });
  });

  describe('shouldReportAudioPlayback', () => {
    it('chỉ báo AUDIO_PLAY một lần cho mỗi lần phát', () => {
      expect(shouldReportAudioPlayback(false, false)).toBe(false);
      expect(shouldReportAudioPlayback(true, false)).toBe(true);
      expect(shouldReportAudioPlayback(true, true)).toBe(false);
    });
  });

  describe('shouldPauseMediaPlayback', () => {
    it('chỉ pause khi media đang phát và cần nhường quyền phát', () => {
      expect(shouldPauseMediaPlayback(false, true)).toBe(false);
      expect(shouldPauseMediaPlayback(true, false)).toBe(false);
      expect(shouldPauseMediaPlayback(true, true)).toBe(true);
    });

    it('không pause player vừa được kích hoạt trong cùng render', () => {
      expect(shouldPauseMediaPlayback(true, true, true)).toBe(false);
    });
  });

  describe('isMediaLoading', () => {
    it('hiển thị loading cho tới khi player load xong hoặc có lỗi', () => {
      expect(isMediaLoading(false, false)).toBe(true);
      expect(isMediaLoading(false, true)).toBe(false);
      expect(isMediaLoading(true, false)).toBe(false);
    });
  });

  describe('getMediaErrorMessage', () => {
    it('trả về thông báo thân thiện, không lộ lỗi kỹ thuật thô', () => {
      expect(getMediaErrorMessage('AUDIO')).toContain('âm thanh');
      expect(getMediaErrorMessage('VIDEO')).toContain('video');
      expect(getMediaErrorMessage('AUDIO')).toContain('thử lại');
      expect(getMediaErrorMessage('VIDEO')).toContain('thử lại');
      expect(getMediaErrorMessage('VIDEO')).not.toBe(
        getMediaErrorMessage('AUDIO'),
      );
    });
  });
});
