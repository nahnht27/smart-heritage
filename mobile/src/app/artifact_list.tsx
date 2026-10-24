import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { heritageApi, type Artifact } from '../services/heritageApi';

export default function ArtifactListScreen() {
  const router = useRouter();
  const { siteId } = useLocalSearchParams();

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedSiteId = (Array.isArray(siteId) ? siteId[0] : siteId) ?? '1';

  useEffect(() => {
    let mounted = true;

    const loadArtifacts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await heritageApi.getArtifactsBySite(resolvedSiteId);
        if (!mounted) return;
        if (!result.ok || !result.data) {
          setError(result.error || 'Không tải được danh sách hiện vật');
          setIsLoading(false);
          return;
        }
        setArtifacts(result.data);
      } catch {
        if (mounted) {
          setError('Lỗi kết nối mạng. Vui lòng thử lại.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadArtifacts();
    return () => {
      mounted = false;
    };
  }, [resolvedSiteId, refreshKey]);

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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh mục Hiện vật</Text>
        <Text style={styles.subtitle}>
          Tổng hợp {artifacts.length} hiện vật quý giá tại khu di sản
        </Text>
      </View>

      {artifacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có hiện vật nào được hiển thị</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {artifacts.map((art) => (
            <TouchableOpacity
              key={art.id}
              style={styles.item}
              onPress={() =>
                router.push({
                  pathname: '/artifact_detail',
                  params: { id: art.id, name: art.name },
                })
              }
              activeOpacity={0.75}
            >
              <Image source={{ uri: art.imageUrl ?? undefined }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <View style={styles.tagRow}>
                  <Text style={styles.categoryBadge}>{art.category}</Text>
                </View>
                <Text style={styles.itemName}>{art.name}</Text>
                <Text style={styles.itemEra}>Niên đại: {art.era}</Text>
                <Text style={styles.itemLocation}>📍 {art.locationInMuseum}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  list: { gap: 12 },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  itemImage: {
    width: 100,
    height: 110,
    backgroundColor: '#E2E8F0',
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  tagRow: {
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  itemEra: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  itemLocation: { fontSize: 11, color: '#94A3B8' },
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});
