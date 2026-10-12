import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.welcome}>Discover the Heritage Site</Text>
      <Text style={styles.beaconStatus}>iBeacon Status: Scanning for nearby artifacts...</Text>
      
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/artifact_list')}>
          <Text style={styles.cardTitle}>Artifacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/map')}>
          <Text style={styles.cardTitle}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/favorite')}>
          <Text style={styles.cardTitle}>History & Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/feedback')}>
          <Text style={styles.cardTitle}>Feedback</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f5f5f5' },
  welcome: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  beaconStatus: { fontSize: 14, color: '#4caf50', marginBottom: 20, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', height: 120, backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2196F3', textAlign: 'center' }
});
