import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEvent } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { isUsableMediaUrl, type Multimedia } from '../services/heritageApi';
import {
  canRetryMediaSource,
  getMediaErrorMessage,
  isMediaLoading,
  shouldActivateMediaSession,
  shouldPauseMediaPlayback,
  shouldReportAudioPlayback,
} from '../services/media/playback';
import { RemoteImage } from './remote-image';

interface MultimediaPlayerProps {
  item: Multimedia;
  onAudioPlay?: (item: Multimedia) => void;
  onActivate?: (item: Multimedia) => void;
  isActive?: boolean;
  shouldPause?: boolean;
}

interface PausablePlayer {
  pause: () => void;
}

function usePauseOnBackground(player: PausablePlayer) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [player]);
}

function InvalidMedia({ label }: { label: string }) {
  return (
    <View style={styles.invalidBox}>
      <Text style={styles.invalidText}>
        {label} không khả dụng hoặc URL không hợp lệ.
      </Text>
    </View>
  );
}

function UnsupportedMedia() {
  return (
    <View style={styles.invalidBox}>
      <Text style={styles.invalidText}>
        Định dạng media này chưa được hỗ trợ.
      </Text>
    </View>
  );
}

function MediaImage({ item }: { item: Multimedia }) {
  if (!isUsableMediaUrl(item.url)) {
    return <InvalidMedia label="Hình ảnh" />;
  }

  return (
    <RemoteImage
      uri={item.url}
      style={styles.image}
      accessibilityLabel={item.title ?? 'Hình ảnh hiện vật'}
    />
  );
}

function AudioPlayer({
  item,
  onAudioPlay,
  onActivate,
  isActive = true,
  shouldPause = false,
}: MultimediaPlayerProps) {
  const source = canRetryMediaSource(item.url) ? item.url : null;
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const reportedPlayback = useRef(false);
  const activated = useRef(false);
  const pendingActivation = useRef(false);

  usePauseOnBackground(player);

  useEffect(() => {
    if (!status.playing) {
      activated.current = false;
      pendingActivation.current = false;
      return;
    }

    if (shouldActivateMediaSession(true, activated.current)) {
      activated.current = true;
      pendingActivation.current = Boolean(onActivate);
      onActivate?.(item);
    }

    if (shouldReportAudioPlayback(true, reportedPlayback.current)) {
      reportedPlayback.current = true;
      onAudioPlay?.(item);
    }
  }, [status.playing, item, onActivate, onAudioPlay]);

  useEffect(() => {
    if (isActive) {
      pendingActivation.current = false;
    }

    const shouldYieldToOtherMedia = shouldPauseMediaPlayback(
      !isActive,
      status.playing,
      pendingActivation.current,
    );

    if ((shouldPause && status.playing) || shouldYieldToOtherMedia) {
      player.pause();
    }
  }, [isActive, player, shouldPause, status.playing]);

  if (!source) {
    return <InvalidMedia label="Âm thanh" />;
  }

  const hasError = Boolean(status.error);
  const isLoading = isMediaLoading(hasError, status.isLoaded);

  const handleTogglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleRetry = () => {
    try {
      player.replace(source);
    } catch {
      // Status updates keep the error state visible if reloading fails.
    }
  };

  return (
    <View style={styles.audioCard}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={handleTogglePlayback}
        disabled={hasError}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          status.playing ? 'Tạm dừng âm thanh' : 'Phát âm thanh'
        }
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.playIcon}>{status.playing ? '❚❚' : '▶'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.audioInfo}>
        <Text style={styles.mediaTitle} numberOfLines={1}>
          {item.title || 'Âm thanh hiện vật'}
        </Text>
        <Text style={styles.mediaMeta}>
          {hasError
            ? getMediaErrorMessage('AUDIO')
            : isLoading
              ? 'Đang tải âm thanh...'
              : `${formatTime(status.currentTime)} / ${formatTime(status.duration)}`}
        </Text>
        {hasError && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Thử lại âm thanh"
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function VideoPlayer({
  item,
  onActivate,
  isActive = true,
  shouldPause = false,
}: MultimediaPlayerProps) {
  const source = canRetryMediaSource(item.url) ? item.url : null;
  const player = useVideoPlayer(source);
  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const activated = useRef(false);
  const pendingActivation = useRef(false);
  const mounted = useRef(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  usePauseOnBackground(player);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      activated.current = false;
      pendingActivation.current = false;
      return;
    }

    if (shouldActivateMediaSession(true, activated.current)) {
      activated.current = true;
      pendingActivation.current = Boolean(onActivate);
      onActivate?.(item);
    }
  }, [isPlaying, item, onActivate]);

  useEffect(() => {
    if (isActive) {
      pendingActivation.current = false;
    }

    const shouldYieldToOtherMedia = shouldPauseMediaPlayback(
      !isActive,
      isPlaying,
      pendingActivation.current,
    );

    if ((shouldPause && isPlaying) || shouldYieldToOtherMedia) {
      player.pause();
    }
  }, [isActive, isPlaying, player, shouldPause]);

  if (!source) {
    return <InvalidMedia label="Video" />;
  }

  const hasError =
    !isRetrying &&
    (status === 'error' ||
      (retryFailed && status !== 'readyToPlay'));
  const isLoading =
    !hasError && (isRetrying || status === 'idle' || status === 'loading');

  const handleRetry = async () => {
    setRetryFailed(false);
    setIsRetrying(true);

    try {
      await player.replaceAsync(source);
    } catch {
      if (mounted.current) {
        setRetryFailed(true);
      }
    } finally {
      if (mounted.current) {
        setIsRetrying(false);
      }
    }
  };

  return (
    <View style={styles.videoCard}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        accessibilityLabel={item.title ?? 'Video hiện vật'}
      />
      {isLoading && (
        <View style={styles.videoOverlay} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.videoOverlayText}>Đang tải video...</Text>
        </View>
      )}
      {hasError && (
        <View style={styles.videoErrorBox}>
          <Text style={styles.videoError}>
            {getMediaErrorMessage('VIDEO')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Thử lại video"
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.title ? <Text style={styles.videoTitle}>{item.title}</Text> : null}
    </View>
  );
}

export function MultimediaPlayer({
  item,
  onAudioPlay,
  onActivate,
  isActive = true,
  shouldPause = false,
}: MultimediaPlayerProps) {
  switch (item.type) {
    case 'IMAGE':
      return <MediaImage item={item} />;
    case 'AUDIO':
      return (
        <AudioPlayer
          item={item}
          onAudioPlay={onAudioPlay}
          onActivate={onActivate}
          isActive={isActive}
          shouldPause={shouldPause}
        />
      );
    case 'VIDEO':
      return (
        <VideoPlayer
          item={item}
          onActivate={onActivate}
          isActive={isActive}
          shouldPause={shouldPause}
        />
      );
    default:
      return <UnsupportedMedia />;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  invalidBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  invalidText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  audioCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  audioInfo: {
    flex: 1,
  },
  mediaTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  mediaMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryButtonText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 200,
    backgroundColor: '#0F172A',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  videoOverlayText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  videoErrorBox: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 2,
  },
  videoError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  videoTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
    padding: 12,
  },
});
