import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function ArtifactListScreen() {
  const router = useRouter();

  const artifacts = [
    { id: '1', name: 'Ancient Vase', era: '15th Century' },
    { id: '2', name: 'Royal Sword', era: '13th Century' },
    { id: '3', name: 'Stone Tablet', era: 'Unknown' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>All Artifacts</Text>
      {artifacts.map(art => (
        <TouchableOpacity 
          key={art.id} 
          style={styles.item}
          onPress={() => router.push(`/artifact_detail?id=${art.id}&name=${art.name}`)}
        >
          <Text style={styles.itemName}>{art.name}</Text>
          <Text style={styles.itemEra}>{art.era}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  item: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 },
  itemName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  itemEra: { fontSize: 14, color: '#777', marginTop: 4 }
});
