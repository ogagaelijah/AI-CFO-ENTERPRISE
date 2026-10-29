// mobile/src/screens/AddEditInventoryScreen.js
// v2.3.0-prod — Allows Item Name editing and decimals.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const AddEditInventoryScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const existingItem = route.params?.item;
  const isEditing = !!existingItem;

  const [itemName, setItemName] = useState(existingItem?.item_name || '');
  const [quantity, setQuantity] = useState(existingItem?.quantity?.toString() || '');
  const [costPrice, setCostPrice] = useState(existingItem?.cost_price?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(existingItem?.selling_price?.toString() || '');
  const [reorderLevel, setReorderLevel] = useState(existingItem?.reorder_level?.toString() || '5');
  const [baseUnit, setBaseUnit] = useState(existingItem?.base_unit || 'Piece');
  
  const [packs, setPacks] = useState(
    (existingItem?.packs || []).map(p => ({
      packName: p.pack_name || p.packName || '',
      multiplier: p.multiplier?.toString() || '',
      sellingPrice: (p.selling_price ?? p.sellingPrice ?? '').toString()
    }))
  );
  
  const [loading, setLoading] = useState(false);

  const handleAddPack = () => {
    setPacks([...packs, { packName: '', multiplier: '', sellingPrice: '' }]);
  };

  const handleRemovePack = (index) => {
    setPacks(packs.filter((_, i) => i !== index));
  };

  const handlePackChange = (index, field, value) => {
    const newPacks = [...packs];
    newPacks[index][field] = value;
    setPacks(newPacks);
  };

  const handleSave = async () => {
    if (!itemName.trim()) return Alert.alert('Error', 'Item name is required');
    if (!quantity || parseFloat(quantity) < 0) return Alert.alert('Error', 'Valid quantity is required');
    if (!costPrice || parseFloat(costPrice) < 0) return Alert.alert('Error', 'Valid cost price is required');
    if (!sellingPrice || parseFloat(sellingPrice) < 0) return Alert.alert('Error', 'Valid selling price is required');

    const validPacks = packs
      .filter(p => p.packName.trim() && parseFloat(p.multiplier) > 0)
      .map(p => ({
        packName: p.packName.trim(),
        multiplier: parseFloat(p.multiplier),
        sellingPrice: parseFloat(p.sellingPrice) || 0
      }));

    setLoading(true);
    try {
      if (isEditing) {
        const qtyDiff = parseFloat(quantity) - (existingItem.quantity || 0);
        
        if (qtyDiff !== 0) {
          await api.patch(`/inventory/${existingItem.id}/stock`, {
            adjustment: qtyDiff,
            reason: 'Manual stock update from mobile app'
          });
        }

        await api.put(`/inventory/${existingItem.id}`, {
          itemName: itemName.trim(),
          costPrice: parseFloat(costPrice),
          sellingPrice: parseFloat(sellingPrice),
          reorderLevel: parseFloat(reorderLevel),
          baseUnit: baseUnit.trim(),
          packs: validPacks
        });

        Alert.alert('Success', 'Item updated successfully');
      } else {
        await api.post('/inventory', {
          itemName: itemName.trim(),
          quantity: parseFloat(quantity),
          costPrice: parseFloat(costPrice),
          sellingPrice: parseFloat(sellingPrice),
          reorderLevel: parseFloat(reorderLevel),
          baseUnit: baseUnit.trim(),
          packs: validPacks
        });

        Alert.alert('Success', 'Item added successfully');
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to permanently delete "${itemName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete(`/inventory/${existingItem.id}`);
              Alert.alert('Deleted', 'Item removed from inventory');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete item');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{isEditing ? 'Edit Item' : 'Add New Item'}</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Item Name *</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder="e.g. Milo Sachet" 
          placeholderTextColor={theme.textMuted} 
          value={itemName} 
          onChangeText={setItemName} 
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Quantity *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="0" 
              placeholderTextColor={theme.textMuted} 
              keyboardType="numeric" 
              value={quantity} 
              onChangeText={setQuantity} 
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.label, { color: theme.text }]}>Base Unit *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="e.g. Roll" 
              placeholderTextColor={theme.textMuted} 
              value={baseUnit} 
              onChangeText={setBaseUnit} 
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Cost Price (₦) *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="0.00" 
              placeholderTextColor={theme.textMuted} 
              keyboardType="numeric" 
              value={costPrice} 
              onChangeText={setCostPrice} 
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.label, { color: theme.text }]}>Selling Price (₦) *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="0.00" 
              placeholderTextColor={theme.textMuted} 
              keyboardType="numeric" 
              value={sellingPrice} 
              onChangeText={setSellingPrice} 
            />
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Reorder Level Alert</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder="5" 
          placeholderTextColor={theme.textMuted} 
          keyboardType="numeric" 
          value={reorderLevel} 
          onChangeText={setReorderLevel} 
        />

        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 20 }}>
          <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>Wholesale Packs (Optional)</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
            e.g. Carton (20 Rolls), Half Carton (10 Rolls), Quarter Carton (5 Rolls)
          </Text>

          {packs.length === 0 && (
            <Text style={{ fontSize: 12, color: theme.textMuted, fontStyle: 'italic', marginBottom: 8 }}>
              No packs defined yet.
            </Text>
          )}

          {packs.map((pack, index) => (
            <View key={index} style={[styles.packRow, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <View style={{ flex: 2, marginRight: 6 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 2 }}>Pack Name</Text>
                <TextInput
                  style={[styles.packInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                  placeholder="Carton"
                  placeholderTextColor={theme.textMuted}
                  value={pack.packName}
                  onChangeText={(v) => handlePackChange(index, 'packName', v)}
                />
              </View>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 2 }}>Qty</Text>
                <TextInput
                  style={[styles.packInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                  placeholder="20"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={pack.multiplier}
                  onChangeText={(v) => handlePackChange(index, 'multiplier', v)}
                />
              </View>
              <View style={{ flex: 1.5, marginRight: 6 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 2 }}>Price ₦</Text>
                <TextInput
                  style={[styles.packInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                  placeholder="35000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={pack.sellingPrice}
                  onChangeText={(v) => handlePackChange(index, 'sellingPrice', v)}
                />
              </View>
              <TouchableOpacity
                onPress={() => handleRemovePack(index)}
                style={{ padding: 6, marginTop: 12 }}
              >
                <Ionicons name="trash" size={18} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addPackBtn, { borderColor: theme.primary }]}
            onPress={handleAddPack}
          >
            <Ionicons name="add" size={18} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '600', marginLeft: 6 }}>Add Wholesale Pack</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              {isEditing ? 'Save Changes' : 'Add Item'}
            </Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity 
            style={[styles.deleteBtn, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]} 
            onPress={handleDelete} 
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
            <Text style={{ color: theme.danger, fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Delete Item</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: 'row' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  deleteBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 40, borderWidth: 1 },
  packRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 8, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  packInput: { padding: 8, borderRadius: 6, borderWidth: 1, fontSize: 13 },
  addPackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 8, marginTop: 8, marginBottom: 8 },
});