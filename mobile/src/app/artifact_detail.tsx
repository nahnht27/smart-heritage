import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MOCK_ARTIFACTS } from '../services/mockData';

export default function ArtifactDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);

  // Look up artifact in mock data by id, or fallback
  const artifact =
    MOCK_ARTIFACTS.find((a) => a.id === id) || {
      id: id || '101',
      name: name || 'Trống Đồng Đông Sơn',
      era: 'Thời kỳ Đông Sơn',
      category: 'Bảo vật Quốc gia',
      description:
        'Hiện vật tiêu biểu của nền văn hóa Đông Sơn, biểu tượng cho quyền lực và đời sống tâm linh, văn hóa đúc đồng đỉnh cao của người Việt cổ.',
      locationInMuseum: 'Phòng trưng bày Kim loại & Thời kỳ Hùng Vương - Tủ số 1',
      imageUrl:
        'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=600&q=80',
    };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Image source={{ uri: artifact.imageUrl }} style={styles.heroImage} />

      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <Text style={styles.categoryBadge}>{artifact.category}</Text>
          <Text style={styles.eraText}>{artifact.era}</Text>
        </View>

        <Text style={styles.title}>{artifact.name}</Text>

        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Vị trí trưng bày:</Text>
            <Text style={styles.locationValue}>{artifact.locationInMuseum}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Mô tả hiện vật</Text>
        <Text style={styles.description}>{artifact.description}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.favButton, isFavorite ? styles.favButtonActive : null]}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.8}
          >
            <Text style={styles.favIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            <Text style={[styles.favText, isFavorite ? styles.favTextActive : null]}>
              {isFavorite ? 'Đã thêm vào Yêu thích' : 'Lưu vào Yêu thích'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sprintNote}>
          <Text style={styles.sprintNoteText}>
            Sprint 2: Màn hình hiển thị dữ liệu mẫu (Mock data). Tích hợp trigger tự động qua iBeacon/BLE sẽ triển khai ở Sprint 3.
          </Text>
        </View>
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
  eraText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
  actionRow: {
    marginBottom: 24,
  },
  favButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  favButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  favIcon: {
    fontSize: 18,
  },
  favText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  favTextActive: {
    color: '#B91C1C',
  },
  sprintNote: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  sprintNoteText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
});
