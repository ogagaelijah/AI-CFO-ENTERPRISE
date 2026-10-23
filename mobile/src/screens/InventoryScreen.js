import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PAGE_SIZES = [10, 25, 50, 75, 100];

export const InventoryScreen = () => {
  const { theme } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInventory = async (pageNum = 1, currentLimit = limit) => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory?page=${pageNum}&limit=${currentLimit}`);
      const fetchedItems = res.data?.data?.items || res.data?.data || res.data || [];
      const pagination = res.data?.data?.pagination;

      setInventory(Array.isArray(fetchedItems) ? fetchedItems : []);
      
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalItems(pagination.total || fetchedItems.length);
      } else {
        setTotalPages(1);
        setTotalItems(fetchedItems.length);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchInventory(page, limit); 
  }, [page, limit]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchInventory(page, limit); 
  };

  const handleLimitChange = (newLimit) => {
    if (newLimit === limit) return;
    setLimit(newLimit);
    setPage(1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(prev => prev - 1);
  };

  // Filter inventory locally
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    const lowerQuery = searchQuery.toLowerCase();
    return inventory.filter(item => 
      item.item_name?.toLowerCase().includes(lowerQuery)
    );
  }, [inventory, searchQuery]);

  const renderPaginationControls = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border, marginTop: 8 }}>
      <TouchableOpacity 
        onPress={handlePrevPage} 
        disabled={page === 1}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 8, opacity: page === 1 ? 0.3 : 1 }}
      >
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Prev</Text>
      </TouchableOpacity>
      
      <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '600' }}>
        Page {page} of {totalPages} ({totalItems} total)
      </Text>
      
      <TouchableOpacity 
        onPress={handleNextPage} 
        disabled={page >= totalPages}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 8, opacity: page >= totalPages ? 0.3 : 1 }}
      >
        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Next</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  if (loading && inventory.length === 0) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const totalValue = inventory.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.selling_price));
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Search & Filter Bar */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 8, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, marginBottom: 12 }}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: theme.text }}
            placeholder="Search current page..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Page Size Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>Items per page:</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PAGE_SIZES.map(size => (
              <TouchableOpacity
                key={size}
                style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg }, limit === size && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => handleLimitChange(size)}
              >
                <Text style={[{ fontSize: 11, fontWeight: 'bold', color: theme.textMuted }, limit === size && { color: '#fff' }]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <FlatList
        style={{ flex: 1, padding: 16 }}
        data={filteredInventory}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListFooterComponent={renderPaginationControls}
        ListHeaderComponent={
          <>
            <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Total Inventory Value</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>₦{totalValue.toLocaleString()}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Items</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>
            {searchQuery ? 'No items match your search.' : 'No items in inventory'}
          </Text>
        }
        renderItem={({ item }) => {
          const itemValue = Number(item.quantity) * Number(item.selling_price);
          return (
            <View style={[styles.invCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  invCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1 },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 16, marginTop: 16 },
});