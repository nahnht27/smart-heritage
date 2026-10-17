import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MOCK_FAVORITES, MOCK_VISIT_HISTORY } from '../services/mockData';

export default function FavoriteScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Favorites Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>❤️ Hiện vật Yêu thích</Text>
          <Text style={styles.countBadge}>{MOCK_FAVORITES.length}</Text>
        </View>

        {MOCK_FAVORITES.map((fav) => (
          <TouchableOpacity
            key={fav.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/artifact_detail',
                params: { id: fav.artifactId, name: fav.artifactName },
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{fav.artifactName}</Text>
              <Text style={styles.cardMeta}>Đã lưu: {fav.savedAt}</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Visit History Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🕒 Lịch sử Tham quan</Text>
          <Text style={styles.countBadge}>{MOCK_VISIT_HISTORY.length}</Text>
        </View>

        {MOCK_VISIT_HISTORY.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/artifact_detail',
                params: { id: item.artifactId, name: item.artifactName },
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.artifactName}</Text>
              <View style={styles.historyMetaRow}>
                <Text style={styles.triggerBadge}>
                  {item.type === 'BEACON_TRIGGER' ? '📡 Qua iBeacon' : '👆 Xem thủ công'}
                </Text>
                <Text style={styles.cardMeta}>{item.visitedAt}</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  countBadge: {
    backgroundColor: '#E2E8F0',
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#64748B' },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  triggerBadge: {
    fontSize: 11,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  arrowIcon: { fontSize: 16, color: '#94A3B8', marginLeft: 8 },
});
