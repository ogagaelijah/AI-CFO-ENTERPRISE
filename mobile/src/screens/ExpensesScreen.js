import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const ExpensesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { isReadOnly } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total_amount: 0 });

  // Form State
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      if (res.data?.success) {
        setExpenses(res.data.data.expenses || []);
        setSummary(res.data.data.summary || { total_amount: 0 });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReadOnly) {
      fetchExpenses();
    } else {
      setLoading(false);
    }
  }, [isReadOnly]);

  const handleSubmit = async () => {
    if (isReadOnly) return Alert.alert('Expired', 'Your subscription has expired.');
    if (!category.trim()) return Alert.alert('Error', 'Category is required');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Error', 'Valid amount is required');
    
    setIsSubmitting(true);
    try {
      await api.post('/expenses', {
        category: category.trim(),
        amount: parseFloat(amount),
        description: description.trim(),
        date: new Date().toISOString(),
      });
      Alert.alert('Success', 'Expense recorded successfully');
      setCategory('');
      setAmount('');
      setDescription('');
      fetchExpenses(); // Refresh
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderExpense = ({ item }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{item.category}</Text>
        <Text style={{ fontSize: 12, color: theme.textMuted }}>{item.description || 'No description'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.danger }}>₦{Number(item.amount).toLocaleString()}</Text>
        <Text style={{ fontSize: 10, color: theme.textMuted }}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  if (loading && !isReadOnly) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  // ─── SUBSCRIPTION EXPIRED BLOCK ───
  if (isReadOnly) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, padding: 24 }]}>
        <View style={{ backgroundColor: theme.cardBg, padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: theme.border, width: '100%' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.warning + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="lock-closed" size={32} color={theme.warning} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 8 }}>
            Subscription Expired
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            You cannot record new expenses while your account is in read-only mode. Please renew your plan to continue.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' }}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Renew Subscription</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Expenses</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.danger }]}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Total Expenses</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>₦{Number(summary.total_amount || 0).toLocaleString()}</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 12 }}>Record New Expense</Text>
          
          <Text style={[styles.label, { color: theme.textMuted }]}>Category *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="e.g. Transport, Utilities" placeholderTextColor={theme.textMuted} value={category} onChangeText={setCategory} />

          <Text style={[styles.label, { color: theme.textMuted }]}>Amount (₦) *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={amount} onChangeText={setAmount} />

          <Text style={[styles.label, { color: theme.textMuted }]}>Description (Optional)</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="What was this for?" placeholderTextColor={theme.textMuted} value={description} onChangeText={setDescription} />

          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Record Expense</Text>}
          </TouchableOpacity>
        </View>

        {/* Recent Expenses */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginTop: 20, marginBottom: 12 }}>Recent Expenses</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          expenses.map(item => <React.Fragment key={item.id}>{renderExpense({ item })}</React.Fragment>)
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 20 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  itemCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
});