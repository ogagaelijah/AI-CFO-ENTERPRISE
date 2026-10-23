import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';

// ─── RECORD SALE SCREEN ──────────────────────────────────────────
export const RecordSaleScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { addSaleToQueue } = useOffline();
  const { theme } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [amountPaid, setAmountPaid] = useState('');
  const [dueDays, setDueDays] = useState(3); 
  const [items, setItems] = useState([{ name: '', quantity: '', price: '', unitMultiplier: 1, soldUnit: 'Piece', inventoryId: null }]);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      const fetchedItems = res.data?.data?.items || res.data?.data || res.data || [];
      setInventory(Array.isArray(fetchedItems) ? fetchedItems : []);
    } catch (error) {
      console.error('Inventory fetch error:', error);
      Alert.alert('Error', 'Failed to load inventory. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const findMatchedItem = (typedName) => {
    if (!typedName) return null;
    const cleanTyped = typedName.trim().toLowerCase();
    return inventory.find(i => i.item_name?.trim().toLowerCase() === cleanTyped);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'name') {
      const matchedItem = findMatchedItem(value);
      if (matchedItem) {
        newItems[index].inventoryId = matchedItem.id;
        newItems[index].price = String(matchedItem.selling_price || '');
      } else {
        newItems[index].inventoryId = null;
      }
    }
    setItems(newItems);
  };

  const handleUnitChange = (index, multiplier, unitName) => {
    const newItems = [...items];
    newItems[index].unitMultiplier = multiplier;
    newItems[index].soldUnit = unitName;
    const matchedItem = findMatchedItem(newItems[index].name);
    if (matchedItem && unitName !== 'Piece' && matchedItem.packs) {
      const pack = matchedItem.packs.find(p => p.pack_name === unitName);
      if (pack) newItems[index].price = String(pack.selling_price || '');
    } else if (matchedItem) {
      newItems[index].price = String(matchedItem.selling_price || '');
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { name: '', quantity: '', price: '', unitMultiplier: 1, soldUnit: 'Piece', inventoryId: null }]);
  const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const calculateTotal = () => items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
  
  const handleSubmit = async () => {
    if (!customerName.trim()) return Alert.alert('Error', 'Customer name is required');
    const validItems = items.filter(i => i.name.trim() && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) return Alert.alert('Error', 'Add at least one valid item');
    const total = calculateTotal();
    const paid = paymentStatus === 'PAID' ? total : (parseFloat(amountPaid) || 0);
    if (paymentStatus === 'PARTIAL' && (paid <= 0 || paid >= total)) {
      return Alert.alert('Error', 'For partial payment, amount paid must be greater than 0 and less than the total.');
    }

    try {
      setLoading(true);
      const payload = {
        customerName: customerName.trim(),
        paymentStatus,
        amountPaid: paid,
        dueDays: (paymentStatus === 'UNPAID' || paymentStatus === 'PARTIAL') ? dueDays : null,
        items: validItems.map(i => ({
          name: i.name.trim(),
          quantity: parseFloat(i.quantity),
          sellingPrice: parseFloat(i.price),
          inventoryId: i.inventoryId,
          unitMultiplier: i.unitMultiplier,
          soldUnit: i.soldUnit,
        }))
      };

      try {
        const res = await api.post('/sales', payload);
        if (res.data?.success) {
          Alert.alert('Success', 'Sale recorded successfully!');
          navigation.navigate('History');
        }
      } catch (networkError) {
        if (networkError.message.includes('Network Error')) {
          await addSaleToQueue(payload);
          Alert.alert('Saved Offline', 'No network. Sale saved and will sync when you are back online.');
          navigation.navigate('History');
        } else {
          throw networkError;
        }
      }
      setCustomerName('');
      setItems([{ name: '', quantity: '', price: '', unitMultiplier: 1, soldUnit: 'Piece', inventoryId: null }]);
      setAmountPaid('');
      setPaymentStatus('PAID');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (loading && inventory.length === 0) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const totalAmount = calculateTotal();
  const balanceRemaining = totalAmount - (parseFloat(amountPaid) || 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer Details</Text>
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Customer Name *" placeholderTextColor={theme.textMuted} value={customerName} onChangeText={setCustomerName} />
      
      <View style={styles.statusRow}>
        {['PAID', 'PARTIAL', 'UNPAID'].map(status => (
          <TouchableOpacity key={status} style={[styles.statusBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }, paymentStatus === status && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setPaymentStatus(status)}>
            <Text style={[{ fontSize: 12, fontWeight: '600', color: theme.textMuted }, paymentStatus === status && { color: '#fff' }]}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(paymentStatus === 'UNPAID' || paymentStatus === 'PARTIAL') && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 8 }}>When is this payment due?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[3, 7, 14, 30].map(days => (
              <TouchableOpacity
                key={days}
                onPress={() => setDueDays(days)}
                style={[{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', backgroundColor: theme.cardBg, borderColor: theme.border }, dueDays === days && { backgroundColor: theme.warning, borderColor: theme.warning }]}
              >
                <Text style={[{ fontSize: 14, fontWeight: 'bold', color: theme.text }, dueDays === days && { color: '#fff' }]}>{days} Days</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Items</Text>
      {items.map((item, index) => {
        const matchedItem = findMatchedItem(item.name);
        const hasPacks = matchedItem?.packs && matchedItem.packs.length > 0;
        return (
          <View key={index} style={[styles.itemCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Type Item Name..." placeholderTextColor={theme.textMuted} value={item.name} onChangeText={(val) => handleItemChange(index, 'name', val)} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }]}>Qty</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="0" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={item.quantity} onChangeText={(val) => handleItemChange(index, 'quantity', val)} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }]}>Price (₦)</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={item.price} onChangeText={(val) => handleItemChange(index, 'price', val)} />
              </View>
            </View>
            {hasPacks && (
              <View style={styles.packRow}>
                <Text style={{ fontSize: 12, width: '100%', marginBottom: 4, color: theme.textMuted }}>Sell by:</Text>
                <TouchableOpacity style={[styles.packBtn, { backgroundColor: theme.background, borderColor: theme.border }, item.unitMultiplier === 1 && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleUnitChange(index, 1, 'Piece')}>
                  <Text style={[{ fontSize: 12, color: theme.text, fontWeight: '500' }, item.unitMultiplier === 1 && { color: '#fff' }]}>Piece</Text>
                </TouchableOpacity>
                {matchedItem.packs.map(p => (
                  <TouchableOpacity key={p.id} style={[styles.packBtn, { backgroundColor: theme.background, borderColor: theme.border }, item.unitMultiplier === p.multiplier && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleUnitChange(index, p.multiplier, p.pack_name)}>
                    <Text style={[{ fontSize: 12, color: theme.text, fontWeight: '500' }, item.unitMultiplier === p.multiplier && { color: '#fff' }]}>{p.pack_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {items.length > 1 && (
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                <Ionicons name="trash" size={16} color={theme.danger} />
                <Text style={{ color: theme.danger, fontSize: 12 }}>Remove Item</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.addBtn} onPress={addItem}>
        <Ionicons name="add-circle" size={20} color={theme.primary} />
        <Text style={{ color: theme.primary, fontWeight: '600' }}>Add Another Item</Text>
      </TouchableOpacity>

      <View style={[styles.totalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={{ fontSize: 16, color: theme.textMuted }}>Total Amount</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>₦{totalAmount.toLocaleString()}</Text>
      </View>

      {paymentStatus === 'PARTIAL' && (
        <View style={[styles.partialCard, { backgroundColor: theme.isDark ? '#451a03' : '#FFF9E5', borderColor: theme.warning }]}>
          <Text style={[{ fontSize: 14, fontWeight: '600', color: theme.warning, marginBottom: 8 }]}>How much are they paying?</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Enter Amount Paid (₦) *" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={amountPaid} onChangeText={setAmountPaid} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: theme.textMuted }}>Balance Remaining:</Text>
            <Text style={{ color: theme.danger, fontWeight: 'bold' }}>₦{Math.max(0, balanceRemaining).toLocaleString()}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.success }]} onPress={handleSubmit} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{loading ? 'Recording...' : 'Record Sale'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── SALES HISTORY SCREEN ──────────────────────────────────────────
export const SalesHistoryScreen = () => {
  const { theme } = useTheme();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSales = async () => {
    try {
      const res = await api.get('/sales');
      const fetchedSales = res.data?.data?.sales || res.data?.data || res.data || [];
      setSales(Array.isArray(fetchedSales) ? fetchedSales : []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load sales history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSales(); };

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
      {sales.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>No sales recorded yet.</Text>
      ) : (
        sales.map(sale => (
          <View key={sale.id} style={[styles.saleCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{sale.customer_name}</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary }}>₦{Number(sale.total_price).toLocaleString()}</Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>{sale.item_name}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>{new Date(sale.sale_date).toLocaleDateString()} {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }, sale.payment_status === 'PAID' ? { backgroundColor: theme.badgeGreen } : sale.payment_status === 'PARTIAL' ? { backgroundColor: theme.badgeOrange } : { backgroundColor: theme.badgeRed }]}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.text }}>{sale.payment_status}</Text>
              </View>
            </View>
            {sale.payment_status === 'PARTIAL' && (
              <Text style={{ fontSize: 12, color: theme.danger, marginTop: 8, fontWeight: '600' }}>Balance: ₦{Number(sale.balance_remaining).toLocaleString()}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

// ─── INVENTORY SCREEN (UPDATED WITH TOTAL VALUE) ───────────────────
export const InventoryScreen = () => {
  const { theme } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      const fetchedItems = res.data?.data?.items || res.data?.data || res.data || [];
      setInventory(Array.isArray(fetchedItems) ? fetchedItems : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchInventory(); };

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  // Calculate total inventory value
  const totalValue = inventory.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.selling_price));
  }, 0);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* ★ NEW: Total Inventory Value Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Total Inventory Value</Text>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>₦{totalValue.toLocaleString()}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>All Items</Text>

      {inventory.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>No items in inventory</Text>
      ) : (
        inventory.map(item => {
          const itemValue = Number(item.quantity) * Number(item.selling_price);
          
          return (
            <View key={item.id} style={[styles.invCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{item.item_name}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {item.quantity} {item.base_unit || 'Pieces'} @ ₦{Number(item.selling_price).toLocaleString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.success }}>₦{itemValue.toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Total Value</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

// ─── DEBTORS SCREEN ──────────────────────────────────────────
export const DebtorsScreen = () => {
  const { theme } = useTheme();
  const [debtors, setDebtors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDebtors = async () => {
    try {
      const res = await api.get('/debtors');
      if (res.data?.success) {
        setDebtors(res.data.data.debtors || []);
        setSummary(res.data.data.summary || null);
      }
    } catch (error) {
      console.error('Debtors fetch error:', error);
      Alert.alert('Error', 'Failed to load debtors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDebtors(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchDebtors(); };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return Alert.alert('Error', 'Enter a valid payment amount');
    setIsSubmitting(true);
    try {
      const res = await api.post(`/debtors/${selectedDebtor.id}/payment`, {
        amount: parseFloat(paymentAmount), notes: paymentNotes, paymentMethod: 'CASH'
      });
      if (res.data?.success) {
        Alert.alert('Success', `Payment recorded!`);
        setSelectedDebtor(null); setPaymentAmount(''); setPaymentNotes('');
        fetchDebtors();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
      {summary && (
        <View style={[styles.summaryCard, { backgroundColor: theme.danger }]}>
          <Text style={{ color: theme.isDark ? '#FEE2E2' : '#FFD1D1', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Total Outstanding</Text>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>₦{summary.totalOutstanding?.toLocaleString() || '0'}</Text>
          <Text style={{ color: theme.isDark ? '#FEE2E2' : '#FFD1D1', fontSize: 12, marginTop: 8 }}>{summary.overdueCount || 0} overdue accounts</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Debtor List</Text>

      {debtors.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>No debtors found. Great!</Text>
      ) : (
        debtors.map(debtor => {
          const isOverdue = debtor.due_date && new Date(debtor.due_date) < new Date() && Number(debtor.balance_remaining) > 0;

          return (
            <View key={debtor.id} style={[styles.debtorCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.primary }}>{debtor.customer_name?.charAt(0) || 'D'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{debtor.customer_name}</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>{debtor.customer_phone || 'No phone'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.danger }}>₦{Number(debtor.balance_remaining).toLocaleString()}</Text>
                  {isOverdue ? (
                    <View style={{ backgroundColor: theme.badgeRed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.danger }}>OVERDUE</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', marginTop: 4 }}>{debtor.status}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={[{ flexDirection: 'row', backgroundColor: theme.success, padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 }]} onPress={() => setSelectedDebtor(debtor)}>
                <Ionicons name="cash-outline" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <Modal visible={!!selectedDebtor} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: theme.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Record Payment</Text>
              <TouchableOpacity onPress={() => setSelectedDebtor(null)}><Ionicons name="close" size={24} color={theme.textMuted} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 16 }}>{selectedDebtor?.customer_name} owes ₦{Number(selectedDebtor?.balance_remaining).toLocaleString()}</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Amount (₦)" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} />
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Notes (Optional)" placeholderTextColor={theme.textMuted} value={paymentNotes} onChangeText={setPaymentNotes} />
            <TouchableOpacity style={[{ backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }, isSubmitting && { opacity: 0.7 }]} onPress={handleRecordPayment} disabled={isSubmitting}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{isSubmitting ? 'Recording...' : 'Confirm Payment'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  itemCard: { padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', marginTop: 8 },
  packRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  packBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginBottom: 16 },
  totalCard: { padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  invCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1 },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 16, marginTop: 16 },
  debtorCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  saleCard: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  partialCard: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
});