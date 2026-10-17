import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MOCK_ARTIFACTS } from '../services/mockData';

export default function ArtifactListScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh mục Hiện vật</Text>
        <Text style={styles.subtitle}>
          Tổng hợp {MOCK_ARTIFACTS.length} hiện vật quý giá tại khu di sản
        </Text>
      </View>

      <View style={styles.list}>
        {MOCK_ARTIFACTS.map((art) => (
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
            <Image source={{ uri: art.imageUrl }} style={styles.itemImage} />
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
});
