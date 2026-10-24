import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, RefreshControl, FlatList, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PAGE_SIZES = [10, 25, 50, 75, 100];

export const PurchasesHistoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  
  const [purchases, setPurchases] = useState([]);
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
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const fetchPurchases = async (pageNum = 1, currentLimit = limit) => {
    setLoading(true);
    try {
      // Server-side pagination
      const res = await api.get(`/purchases?page=${pageNum}&limit=${currentLimit}`);
      if (res.data?.success) {
        setPurchases(res.data.data.purchases || []);
        const pagination = res.data.data.pagination;
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotalItems(pagination.total || 0);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load purchases history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchPurchases(page, limit); 
  }, [page, limit]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchPurchases(page, limit); 
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

  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    const lowerQuery = searchQuery.toLowerCase();
    return purchases.filter(p => 
      p.supplier_name?.toLowerCase().includes(lowerQuery) ||
      p.item_name?.toLowerCase().includes(lowerQuery)
    );
  }, [purchases, searchQuery]);

  const handleViewPurchase = (purchase) => {
    let items = [];
    if (purchase.items) {
      try { items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items; } catch (e) { items = []; }
    }
    setSelectedPurchase({ ...purchase, items });
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

  if (loading && purchases.length === 0) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Purchases History</Text>
          <View style={{ width: 28 }} />
        </View>

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
          data={filteredPurchases}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListFooterComponent={renderPaginationControls}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>
              {searchQuery ? 'No purchases match your search.' : 'No purchases recorded yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.purchaseCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleViewPurchase(item)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{item.supplier_name}</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.warning }}>₦{Number(item.total_cost).toLocaleString()}</Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>{item.item_name}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>{new Date(item.purchase_date).toLocaleDateString()}</Text>
                <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }, item.payment_status === 'PAID' ? { backgroundColor: theme.badgeGreen } : item.payment_status === 'PARTIAL' ? { backgroundColor: theme.badgeOrange } : { backgroundColor: theme.badgeRed }]}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.text }}>{item.payment_status}</Text>
                </View>
              </View>
              {item.payment_status === 'PARTIAL' && (
                <Text style={{ fontSize: 12, color: theme.danger, marginTop: 8, fontWeight: '600' }}>Balance: ₦{Number(item.balance_remaining).toLocaleString()}</Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Tap to view details</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ─── VIEW PURCHASE MODAL ─── */}
      <Modal visible={!!selectedPurchase} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', padding: 20 }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Purchase Details</Text>
              <TouchableOpacity onPress={() => setSelectedPurchase(null)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedPurchase && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Supplier</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{selectedPurchase.supplier_name || 'Unknown'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Date</Text>
                    <Text style={{ fontSize: 14, color: theme.text }}>{new Date(selectedPurchase.purchase_date).toLocaleDateString()}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginTop: 16, marginBottom: 12 }}>Items Purchased</Text>
                <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: theme.inputBg, padding: 12 }}>
                    <Text style={{ flex: 2, fontSize: 12, fontWeight: 'bold', color: theme.textMuted }}>Item</Text>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textAlign: 'center' }}>Qty</Text>
                    <Text style={{ flex: 1.5, fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textAlign: 'right' }}>Unit Cost</Text>
                    <Text style={{ flex: 1.5, fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textAlign: 'right' }}>Total</Text>
                  </View>
                  
                  {selectedPurchase.items.length === 0 ? (
                    <Text style={{ padding: 16, textAlign: 'center', color: theme.textMuted }}>No item breakdown available.</Text>
                  ) : (
                    selectedPurchase.items.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                        <Text style={{ flex: 2, fontSize: 14, color: theme.text }}>{item.name}</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: theme.text, textAlign: 'center' }}>{item.quantity}</Text>
                        <Text style={{ flex: 1.5, fontSize: 14, color: theme.text, textAlign: 'right' }}>₦{Number(item.unitCost).toLocaleString()}</Text>
                        <Text style={{ flex: 1.5, fontSize: 14, fontWeight: 'bold', color: theme.text, textAlign: 'right' }}>₦{(item.quantity * item.unitCost).toLocaleString()}</Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={{ marginTop: 16, padding: 16, backgroundColor: theme.background, borderRadius: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Total Purchase Cost</Text>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.warning }}>₦{Number(selectedPurchase.total_cost).toLocaleString()}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: theme.textMuted }}>Amount Paid</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.success }}>₦{Number(selectedPurchase.amount_paid || 0).toLocaleString()}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: theme.textMuted }}>Balance Owed</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.danger }}>₦{Number(selectedPurchase.balance_remaining || 0).toLocaleString()}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: theme.textMuted }}>Status</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: selectedPurchase.payment_status === 'PAID' ? theme.success : theme.danger }}>{selectedPurchase.payment_status}</Text>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: 'bold' },
  purchaseCard: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
});