import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, RefreshControl, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PAGE_SIZES = [10, 25, 50, 75, 100];

export const SalesHistoryScreen = () => {
  const { theme } = useTheme();
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State
  const [selectedSale, setSelectedSale] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchSales = async (pageNum = 1, currentLimit = limit) => {
    setLoading(true);
    try {
      const res = await api.get(`/sales?page=${pageNum}&limit=${currentLimit}`);
      const fetchedSales = res.data?.data?.sales || [];
      const pagination = res.data?.data?.pagination;

      setSales(fetchedSales);
      
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalItems(pagination.total || fetchedSales.length);
      } else {
        setTotalPages(1);
        setTotalItems(fetchedSales.length);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load sales history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchSales(page, limit); 
  }, [page, limit]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchSales(page, limit); 
  };

  const handleLimitChange = (newLimit) => {
    if (newLimit === limit) return;
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when changing page size
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  };

  // Filter sales locally (only applies to the current page of 10 items)
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const lowerQuery = searchQuery.toLowerCase();
    return sales.filter(sale => 
      sale.customer_name?.toLowerCase().includes(lowerQuery) ||
      sale.item_name?.toLowerCase().includes(lowerQuery)
    );
  }, [sales, searchQuery]);

  const handleViewSale = async (saleId) => {
    setIsDetailLoading(true);
    setSelectedSale({ id: saleId });
    try {
      const res = await api.get(`/sales/${saleId}`);
      const saleData = res.data?.data || res.data;
      if (saleData.items && typeof saleData.items === 'string') {
        try { saleData.items = JSON.parse(saleData.items); } catch (e) { saleData.items = []; }
      }
      setSelectedSale(saleData);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      Alert.alert('Error', 'Failed to load sale details');
      setSelectedSale(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

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

  if (loading && sales.length === 0) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <>
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
          data={filteredSales}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListFooterComponent={renderPaginationControls}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>
              {searchQuery ? 'No sales match your search.' : 'No sales recorded yet.'}
            </Text>
          }
          renderItem={({ item: sale }) => (
            <TouchableOpacity 
              style={[styles.saleCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleViewSale(sale.id)}
              activeOpacity={0.7}
            >
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
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Tap to view items</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Read-Only Sale Detail Modal */}
      <Modal visible={!!selectedSale} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', padding: 20 }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Sale Details</Text>
              <TouchableOpacity onPress={() => setSelectedSale(null)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : selectedSale && selectedSale.customer_name ? (
              <FlatList
                data={selectedSale.items || []}
                keyExtractor={(item, idx) => idx.toString()}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      <View>
                        <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Customer</Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{selectedSale.customer_name || 'Walk-in'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Date</Text>
                        <Text style={{ fontSize: 14, color: theme.text }}>{new Date(selectedSale.sale_date).toLocaleDateString()}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginTop: 16, marginBottom: 12 }}>Items Sold</Text>
                    <View style={{ flexDirection: 'row', backgroundColor: theme.inputBg, padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                      <Text style={{ flex: 2, fontSize: 12, fontWeight: 'bold', color: theme.textMuted }}>Item</Text>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textAlign: 'center' }}>Qty</Text>
                      <Text style={{ flex: 1.5, fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textAlign: 'right' }}>Price</Text>
                      <Text style={{ flex: 1.5, fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textAlign: 'right' }}>Total</Text>
                    </View>
                  </>
                }
                ListEmptyComponent={<Text style={{ padding: 16, textAlign: 'center', color: theme.textMuted }}>No item details found.</Text>}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Text style={{ flex: 2, fontSize: 14, color: theme.text }}>{item.name}</Text>
                    <Text style={{ flex: 1, fontSize: 14, color: theme.text, textAlign: 'center' }}>{item.quantity}</Text>
                    <Text style={{ flex: 1.5, fontSize: 14, color: theme.text, textAlign: 'right' }}>₦{Number(item.sellingPrice || item.unitPrice || 0).toLocaleString()}</Text>
                    <Text style={{ flex: 1.5, fontSize: 14, fontWeight: 'bold', color: theme.text, textAlign: 'right' }}>₦{(item.quantity * (item.sellingPrice || item.unitPrice || 0)).toLocaleString()}</Text>
                  </View>
                )}
                ListFooterComponent={
                  <>
                    <View style={{ marginTop: 16, padding: 16, backgroundColor: theme.background, borderRadius: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Total Amount</Text>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.primary }}>₦{Number(selectedSale.total_price).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, color: theme.textMuted }}>Status</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: selectedSale.payment_status === 'PAID' ? theme.success : theme.danger }}>{selectedSale.payment_status}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginTop: 24, marginBottom: 12 }}>Notes</Text>
                    {selectedSale.notes ? (
                      <View style={{ padding: 16, backgroundColor: theme.inputBg, borderRadius: 8 }}>
                        <Text style={{ fontSize: 14, color: theme.text }}>{selectedSale.notes}</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 14, color: theme.textMuted }}>No notes added to this sale.</Text>
                    )}
                    <View style={{ height: 40 }} />
                  </>
                }
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saleCard: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
});