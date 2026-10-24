import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { queue, syncQueue } = useOffline();
  const { isDark, theme, toggleTheme } = useTheme();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      console.log("📊 Fetching dashboard data...");
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

  useEffect(() => { fetchDashboard(); }, []);
  
  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Fallback to 0 if data fails to load
  const kpis = data?.kpis || {};
  const revenueToday = kpis.revenue?.today || 0;
  const salesToday = kpis.sales?.today || 0;
  const profitToday = kpis.profit?.today || 0;
  const cashInToday = kpis.cash_in?.today || 0;
  const cashOutToday = kpis.cash_out?.today || 0;
  const inventoryValue = kpis.inventory?.total || 0;
  const lowStock = kpis.inventory?.lowStock || 0;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {user?.fullName?.split(' ')[0] || 'User'}
          </Text> 
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: theme.cardBg }]}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={isDark ? '#FFD700' : '#1C1C1E'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={[styles.iconBtn, { backgroundColor: isDark ? '#7F1D1D' : '#FFE5E5' }]}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── OFFLINE BANNER ─── */}
      {queue.length > 0 && (
        <TouchableOpacity onPress={syncQueue} style={[styles.syncBanner, { backgroundColor: theme.warning }]}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.syncText}>{queue.length} offline sale(s) pending. Tap to Sync.</Text>
        </TouchableOpacity>
      )}

      {/* ─── HERO CARD (Revenue) ─── */}
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

      {/* ─── CASH FLOW CARD ─── */}
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
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  greeting: { fontSize: 14, marginBottom: 2 },
  name: { fontSize: 22, fontWeight: 'bold' },
  iconBtn: { padding: 10, borderRadius: 12 },

  // Offline
  syncBanner: { padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  syncText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },

  // Hero Card
  heroCard: { padding: 24, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  heroSubRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroSubItem: { flex: 1 },
  heroSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  heroSubValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Section Title
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },

  // Cash Flow
  cashFlowGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cashCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  cashIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cashLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  cashValue: { fontSize: 18, fontWeight: 'bold' },

  // Inventory
  inventoryCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
});