import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  heritageApi,
  isUsableMediaUrl,
  type Artifact,
  type Multimedia,
} from '../services/heritageApi';
import { RemoteImage } from '../components/remote-image';
import { MultimediaPlayer } from '../components/multimedia-player';
import { interactionApi } from '../services/interactionApi';
import * as Crypto from 'expo-crypto';

export default function ArtifactDetailScreen() {
  const { id } = useLocalSearchParams();

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [multimedia, setMultimedia] = useState<Multimedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const recordedArtifactId = useRef<string | null>(null);

  const artifactId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    let mounted = true;

    const loadArtifact = async () => {
      if (!artifactId) {
        setError('Không có mã hiện vật');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const artifactResult = await heritageApi.getArtifactById(artifactId);
        if (!mounted) return;
        if (!artifactResult.ok || !artifactResult.data) {
          setError(artifactResult.error || 'Không tải được thông tin hiện vật');
          setIsLoading(false);
          return;
        }
        setArtifact(artifactResult.data);

        const multimediaResult = await heritageApi.getArtifactMultimedia(artifactId);
        if (!mounted) return;
        if (multimediaResult.ok && multimediaResult.data) {
          setMultimedia(multimediaResult.data);
        }
      } catch {
        if (mounted) {
          setError('Lỗi kết nối mạng. Vui lòng thử lại.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadArtifact();
    return () => {
      mounted = false;
    };
  }, [artifactId, refreshKey]);

  useEffect(() => {
    if (!artifact) {
      return;
    }

    const currentArtifactId = String(artifact.id);
    if (recordedArtifactId.current === currentArtifactId) {
      return;
    }
    recordedArtifactId.current = currentArtifactId;

    const now = new Date().toISOString();
    void interactionApi.recordInteraction({
      eventId: Crypto.randomUUID(),
      artifactId: artifact.id,
      interactionType: 'VIEW',
      languageCode: 'vi',
      startedAt: now,
      interactedAt: now,
    });
  }, [artifact]);

  const handleAudioPlay = useCallback(() => {
    if (!artifact) {
      return;
    }

    const now = new Date().toISOString();
    void interactionApi.recordInteraction({
      eventId: Crypto.randomUUID(),
      artifactId: artifact.id,
      interactionType: 'AUDIO_PLAY',
      languageCode: 'vi',
      startedAt: now,
      interactedAt: now,
    });
  }, [artifact]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <View testID="loading-container" style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  if (error || !artifact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Không tìm thấy hiện vật'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const multimediaImages = multimedia.filter(
    (m) => m.type === 'IMAGE' && isUsableMediaUrl(m.url),
  );
  const multimediaAudio = multimedia.filter(
    (m) => m.type === 'AUDIO' && isUsableMediaUrl(m.url),
  );
  const multimediaVideo = multimedia.filter(
    (m) => m.type === 'VIDEO' && isUsableMediaUrl(m.url),
  );
  const heroImageUrl = multimediaImages.length > 0 ? multimediaImages[0].url : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <RemoteImage
        uri={heroImageUrl}
        style={styles.heroImage}
        accessibilityLabel={artifact.name}
      />

      {multimediaImages.length > 0 && (
        <View style={styles.multimediaSection}>
          <Text style={styles.multimediaTitle}>Hình ảnh liên quan</Text>
          <View style={styles.multimediaList}>
            {multimediaImages.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.multimediaItem}
                onPress={() => {}}
              >
                <RemoteImage
                  uri={m.url}
                  style={styles.multimediaImage}
                  accessibilityLabel={m.title ?? artifact.name}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {multimediaAudio.length > 0 && (
        <View style={styles.multimediaSection}>
          <Text style={styles.multimediaTitle}>Thuyết minh</Text>
          <View style={styles.mediaList}>
            {multimediaAudio.map((m) => (
              <MultimediaPlayer
                key={m.id}
                item={m}
                onAudioPlay={handleAudioPlay}
              />
            ))}
          </View>
        </View>
      )}

      {multimediaVideo.length > 0 && (
        <View style={styles.multimediaSection}>
          <Text style={styles.multimediaTitle}>Video tư liệu</Text>
          <View style={styles.mediaList}>
            {multimediaVideo.map((m) => (
              <MultimediaPlayer key={m.id} item={m} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <Text style={styles.categoryBadge}>{artifact.siteName || 'Di sản'}</Text>
        </View>

        <Text style={styles.title}>{artifact.name}</Text>

        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Vị trí trưng bày:</Text>
            <Text style={styles.locationValue}>{artifact.address}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Mô tả hiện vật</Text>
        <Text style={styles.description}>{artifact.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  heroImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#0F172A',
  },
  multimediaSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  multimediaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  multimediaList: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mediaList: {
    gap: 10,
  },
  multimediaItem: {
    width: 110,
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multimediaImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  locationValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
