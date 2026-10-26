import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

// Matches web: formatCurrency = Math.round before toLocaleString
const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();

export default function HomeScreen({ navigation }) {
  const { user, isReadOnly } = useAuth();
  const { queue, syncQueue } = useOffline();
  const { theme } = useTheme();
  const { unreadCount, fetchNotifications } = useNotifications();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const response = await api.get(`/dashboard/summary?_t=${Date.now()}`);
      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Could not load dashboard data.');
      }
    } catch (err) {
      console.log("❌ Dashboard fetch error:", err.message);
      setError(err?.response?.data?.message || 'Failed to load dashboard. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchNotifications();
    }, [fetchNotifications])
  );
  
  const onRefresh = () => { 
    setRefreshing(true); 
    fetchDashboard(); 
    fetchNotifications();
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
  const revenueMonth = kpis.revenue?.month || 0;
  const salesToday = kpis.sales?.today || 0;
  const profitToday = kpis.profit?.today || 0;
  const profitMonth = kpis.profit?.month || 0;
  const expensesToday = kpis.expenses?.today || 0;
  const inventoryValue = kpis.inventory?.total || 0;
  const debtorsOwed = kpis.debtors?.total || 0;
  const creditorsOwed = kpis.creditors?.total || 0;
  const cashPosition = kpis.cash?.current || 0;
  const cashInToday = kpis.cash_in?.today || 0;
  const cashOutToday = kpis.cash_out?.today || 0;

  const lowStock = kpis.inventory?.lowStock || 0;
  
  const rawLowStockItems = Array.isArray(kpis.inventory?.lowStockItems) ? kpis.inventory.lowStockItems : [];
  const lowStockItems = rawLowStockItems
    .map(item => ({
      id: item.id,
      item_name: item.item_name || item.name || 'Unknown',
      quantity: Number(item.quantity) || 0,
      base_unit: item.base_unit || item.baseUnit || 'units',
    }))
    .filter(item => item.item_name !== 'Unknown');

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

      {/* Error & Sync Banners */}
      {error && !loading && (
        <TouchableOpacity onPress={() => { setLoading(true); fetchDashboard(); }} style={[styles.errorBanner, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <Text style={{ color: theme.danger, flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600' }}>{error}</Text>
          <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 13 }}>Retry</Text>
        </TouchableOpacity>
      )}

      {queue.length > 0 && (
        <TouchableOpacity onPress={syncQueue} style={[styles.syncBanner, { backgroundColor: theme.warning }]}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.syncText}>{queue.length} offline sale(s) pending. Tap to Sync.</Text>
        </TouchableOpacity>
      )}

      {/* ─── PROFESSIONAL SUBSCRIPTION EXPIRED CARD ─── */}
      {isReadOnly && (
        <View style={[styles.expiredCard, { backgroundColor: theme.isDark ? '#451a03' : '#FFFBEB', borderColor: theme.warning }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="lock-closed" size={20} color={theme.warning} />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.warning }}>Subscription Expired</Text>
          </View>
          <Text style={{ fontSize: 13, color: theme.isDark ? '#fcd34d' : '#92400e', marginBottom: 16, lineHeight: 18 }}>
            Your account is currently in read-only mode. You can view your data, but you cannot record new sales, expenses, or purchases until you renew.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: theme.warning, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Renew / Upgrade Plan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── CASHIER VIEW ─── */}
      {isCashier ? (
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>My Sales Today</Text>
            <Ionicons name="cart" size={24} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.heroValue}>{formatNumber(salesToday)} Sales</Text>
          
          <View style={styles.heroDivider} />
          
          <View style={styles.heroSubRow}>
            <View style={styles.heroSubItem}>
              <Text style={styles.heroSubLabel}>Cash Received</Text>
              <Text style={styles.heroSubValue}>{formatCurrency(cashInToday)}</Text>
            </View>
          </View>
        </View>
      ) : (
        /* ─── OWNER / ADMIN VIEW (Web Parity Grid) ─── */
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            {/* Revenue Today */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="trending-up" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(revenueToday)}</Text>
              {revenueMonth > 0 && (
                <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }} numberOfLines={1}>
                  {formatCurrency(revenueMonth)} this month
                </Text>
              )}
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Revenue Today</Text>
            </View>

            {/* Sales Today */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="cart" size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatNumber(salesToday)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Sales Today</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            {/* Profit Today */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: theme.success + '15' }]}>
                <Ionicons name="trending-up" size={18} color={theme.success} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(profitToday)}</Text>
              {profitMonth > 0 && (
                <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }} numberOfLines={1}>
                  {formatCurrency(profitMonth)} this month
                </Text>
              )}
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Profit Today</Text>
            </View>

            {/* Expenses Today */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: theme.danger + '15' }]}>
                <Ionicons name="trending-down" size={18} color={theme.danger} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(expensesToday)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Expenses Today</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            {/* Inventory Value with Low Stock Names */}
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('Inventory')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrap, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="cube" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(inventoryValue)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Inventory Value</Text>
              
              {lowStock > 0 && (
                <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6 }}>
                  <Text style={{ fontSize: 10, color: theme.warning, fontWeight: 'bold', marginBottom: 2 }}>
                    ⚠ {lowStock} items low
                  </Text>
                  {lowStockItems.slice(0, 3).map((item, idx) => (
                    <View key={item.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 10, color: theme.textMuted, flex: 1 }} numberOfLines={1}>{item.item_name}</Text>
                      <Text style={{ fontSize: 10, color: theme.warning, fontWeight: 'bold' }}>{item.quantity}</Text>
                    </View>
                  ))}
                  {lowStockItems.length > 3 && (
                    <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>+{lowStockItems.length - 3} more</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Debtors Owed */}
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('Debtors')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrap, { backgroundColor: theme.warning + '15' }]}>
                <Ionicons name="people" size={18} color={theme.warning} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(debtorsOwed)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Debtors Owed</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statRow}>
            {/* You Owe */}
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
              onPress={() => navigation.navigate('Creditors')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrap, { backgroundColor: '#F9731615' }]}>
                <Ionicons name="briefcase" size={18} color="#F97316" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(creditorsOwed)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>You Owe</Text>
            </TouchableOpacity>

            {/* Cash Position */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#A855F715' }]}>
                <Ionicons name="wallet" size={18} color="#A855F7" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(cashPosition)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cash Position</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            {/* Cash Received Today */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: theme.success + '15' }]}>
                <Ionicons name="arrow-down" size={18} color={theme.success} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(cashInToday)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cash Received</Text>
            </View>

            {/* Cash Paid Today */}
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: theme.danger + '15' }]}>
                <Ionicons name="arrow-up" size={18} color={theme.danger} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(cashOutToday)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cash Paid Today</Text>
            </View>
          </View>
        </View>
      )}

      {/* ─── BUSINESS MANAGEMENT (HIDDEN IF EXPIRED) ─── */}
      {canRecordFinance && !isReadOnly && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 8 }]}>Business Management</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
            <TouchableOpacity 
              style={[styles.actionPill, { backgroundColor: theme.cardBg }]} 
              onPress={() => navigation.navigate('Expenses')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.danger + '20' }]}>
                <Ionicons name="trending-down" size={20} color={theme.danger} />
              </View>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>Record Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionPill, { backgroundColor: theme.cardBg }]} 
              onPress={() => navigation.navigate('Purchases')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.warning + '20' }]}>
                <Ionicons name="cart" size={20} color={theme.warning} />
              </View>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>Record Purchase</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionPill, { backgroundColor: theme.cardBg }]} 
              onPress={() => navigation.navigate('PurchasesHistory')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="time" size={20} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>Purchase History</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionPill, { backgroundColor: theme.cardBg }]} 
              onPress={() => navigation.navigate('Creditors')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.danger + '20' }]}>
                <Ionicons name="person" size={20} color={theme.danger} />
              </View>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>Creditors</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

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

  expiredCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },

  statsGrid: { marginBottom: 24, gap: 12 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1 },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500' },

  actionPill: { 
    width: '23%', 
    paddingVertical: 12, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 12
  },
  actionIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  errorBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
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
});