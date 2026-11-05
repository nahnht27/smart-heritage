import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { MultimediaPlayer } from '../multimedia-player';
import type { Multimedia } from '../../services/heritageApi';

const mockPlay = jest.fn();
const mockPause = jest.fn();

let mockAudioStatus = {
  playing: false,
  isLoaded: true,
  currentTime: 0,
  duration: 12,
  error: null as Error | null,
};

let mockVideoState = {
  status: 'readyToPlay' as string,
  error: null as { message: string } | null,
};

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: mockPlay, pause: mockPause }),
  useAudioPlayerStatus: () => mockAudioStatus,
}));

jest.mock('expo-video', () => ({
  VideoView: () => null,
  useVideoPlayer: () => ({ status: mockVideoState.status }),
}));

jest.mock('expo', () => ({
  useEvent: () => mockVideoState,
}));

function media(overrides: Partial<Multimedia>): Multimedia {
  return {
    id: 1,
    artifactId: 101,
    type: 'image',
    url: 'https://example.com/media.jpg',
    title: 'Media',
    ...overrides,
  };
}

describe('MultimediaPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioStatus = {
      playing: false,
      isLoaded: true,
      currentTime: 0,
      duration: 12,
      error: null,
    };
    mockVideoState = { status: 'readyToPlay', error: null };
  });

  it('hiển thị lỗi khi URL hình ảnh không hợp lệ', () => {
    render(<MultimediaPlayer item={media({ type: 'image', url: 'not-a-url' })} />);

    expect(screen.getByText(/Hình ảnh không khả dụng/)).toBeTruthy();
  });

  it('hiển thị lỗi khi URL âm thanh không hợp lệ', () => {
    render(<MultimediaPlayer item={media({ type: 'audio', url: '' })} />);

    expect(screen.getByText(/Âm thanh không khả dụng/)).toBeTruthy();
  });

  it('hiển thị lỗi khi URL video không hợp lệ', () => {
    render(<MultimediaPlayer item={media({ type: 'video', url: 'ftp://example.com/a.mp4' })} />);

    expect(screen.getByText(/Video không khả dụng/)).toBeTruthy();
  });

  it('hiển thị lỗi phát âm thanh khi player báo error', () => {
    mockAudioStatus.error = new Error('decode failed');

    render(<MultimediaPlayer item={media({ type: 'audio', url: 'https://example.com/a.mp3' })} />);

    expect(screen.getByText('Không phát được âm thanh')).toBeTruthy();
  });

  it('hiển thị lỗi phát video khi player báo error', () => {
    mockVideoState = { status: 'error', error: { message: 'unsupported codec' } };

    render(<MultimediaPlayer item={media({ type: 'video', url: 'https://example.com/a.mp4' })} />);

    expect(screen.getByText(/Không phát được video: unsupported codec/)).toBeTruthy();
  });

  it('chỉ gọi onAudioPlay khi audio thực sự phát', async () => {
    const onAudioPlay = jest.fn();
    mockAudioStatus.playing = true;

    render(
      <MultimediaPlayer
        item={media({ type: 'audio', url: 'https://example.com/a.mp3' })}
        onAudioPlay={onAudioPlay}
      />
    );

    await waitFor(() => expect(onAudioPlay).toHaveBeenCalledTimes(1));
  });

  it('không gọi onAudioPlay khi audio chưa phát', () => {
    const onAudioPlay = jest.fn();

    render(
      <MultimediaPlayer
        item={media({ type: 'audio', url: 'https://example.com/a.mp3' })}
        onAudioPlay={onAudioPlay}
      />
    );

    expect(onAudioPlay).not.toHaveBeenCalled();
  });

  it('trả về null cho loại media không hỗ trợ', () => {
    const { toJSON } = render(
      <MultimediaPlayer item={media({ type: 'unknown' as Multimedia['type'] })} />
    );

    expect(toJSON()).toBeNull();
  });
});
