import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, RefreshControl, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 25, 50, 75, 100];

export const DebtorsScreen = () => {
  const { theme } = useTheme();
  const { isReadOnly } = useAuth();
  const [debtors, setDebtors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal State
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDebtors = async (pageNum = 1, currentLimit = limit) => {
    setLoading(true);
    try {
      const res = await api.get(`/debtors?page=${pageNum}&limit=${currentLimit}`);
      if (res.data?.success) {
        const fetchedDebtors = res.data.data.debtors || [];
        const pagination = res.data.data.pagination;

        setDebtors(fetchedDebtors);
        setSummary(res.data.data.summary || null);
        
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotalItems(pagination.total || fetchedDebtors.length);
        } else {
          setTotalPages(1);
          setTotalItems(fetchedDebtors.length);
        }
      }
    } catch (error) {
      console.error('Debtors fetch error:', error);
      Alert.alert('Error', 'Failed to load debtors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchDebtors(page, limit); 
  }, [page, limit]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchDebtors(page, limit); 
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

  // Filter debtors locally
  const filteredDebtors = useMemo(() => {
    if (!searchQuery.trim()) return debtors;
    const lowerQuery = searchQuery.toLowerCase();
    return debtors.filter(debtor => 
      debtor.customer_name?.toLowerCase().includes(lowerQuery) ||
      debtor.customer_phone?.toLowerCase().includes(lowerQuery)
    );
  }, [debtors, searchQuery]);

  const handleRecordPayment = async () => {
    if (isReadOnly) return Alert.alert('Expired', 'Your subscription has expired.');
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return Alert.alert('Error', 'Enter a valid payment amount');
    setIsSubmitting(true);
    try {
      const res = await api.post(`/debtors/${selectedDebtor.id}/payment`, {
        amount: parseFloat(paymentAmount), notes: paymentNotes, paymentMethod: 'CASH'
      });
      if (res.data?.success) {
        Alert.alert('Success', `Payment recorded!`);
        setSelectedDebtor(null); setPaymentAmount(''); setPaymentNotes('');
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
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

  if (loading && debtors.length === 0) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

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
          data={filteredDebtors}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListFooterComponent={renderPaginationControls}
          ListHeaderComponent={
            <>
              {summary && (
                <View style={[styles.summaryCard, { backgroundColor: theme.danger }]}>
                  <Text style={{ color: theme.isDark ? '#FEE2E2' : '#FFD1D1', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Total Outstanding</Text>
                  <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>₦{summary.totalOutstanding?.toLocaleString() || '0'}</Text>
                  <Text style={{ color: theme.isDark ? '#FEE2E2' : '#FFD1D1', fontSize: 12, marginTop: 8 }}>{summary.overdueCount || 0} overdue accounts</Text>
                </View>
              )}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Debtor List</Text>
            </>
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>
              {searchQuery ? 'No debtors match your search.' : 'No debtors found. Great!'}
            </Text>
          }
          renderItem={({ item: debtor }) => {
            const isOverdue = debtor.due_date && new Date(debtor.due_date) < new Date() && Number(debtor.balance_remaining) > 0;
            return (
              <View style={[styles.debtorCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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
                
                {/* Record Payment Button (Hidden if read-only) */}
                {!isReadOnly && (
                  <TouchableOpacity style={[{ flexDirection: 'row', backgroundColor: theme.success, padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 }]} onPress={() => setSelectedDebtor(debtor)}>
                    <Ionicons name="cash-outline" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Record Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      </View>

      {/* Payment Modal (Still intact but unreachable if hidden) */}
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
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 16, marginTop: 16 },
  debtorCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
});