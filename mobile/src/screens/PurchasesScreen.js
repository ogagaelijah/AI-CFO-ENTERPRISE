import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const PurchasesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { isReadOnly } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState({ total_amount: 0, total_outstanding: 0 });

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [amountPaid, setAmountPaid] = useState('');
  const [items, setItems] = useState([{ name: '', quantity: '', unitCost: '' }]);

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/purchases');
      if (res.data?.success) {
        setSummary(res.data.data.summary || { total_amount: 0, total_outstanding: 0 });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReadOnly) {
      fetchPurchases();
    } else {
      setLoading(false);
    }
  }, [isReadOnly]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { name: '', quantity: '', unitCost: '' }]);
  const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

  const calculateTotal = () => items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)), 0);

  const handleSubmit = async () => {
    if (isReadOnly) return Alert.alert('Expired', 'Your subscription has expired.');
    if (!supplierName.trim()) return Alert.alert('Error', 'Supplier name is required');
    
    const validItems = items.filter(i => i.name.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.unitCost) > 0);
    if (validItems.length === 0) return Alert.alert('Error', 'Please add at least one valid item');
    
    const total = calculateTotal();
    const paid = paymentStatus === 'PAID' ? total : (parseFloat(amountPaid) || 0);
    
    if (paymentStatus === 'PARTIAL' && (paid <= 0 || paid >= total)) {
      return Alert.alert('Error', 'For partial payment, amount paid must be greater than 0 and less than the total.');
    }

    setIsSubmitting(true);
    try {
      await api.post('/purchases', {
        supplierName: supplierName.trim(),
        items: validItems.map(i => ({
          name: i.name.trim(),
          quantity: parseFloat(i.quantity),
          unitCost: parseFloat(i.unitCost),
        })),
        paymentStatus,
        amountPaid: paid,
        purchaseDate: new Date().toISOString(),
        confirmed: true
      });
      Alert.alert('Success', 'Purchase recorded successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

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
            You cannot record new purchases while your account is in read-only mode. Please renew your plan to continue.
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

  const totalAmount = calculateTotal();
  const balanceRemaining = totalAmount - (parseFloat(amountPaid) || 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Record Purchase</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PurchasesHistory')}>
          <Ionicons name="time-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.summaryCard, { backgroundColor: theme.warning }]}>
          <Text style={{ color: 'rgba(0,0,0,0.6)', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Total Outstanding to Suppliers</Text>
          <Text style={{ color: '#000', fontSize: 28, fontWeight: 'bold' }}>₦{Number(summary.total_outstanding || 0).toLocaleString()}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Supplier Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="e.g. Milo Distributor" placeholderTextColor={theme.textMuted} value={supplierName} onChangeText={setSupplierName} />
          
          <View style={styles.statusRow}>
            {['PAID', 'PARTIAL', 'UNPAID'].map(status => (
              <TouchableOpacity key={status} style={[styles.statusBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }, paymentStatus === status && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setPaymentStatus(status)}>
                <Text style={[{ fontSize: 12, fontWeight: '600', color: theme.textMuted }, paymentStatus === status && { color: '#fff' }]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginTop: 16, marginBottom: 12 }}>Items</Text>
          {items.map((item, index) => (
            <View key={index} style={[styles.itemCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Item Name" placeholderTextColor={theme.textMuted} value={item.name} onChangeText={(val) => handleItemChange(index, 'name', val)} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }]}>Qty</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="0" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={item.quantity} onChangeText={(val) => handleItemChange(index, 'quantity', val)} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }]}>Unit Cost (₦)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={item.unitCost} onChangeText={(val) => handleItemChange(index, 'unitCost', val)} />
                </View>
              </View>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                  <Ionicons name="trash" size={16} color={theme.danger} />
                  <Text style={{ color: theme.danger, fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Ionicons name="add-circle" size={20} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Add Another Item</Text>
          </TouchableOpacity>

          <View style={[styles.totalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={{ fontSize: 16, color: theme.textMuted }}>Total Purchase Cost</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>₦{totalAmount.toLocaleString()}</Text>
          </View>

          {paymentStatus === 'PARTIAL' && (
            <View style={[styles.partialCard, { backgroundColor: theme.background, borderColor: theme.warning }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.warning, marginBottom: 8 }}>How much are you paying now?</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Enter Amount Paid (₦) *" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={amountPaid} onChangeText={setAmountPaid} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: theme.textMuted }}>Owed to Supplier:</Text>
                <Text style={{ color: theme.danger, fontWeight: 'bold' }}>₦{Math.max(0, balanceRemaining).toLocaleString()}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.success }, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Record Purchase</Text>}
          </TouchableOpacity>
        </View>
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
  card: { padding: 20, borderRadius: 16, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statusBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  itemCard: { padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  row: { flexDirection: 'row', marginTop: 8 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginBottom: 16 },
  totalCard: { padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  partialCard: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});