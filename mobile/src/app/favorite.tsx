import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function FavoriteScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Your Favorites</Text>
      <View style={styles.item}><Text>Ancient Vase</Text></View>
      
      <Text style={styles.sectionTitle}>Visit History</Text>
      <View style={styles.item}><Text>Royal Sword - Visited Today</Text></View>
      <View style={styles.item}><Text>Stone Tablet - Visited Yesterday</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  item: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 }
});
