import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PAGE_SIZES = [10, 25, 50, 75, 100];

export const InventoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Summary Data State (for the new Web-style header)
  const [summaryData, setSummaryData] = useState(null);

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
      // 1. Fetch the paginated list for the screen
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

      // 2. Fetch the dashboard summary to get the exact Web stats & low stock list
      try {
        const dashRes = await api.get(`/dashboard/summary?_t=${Date.now()}`);
        if (dashRes.data?.success && dashRes.data?.data?.kpis?.inventory) {
          setSummaryData(dashRes.data.data.kpis.inventory);
        }
      } catch (dashErr) {
        console.log("Could not load inventory summary stats", dashErr.message);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    // Refresh when the screen comes back into focus (after adding/editing)
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInventory(page, limit);
    });
    return unsubscribe;
  }, [navigation, page, limit]);

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

  if (loading && inventory.length === 0) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  // Fallback calculations if the summary API failed, based ONLY on the current page
  const fallbackTotalValue = inventory.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.selling_price)), 0);
  const fallbackTotalQty = inventory.reduce((sum, item) => sum + Number(item.quantity), 0);
  const fallbackTotalProfit = inventory.reduce((sum, item) => sum + (Number(item.quantity) * (Number(item.selling_price) - Number(item.cost_price))), 0);

  // Use actual summary data from backend if available (which matches Web)
  const displayTotalItems = summaryData?.total_items !== undefined ? summaryData.total_items : totalItems;
  const displayTotalQty = summaryData?.total_quantity !== undefined ? summaryData.total_quantity : fallbackTotalQty;
  const displayTotalValue = summaryData?.total !== undefined ? summaryData.total : fallbackTotalValue;
  const displayProfit = summaryData?.total_profit !== undefined ? summaryData.total_profit : fallbackTotalProfit;
  const displayLowStockCount = summaryData?.lowStock !== undefined ? summaryData.lowStock : 0;
  const displayLowStockItems = summaryData?.lowStockItems || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header: Title */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>Inventory</Text>
        <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Stock on hand and valuation</Text>
      </View>

      {/* Search & Filter Bar */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 8, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, marginBottom: 12 }}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: theme.text }}
            placeholder="Search inventory..."
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
      </View>

      <FlatList
        style={{ flex: 1, paddingHorizontal: 16 }}
        data={filteredInventory}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListFooterComponent={renderPaginationControls}
        contentContainerStyle={{ paddingBottom: 100 }} // Space for the FAB
        ListHeaderComponent={
          <>
            {/* ─── WEB-STYLE LOW STOCK ALERT BANNER ─── */}
            {displayLowStockCount > 0 && (
              <View style={{ backgroundColor: theme.isDark ? '#3f2a00' : '#fffbeb', borderColor: theme.warning, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="warning" size={18} color={theme.warning} />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.warning, marginLeft: 6 }}>
                    {displayLowStockCount} items below reorder level
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>
                  Consider reordering soon to avoid stockouts.
                </Text>
                
                {/* List the actual items inline just like the Web */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {displayLowStockItems.slice(0, 10).map((item, idx) => (
                    <View key={item.id || idx} style={{ backgroundColor: theme.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ fontSize: 12, color: theme.warning, fontWeight: '600' }}>
                        {item.item_name} ({item.quantity})
                      </Text>
                    </View>
                  ))}
                  {displayLowStockItems.length > 10 && (
                    <Text style={{ fontSize: 12, color: theme.textMuted, alignSelf: 'center' }}>+{displayLowStockItems.length - 10} more</Text>
                  )}
                </View>
              </View>
            )}

            {/* ─── WEB-STYLE 4-CARD GRID ─── */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
              
              {/* Card 1: Total Items */}
              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#1e293b' : '#eef2ff', borderColor: theme.primary + '40' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#818cf8' : '#4f46e5', fontWeight: '600' }}>Total Items</Text>
                  <Ionicons name="cube-outline" size={18} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.primary, marginTop: 8 }}>{displayTotalItems}</Text>
              </View>

              {/* Card 2: Total Quantity */}
              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#1e1b4b' : '#f5f3ff', borderColor: '#8b5cf640' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#a78bfa' : '#7c3aed', fontWeight: '600' }}>Total Qty</Text>
                  <Ionicons name="layers-outline" size={18} color="#8b5cf6" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#8b5cf6', marginTop: 8 }}>{displayTotalQty}</Text>
              </View>

              {/* Card 3: Inventory Value */}
              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#064e3b' : '#ecfdf5', borderColor: '#10b98140' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#34d399' : '#059669', fontWeight: '600' }}>Total Value</Text>
                  <Ionicons name="cash-outline" size={18} color="#10b981" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10b981', marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                  ₦{Number(displayTotalValue).toLocaleString()}
                </Text>
              </View>

              {/* Card 4: Potential Profit */}
              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#3b0764' : '#faf5ff', borderColor: '#d8b4fe40' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#d8b4fe' : '#9333ea', fontWeight: '600' }}>Potential Profit</Text>
                  <Ionicons name="trending-up" size={18} color="#d8b4fe" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d8b4fe', marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                  ₦{Number(displayProfit).toLocaleString()}
                </Text>
              </View>

            </View>

            {/* Page size / List Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0 }]}>All Items</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>Show:</Text>
                {PAGE_SIZES.map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg }, limit === size && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => handleLimitChange(size)}
                  >
                    <Text style={[{ fontSize: 11, fontWeight: 'bold', color: theme.textMuted }, limit === size && { color: '#fff' }]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
            <TouchableOpacity 
              style={[styles.invCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => navigation.navigate('AddEditInventory', { item })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{item.item_name}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {item.quantity} {item.base_unit || 'Pieces'} @ ₦{Number(item.selling_price).toLocaleString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.success }}>₦{itemValue.toLocaleString()}</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Total Value</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} style={{ alignSelf: 'center' }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('AddEditInventory')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  invCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1 },
  statCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
});