import { View, Text, StyleSheet } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Site Map</Text>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>Interactive Map goes here</Text>
        <Text style={styles.mapSubtext}>Showing current location & nearby artifacts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  mapPlaceholder: { flex: 1, backgroundColor: '#e0e0e0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#bdbdbd', borderStyle: 'dashed' },
  mapText: { fontSize: 18, fontWeight: 'bold', color: '#757575' },
  mapSubtext: { fontSize: 14, color: '#9e9e9e', marginTop: 10 }
});
