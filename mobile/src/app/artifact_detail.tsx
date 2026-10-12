import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ArtifactDetailScreen() {
  const { id, name } = useLocalSearchParams();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imageText}>Image of {name || 'Artifact'}</Text>
      </View>
      
      <Text style={styles.title}>{name || 'Artifact Details'}</Text>
      <Text style={styles.description}>
        This is the detailed description of the artifact. In a real app, this information will be fetched from the backend when triggered by an iBeacon or selected from the list.
      </Text>

      <View style={styles.actions}>
        <Button title="❤️ Add to Favorite" onPress={() => alert('Added to favorites')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  imagePlaceholder: { width: '100%', height: 250, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  imageText: { color: '#666', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', margin: 20, color: '#333' },
  description: { fontSize: 16, lineHeight: 24, color: '#555', marginHorizontal: 20 },
  actions: { margin: 20, marginTop: 40 }
});
