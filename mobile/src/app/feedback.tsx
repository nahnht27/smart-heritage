import { View, Text, StyleSheet, TextInput, Button } from 'react-native';

export default function FeedbackScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave Feedback</Text>
      <Text style={styles.subtitle}>How was your experience at the Heritage Site?</Text>
      
      <TextInput 
        style={styles.textArea} 
        placeholder="Type your feedback here..." 
        multiline 
        numberOfLines={6} 
      />

      <Button title="Submit Feedback" onPress={() => alert('Feedback submitted!')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  textArea: { backgroundColor: '#fff', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#ddd', height: 150, textAlignVertical: 'top', marginBottom: 20 }
});
