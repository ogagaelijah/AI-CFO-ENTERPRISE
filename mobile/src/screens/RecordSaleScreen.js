// mobile/src/screens/RecordSaleScreen.js
// v3.0.0-prod — Prominent pack selector buttons (Carton / Half / Quarter).
//               Sends unitMultiplier + soldUnit to backend.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';

export const RecordSaleScreen = ({ navigation }) => {
  const { user, isReadOnly } = useAuth();
  const { addSaleToQueue } = useOffline();
  const { theme } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [amountPaid, setAmountPaid] = useState('');
  const [dueDays, setDueDays] = useState(3); 
  const [items, setItems] = useState([{ name: '', quantity: '', price: '', unitMultiplier: 1, soldUnit: 'Piece', inventoryId: null, costPrice: '' }]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  useEffect(() => { 
    if (!isReadOnly) {
      fetchInventory(); 
    } else {
      setLoading(false);
    }
  }, [isReadOnly]);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory?limit=1000');
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
        newItems[index].costPrice = String(matchedItem.cost_price || '');
        newItems[index].unitMultiplier = 1;
        newItems[index].soldUnit = 'Piece';
      } else {
        newItems[index].inventoryId = null;
      }
    }
    setItems(newItems);
  };

  // ★ UPDATED: pack selector sets multiplier AND price from pack data
  const handlePackSelect = (index, packName, multiplier, packPrice) => {
    const newItems = [...items];
    const matchedItem = findMatchedItem(newItems[index].name);
    
    newItems[index].unitMultiplier = multiplier;
    newItems[index].soldUnit = packName;
    
    if (multiplier === 1) {
      // Base unit — use base selling price
      newItems[index].price = String(matchedItem?.selling_price || '');
      newItems[index].costPrice = String(matchedItem?.cost_price || '');
    } else {
      // Pack — use pack-specific price and pack-adjusted cost
      newItems[index].price = String(packPrice || '');
      newItems[index].costPrice = String((matchedItem?.cost_price || 0) * multiplier);
    }
    
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { name: '', quantity: '', price: '', unitMultiplier: 1, soldUnit: 'Piece', inventoryId: null, costPrice: '' }]);
  const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const calculateTotal = () => items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);

  const openItemSelector = (index) => {
    setActiveItemIndex(index);
    setSearchQuery('');
    setShowItemModal(true);
  };

  const handleSelectItem = (selectedInventoryItem) => {
    if (activeItemIndex === null) return;
    const newItems = [...items];
    newItems[activeItemIndex].name = selectedInventoryItem.item_name;
    newItems[activeItemIndex].inventoryId = selectedInventoryItem.id;
    newItems[activeItemIndex].price = String(selectedInventoryItem.selling_price || '');
    newItems[activeItemIndex].costPrice = String(selectedInventoryItem.cost_price || '');
    newItems[activeItemIndex].unitMultiplier = 1;
    newItems[activeItemIndex].soldUnit = 'Piece';
    setItems(newItems);
    setShowItemModal(false);
    setActiveItemIndex(null);
  };

  const filteredInventory = inventory.filter(item => 
    item.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (isReadOnly) return Alert.alert('Expired', 'Your subscription has expired.');
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
        customerPhone: customerPhone.trim() || null,
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
          navigation.navigate('Main', { screen: 'History' });
        }
      } catch (networkError) {
        if (networkError.message.includes('Network Error')) {
          await addSaleToQueue(payload);
          Alert.alert('Saved Offline', 'No network. Sale saved and will sync when you are back online.');
          navigation.navigate('Main', { screen: 'History' });
          return; 
        } else {
          throw networkError;
        }
      }
      
      setCustomerName('');
      setCustomerPhone('');
      setItems([{ name: '', quantity: '', price: '', unitMultiplier: 1, soldUnit: 'Piece', inventoryId: null, costPrice: '' }]);
      setAmountPaid('');
      setPaymentStatus('PAID');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (loading && inventory.length === 0 && !isReadOnly) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

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
            You cannot record new sales while your account is in read-only mode. Please renew your plan to continue.
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer Details</Text>
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Customer Name *" placeholderTextColor={theme.textMuted} value={customerName} onChangeText={setCustomerName} />
      
      <TextInput 
        style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
        placeholder="Phone Number (Optional)" 
        placeholderTextColor={theme.textMuted} 
        keyboardType="phone-pad"
        value={customerPhone} 
        onChangeText={setCustomerPhone} 
      />
      
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
            <TouchableOpacity 
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center' }]} 
              onPress={() => openItemSelector(index)}
            >
              <Text style={{ color: item.name ? theme.text : theme.textMuted }}>
                {item.name || "Select Item..."}
              </Text>
            </TouchableOpacity>

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
            
            {/* ★ NEW: PROMINENT PACK BUTTONS */}
            {hasPacks && (
              <View style={styles.packRow}>
                <Text style={{ fontSize: 12, width: '100%', marginBottom: 6, color: theme.textMuted, fontWeight: '600' }}>Sell by:</Text>
                
                {/* Base unit button */}
                <TouchableOpacity 
                  style={[
                    styles.packBtn, 
                    { backgroundColor: theme.background, borderColor: theme.border }, 
                    item.unitMultiplier === 1 && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]} 
                  onPress={() => handlePackSelect(index, 'Piece', 1, matchedItem.selling_price)}
                >
                  <Text style={[{ fontSize: 12, color: theme.text, fontWeight: '500' }, item.unitMultiplier === 1 && { color: '#fff' }]}>
                    1 {matchedItem.base_unit || 'Piece'} — ₦{Number(matchedItem.selling_price || 0).toLocaleString()}
                  </Text>
                </TouchableOpacity>
                
                {/* Pack buttons */}
                {matchedItem.packs.map(p => (
                  <TouchableOpacity 
                    key={p.id || p.pack_name} 
                    style={[
                      styles.packBtn, 
                      { backgroundColor: theme.background, borderColor: theme.border }, 
                      item.unitMultiplier === p.multiplier && item.soldUnit === p.pack_name && { backgroundColor: '#2563EB', borderColor: '#2563EB' }
                    ]} 
                    onPress={() => handlePackSelect(index, p.pack_name, p.multiplier, p.selling_price)}
                  >
                    <Text style={[
                      { fontSize: 12, color: theme.text, fontWeight: '500' }, 
                      item.unitMultiplier === p.multiplier && item.soldUnit === p.pack_name && { color: '#fff' }
                    ]}>
                      {p.pack_name} ({p.multiplier} {matchedItem.base_unit}) — ₦{Number(p.selling_price || 0).toLocaleString()}
                    </Text>
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

      <Modal visible={showItemModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 }}>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Select Item</Text>
                <TouchableOpacity onPress={() => setShowItemModal(false)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <TextInput 
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
                placeholder="Search inventory..." 
                placeholderTextColor={theme.textMuted} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                autoFocus={true}
              />

              <FlatList
                data={filteredInventory}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>No items found.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between' }}
                    onPress={() => handleSelectItem(item)}
                  >
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{item.item_name}</Text>
                      <Text style={{ fontSize: 12, color: theme.textMuted }}>{item.quantity} {item.base_unit || 'Pieces'} in stock</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary }}>₦{Number(item.selling_price).toLocaleString()}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
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
  packRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  packBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginBottom: 16 },
  totalCard: { padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  partialCard: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
});