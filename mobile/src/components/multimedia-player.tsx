import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEvent } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { isUsableMediaUrl, type Multimedia } from '../services/heritageApi';
import { RemoteImage } from './remote-image';

interface MultimediaPlayerProps {
  item: Multimedia;
  onAudioPlay?: (item: Multimedia) => void;
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

function AudioPlayer({ item, onAudioPlay }: MultimediaPlayerProps) {
  const player = useAudioPlayer(isUsableMediaUrl(item.url) ? item.url : null);
  const status = useAudioPlayerStatus(player);
  const reportedPlayback = useRef(false);

  useEffect(() => {
    if (status.playing && !reportedPlayback.current) {
      reportedPlayback.current = true;
      onAudioPlay?.(item);
    }
  }, [status.playing, item, onAudioPlay]);

  if (!isUsableMediaUrl(item.url)) {
    return <InvalidMedia label="Âm thanh" />;
  }

  const hasError = Boolean(status.error);
  const isLoading = !status.isLoaded && !hasError;

  const handleTogglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
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
            ? 'Không phát được âm thanh'
            : `${formatTime(status.currentTime)} / ${formatTime(status.duration)}`}
        </Text>
      </View>
    </View>
  );
}

function VideoPlayer({ item }: MultimediaPlayerProps) {
  const player = useVideoPlayer(isUsableMediaUrl(item.url) ? item.url : null);
  const { status, error } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  if (!isUsableMediaUrl(item.url)) {
    return <InvalidMedia label="Video" />;
  }

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
      {status === 'error' && (
        <Text style={styles.videoError}>
          Không phát được video{error ? `: ${error.message}` : '.'}
        </Text>
      )}
      {item.title ? <Text style={styles.videoTitle}>{item.title}</Text> : null}
    </View>
  );
}

export function MultimediaPlayer({ item, onAudioPlay }: MultimediaPlayerProps) {
  switch (item.type) {
    case 'IMAGE':
      return <MediaImage item={item} />;
    case 'AUDIO':
      return <AudioPlayer item={item} onAudioPlay={onAudioPlay} />;
    case 'VIDEO':
      return <VideoPlayer item={item} />;
    default:
      return null;
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
  videoError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  videoTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
    padding: 12,
  },
});
