import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { queue, syncQueue } = useOffline();
  const { theme } = useTheme();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/summary');
      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.log("❌ Dashboard fetch error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        const unread = res.data.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.log("Error fetching unread count");
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchUnreadCount();
    }, [])
  );
  
  const onRefresh = () => { 
    setRefreshing(true); 
    fetchDashboard(); 
    fetchUnreadCount();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const kpis = data?.kpis || {};
  const revenueToday = kpis.revenue?.today || 0;
  const salesToday = kpis.sales?.today || 0;
  const profitToday = kpis.profit?.today || 0;
  const cashInToday = kpis.cash_in?.today || 0;
  const cashOutToday = kpis.cash_out?.today || 0;
  const inventoryValue = kpis.inventory?.total || 0;
  const lowStock = kpis.inventory?.lowStock || 0;

  const displayName = user?.businessName || user?.business_name || user?.fullName || 'User';
  const isCashier = user?.role === 'CASHIER';
  const canRecordFinance = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── SLEEK HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={[styles.avatarSmall, { backgroundColor: theme.primary }]}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Welcome back,</Text>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={[styles.iconBtn, { backgroundColor: theme.cardBg }]}>
          <Ionicons name="notifications-outline" size={22} color={theme.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {queue.length > 0 && (
        <TouchableOpacity onPress={syncQueue} style={[styles.syncBanner, { backgroundColor: theme.warning }]}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.syncText}>{queue.length} offline sale(s) pending. Tap to Sync.</Text>
        </TouchableOpacity>
      )}

      {/* ─── HERO CARD ─── */}
      {!isCashier ? (
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Total Revenue Today</Text>
            <Ionicons name="trending-up" size={24} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.heroValue}>₦{Number(revenueToday).toLocaleString()}</Text>
          
          <View style={styles.heroDivider} />
          
          <View style={styles.heroSubRow}>
            <View style={styles.heroSubItem}>
              <Text style={styles.heroSubLabel}>Sales Count</Text>
              <Text style={styles.heroSubValue}>{salesToday}</Text>
            </View>
            <View style={styles.heroSubItem}>
              <Text style={styles.heroSubLabel}>Profit Today</Text>
              <Text style={styles.heroSubValue}>₦{Number(profitToday).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>My Sales Today</Text>
            <Ionicons name="cart" size={24} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.heroValue}>{salesToday} Sales</Text>
          
          <View style={styles.heroDivider} />
          
          <View style={styles.heroSubRow}>
            <View style={styles.heroSubItem}>
              <Text style={styles.heroSubLabel}>Cash Received</Text>
              <Text style={styles.heroSubValue}>₦{Number(cashInToday).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ─── QUICK ACTIONS ─── */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={[styles.actionPill, { backgroundColor: theme.cardBg }]} onPress={() => navigation.navigate('Sales')}>
          <View style={[styles.actionIcon, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="cart-outline" size={20} color={theme.primary} />
          </View>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8 }}>Record Sale</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionPill, { backgroundColor: theme.cardBg }]} onPress={() => navigation.navigate('History')}>
          <View style={[styles.actionIcon, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="receipt-outline" size={20} color={theme.success} />
          </View>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8 }}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionPill, { backgroundColor: theme.cardBg }]} onPress={() => navigation.navigate('Inventory')}>
          <View style={[styles.actionIcon, { backgroundColor: theme.warning + '20' }]}>
            <Ionicons name="cube-outline" size={20} color={theme.warning} />
          </View>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8 }}>Inventory</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionPill, { backgroundColor: theme.cardBg }]} onPress={() => navigation.navigate('Debtors')}>
          <View style={[styles.actionIcon, { backgroundColor: theme.danger + '20' }]}>
            <Ionicons name="people-outline" size={20} color={theme.danger} />
          </View>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8 }}>Debtors</Text>
        </TouchableOpacity>
      </View>

      {/* ─── FINANCE SECTION (Redesigned) ─── */}
      {canRecordFinance && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 8 }]}>Business Management</Text>
          
          <View style={{ gap: 12, marginBottom: 24 }}>
            {/* Record Expense Card */}
            <TouchableOpacity 
              style={[styles.financeCardVertical, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('Expenses')}
              activeOpacity={0.7}
            >
              <View style={[styles.financeIconWrap, { backgroundColor: theme.danger + '15' }]}>
                <Ionicons name="trending-down" size={24} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Record Expense</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Log daily business costs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Record Purchase Card */}
            <TouchableOpacity 
              style={[styles.financeCardVertical, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('Purchases')}
              activeOpacity={0.7}
            >
              <View style={[styles.financeIconWrap, { backgroundColor: theme.warning + '15' }]}>
                <Ionicons name="cart" size={24} color={theme.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Record Purchase</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Add new stock from suppliers</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            {/* View Purchase History Card */}
            <TouchableOpacity 
              style={[styles.financeCardVertical, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('PurchasesHistory')}
              activeOpacity={0.7}
            >
              <View style={[styles.financeIconWrap, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="time" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Purchase History</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>View past supplier orders</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            {/* ★ NEW: Creditors Card */}
            <TouchableOpacity 
              style={[styles.financeCardVertical, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('Creditors')}
              activeOpacity={0.7}
            >
              <View style={[styles.financeIconWrap, { backgroundColor: theme.danger + '15' }]}>
                <Ionicons name="person" size={24} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Creditors</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Manage suppliers you owe</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ─── CASH FLOW ─── */}
      {!isCashier && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Cash Flow</Text>
          <View style={styles.cashFlowGrid}>
            <View style={[styles.cashCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.cashIconWrap, { backgroundColor: theme.isDark ? '#064E3B' : '#D1FAE5' }]}>
                <Ionicons name="arrow-down" size={20} color={theme.success} />
              </View>
              <Text style={[styles.cashLabel, { color: theme.textMuted }]}>Cash In</Text>
              <Text style={[styles.cashValue, { color: theme.text }]}>₦{Number(cashInToday).toLocaleString()}</Text>
            </View>

            <View style={[styles.cashCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.cashIconWrap, { backgroundColor: theme.isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                <Ionicons name="arrow-up" size={20} color={theme.danger} />
              </View>
              <Text style={[styles.cashLabel, { color: theme.textMuted }]}>Cash Out</Text>
              <Text style={[styles.cashValue, { color: theme.text }]}>₦{Number(cashOutToday).toLocaleString()}</Text>
            </View>
          </View>
        </>
      )}

      {/* ─── INVENTORY SNAPSHOT ─── */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Inventory Snapshot</Text>
      <TouchableOpacity 
        style={[styles.inventoryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate('Inventory')}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="cube" size={20} color={theme.primary} />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Total Value</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </View>
        
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
          ₦{Number(inventoryValue).toLocaleString()}
        </Text>

        {lowStock > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="warning" size={14} color={theme.warning} />
            <Text style={{ fontSize: 13, color: theme.warning, fontWeight: '600' }}>
              {lowStock} item(s) low on stock
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 30 },
  avatarSmall: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 10, borderRadius: 12, position: 'relative' },
  badge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'red', borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionPill: { width: '23%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  actionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  financeCardVertical: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1,
    gap: 16
  },
  financeIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  syncBanner: { padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  syncText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  heroCard: { padding: 24, borderRadius: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  heroSubRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroSubItem: { flex: 1 },
  heroSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  heroSubValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  cashFlowGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cashCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  cashIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cashLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  cashValue: { fontSize: 18, fontWeight: 'bold' },
  inventoryCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
});