import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEvent } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { Multimedia } from '../services/heritageApi';
import { isPlayableUrl } from '../utils/media';

interface MultimediaPlayerProps {
  item: Multimedia;
  onAudioPlay?: (item: Multimedia) => void;
}

function InvalidMedia({ label }: { label: string }) {
  return (
    <View style={styles.invalidBox}>
      <Text style={styles.invalidText}>{label} không khả dụng hoặc URL không hợp lệ.</Text>
    </View>
  );
}

function MediaImage({ item }: { item: Multimedia }) {
  const [hasError, setHasError] = useState(false);

  if (!isPlayableUrl(item.url) || hasError) {
    return <InvalidMedia label="Hình ảnh" />;
  }

  return (
    <Image
      source={{ uri: item.url }}
      style={styles.image}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}

function AudioPlayer({ item, onAudioPlay }: MultimediaPlayerProps) {
  const player = useAudioPlayer(isPlayableUrl(item.url) ? item.url : null);
  const status = useAudioPlayerStatus(player);
  const reportedPlayback = useRef(false);

  useEffect(() => {
    if (status.playing && !reportedPlayback.current) {
      reportedPlayback.current = true;
      onAudioPlay?.(item);
    }
  }, [status.playing, item, onAudioPlay]);

  if (!isPlayableUrl(item.url)) {
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
  const player = useVideoPlayer(isPlayableUrl(item.url) ? item.url : null);
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });

  if (!isPlayableUrl(item.url)) {
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
    case 'image':
      return <MediaImage item={item} />;
    case 'audio':
      return <AudioPlayer item={item} onAudioPlay={onAudioPlay} />;
    case 'video':
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
  image: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  invalidBox: {
    width: 160,
    minHeight: 90,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  invalidText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  audioCard: {
    width: 220,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  audioInfo: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  mediaMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  videoCard: {
    width: '100%',
    marginBottom: 12,
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  videoError: {
    marginTop: 6,
    fontSize: 11,
    color: '#B91C1C',
  },
  videoTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});
