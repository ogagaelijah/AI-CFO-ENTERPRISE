import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const AddCreditorScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const [supplierName, setSupplierName] = useState('');
  const [totalOwed, setTotalOwed] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!supplierName.trim()) return Alert.alert('Error', 'Supplier name is required');
    if (!totalOwed || parseFloat(totalOwed) <= 0) return Alert.alert('Error', 'Valid amount is required');

    setLoading(true);
    try {
      await api.post('/creditors', {
        supplierName: supplierName.trim(),
        totalOwed: parseFloat(totalOwed),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        notes: notes.trim(),
      });
      Alert.alert('Success', 'Creditor added successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add creditor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Add Creditor</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.text }]}>Supplier Name *</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="e.g. Milo Distributor" placeholderTextColor={theme.textMuted} value={supplierName} onChangeText={setSupplierName} />

        <Text style={[styles.label, { color: theme.text }]}>Amount Owed (₦) *</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={totalOwed} onChangeText={setTotalOwed} />

        <Text style={[styles.label, { color: theme.text }]}>Due Date (Optional)</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textMuted} value={dueDate} onChangeText={setDueDate} />

        <Text style={[styles.label, { color: theme.text }]}>Notes (Optional)</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="e.g. Invoice #1234" placeholderTextColor={theme.textMuted} value={notes} onChangeText={setNotes} />

        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Creditor</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
});