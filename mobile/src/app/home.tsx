import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { heritageApi, type HeritageSite, type Artifact } from '../services/heritageApi';
import { apiClient } from '../services/api';
import { authStorage } from '../services/authStorage';

export default function HomeScreen() {
  const router = useRouter();

  // Auth state (populated from backend M1: GET /api/users/me)
  const [user, setUser] = useState<{
    userId: number;
    username: string;
    email: string;
    role: string;
    preferredLanguageId: number | null;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Content data states (real API)
  const [sites, setSites] = useState<HeritageSite[]>([]);
  const [featuredArtifacts, setFeaturedArtifacts] = useState<Artifact[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const site = sites[0] ?? null;

  useEffect(() => {
    let mounted = true;

    const loadContent = async () => {
      setIsLoadingData(true);
      setDataError(null);
      try {
        const sitesResult = await heritageApi.getHeritageSites();
        if (!mounted) return;
        if (!sitesResult.ok || !sitesResult.data) {
          setDataError(sitesResult.error || 'Không tải được danh sách di sản');
          setIsLoadingData(false);
          return;
        }
        setSites(sitesResult.data);

        const firstSite = sitesResult.data[0];
        if (firstSite) {
          const artifactsResult = await heritageApi.getArtifactsBySite(firstSite.id);
          if (!mounted) return;
          if (artifactsResult.ok && artifactsResult.data) {
            // Backend không cung cấp trường isFeatured, nên hiển thị một tập con xác định
            // từ dữ liệu thật thay vì giả dough dữ liệu featured.
            setFeaturedArtifacts(artifactsResult.data.slice(0, 3));
          }
        }
      } catch {
        if (mounted) {
          setDataError('Lỗi kết nối mạng. Vui lòng thử lại.');
        }
      } finally {
        if (mounted) setIsLoadingData(false);
      }
    };

    loadContent();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const token = await authStorage.getToken();
      if (!token) {
        setUser(null);
        return;
      }

      setIsLoadingProfile(true);
      try {
        const result = await apiClient.get<{
          userId: number;
          username: string;
          email: string;
          role: string;
          preferredLanguageId: number | null;
        }>('/api/users/me', {
          token,
        });

        if (mounted && result.ok && result.data) {
          setUser(result.data);
        } else if (mounted) {
          // Token invalid/expired — clear it
          await authStorage.clearToken();
          setUser(null);
        }
      } catch {
        if (mounted) {
          await authStorage.clearToken();
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await authStorage.clearToken();
    setUser(null);
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {isLoadingData ? (
        <View testID="loading-container" style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D97706" />
        </View>
      ) : dataError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{dataError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setDataError(null);
              setIsLoadingData(true);
              setRefreshKey((prev) => prev + 1);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 1. Heritage Site Landing Banner */}
          <View style={styles.heroCard}>
            {!site ? (
              <View style={styles.emptyBanner}>
                <Text style={styles.emptyText}>Chưa có dữ liệu di sản</Text>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: site.heroImageUrl ?? undefined }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                <View style={styles.heroOverlay}>
                  <View style={styles.siteBadge}>
                    <Text style={styles.siteBadgeText}>Khu Di tích Lịch sử</Text>
                  </View>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteTagline}>{site.tagline}</Text>

                  <View style={styles.siteInfoRow}>
                    <Text style={styles.siteInfoItem}>📍 {site.location}</Text>
                    <Text style={styles.siteInfoItem}>🕒 {site.openHours}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

      {/* 2. iBeacon BLE Status Indicator — Not integrated in Sprint 2 */}
      <View style={styles.beaconBanner}>
        <View style={styles.beaconPulseDot}>
          <Text style={styles.beaconIcon}>📡</Text>
        </View>
        <View style={styles.beaconTextContainer}>
          <Text style={styles.beaconTitle}>iBeacon / BLE: Chưa tích hợp</Text>
          <Text style={styles.beaconSubtitle}>
            Tính năng quét beacon thực tế chưa có sẵn trong bản Sprint 2.
          </Text>
        </View>
      </View>

      {/* 3. Quick Navigation Features Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Khám phá Di sản</Text>
        <Text style={styles.sectionSubtitle}>Các tính năng chính dành cho du khách</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/artifact_list')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.cardEmoji}>🏛️</Text>
          </View>
          <Text style={styles.cardTitle}>Hiện vật</Text>
          <Text style={styles.cardDescription}>Tra cứu bảo vật & cổ vật</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/map')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.cardEmoji}>🗺️</Text>
          </View>
          <Text style={styles.cardTitle}>Bản đồ số</Text>
          <Text style={styles.cardDescription}>Định vị & sơ đồ gian trưng bày</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/favorite')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#FDF2F8' }]}>
            <Text style={styles.cardEmoji}>⭐</Text>
          </View>
          <Text style={styles.cardTitle}>Yêu thích & Lịch sử</Text>
          <Text style={styles.cardDescription}>Mục đã lưu & dấu chân tham quan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/feedback')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.cardEmoji}>✍️</Text>
          </View>
          <Text style={styles.cardTitle}>Đánh giá & Góp ý</Text>
          <Text style={styles.cardDescription}>Gửi cảm nhận chuyến tham quan</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Featured Artifacts Section */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Bảo vật Tiêu biểu</Text>
          <Text style={styles.sectionSubtitle}>Hiện vật nổi bật không nên bỏ lỡ</Text>
        </View>
      </View>

      <View style={styles.featuredList}>
        {featuredArtifacts.map((art) => (
          <TouchableOpacity
            key={art.id}
            style={styles.artifactCard}
            onPress={() =>
              router.push({
                pathname: '/artifact_detail',
                params: { id: art.id, name: art.name },
              })
            }
            activeOpacity={0.8}
          >
            <Image source={{ uri: art.imageUrl ?? undefined }} style={styles.artifactImage} />
            <View style={styles.artifactContent}>
              <View style={styles.artifactTagRow}>
                <Text style={styles.artifactCategoryBadge}>{art.category}</Text>
                <Text style={styles.artifactEra}>{art.era}</Text>
              </View>
              <Text style={styles.artifactName}>{art.name}</Text>
              <Text style={styles.artifactDescription} numberOfLines={2}>
                {art.description}
              </Text>
              <Text style={styles.viewDetailLink}>Xem thông tin chi tiết →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 5. User Account / Logout Action */}
      <View style={styles.accountSection}>
        {isLoadingProfile ? (
          <ActivityIndicator style={styles.loadingIndicator} />
        ) : user ? (
          <View style={styles.authAccountRow}>
            <Text style={styles.accountGreeting}>
              Xin chào, {user.username}
            </Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutButtonText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>← Đăng nhập / Đổi tài khoản</Text>
          </TouchableOpacity>
        )}
      </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    height: 220,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  siteBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  siteBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  siteName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  siteTagline: {
    fontSize: 13,
    color: '#E2E8F0',
    marginBottom: 8,
  },
  siteInfoRow: {
    flexDirection: 'column',
    gap: 4,
  },
  siteInfoItem: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  beaconBanner: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  beaconPulseDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  beaconIcon: {
    fontSize: 20,
  },
  beaconTextContainer: {
    flex: 1,
  },
  beaconTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  beaconSubtitle: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderWithBadge: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  mockBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  featuredList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  artifactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  artifactImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
  },
  artifactContent: {
    padding: 14,
  },
  artifactTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  artifactCategoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  artifactEra: {
    fontSize: 11,
    color: '#64748B',
  },
  artifactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  artifactDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 8,
  },
  viewDetailLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  accountSection: {
    marginTop: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  authAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountGreeting: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  loadingIndicator: {
    marginTop: 8,
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  logoutButtonText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },

  // Data loading / error / empty states
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
  emptyBanner: {
    height: 220,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
  },
});
