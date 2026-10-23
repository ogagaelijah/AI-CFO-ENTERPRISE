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
  const [stats, setStats] = useState({ sales: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      console.log("📊 Fetching dashboard stats...");
      const response = await api.get('/sales');
      // Print the first 200 characters of the response to see the structure
      console.log("📊 Sales response:", JSON.stringify(response.data).substring(0, 200)); 
      
      const sales = response.data?.data?.sales || response.data?.data || response.data || [];
      const today = new Date().toISOString().split('T')[0];
      let todaySales = 0;
      let todayProfit = 0;

      if (Array.isArray(sales)) {
        sales.forEach(sale => {
          const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
          if (saleDate === today) {
            todaySales += Number(sale.total_price) || 0;
            todayProfit += Number(sale.gross_profit) || 0;
          }
        });
      }

      console.log(`📊 Calculated: Today is ${today}, Sales: ${todaySales}, Profit: ${todayProfit}`);
      setStats({ sales: todaySales, profit: todayProfit });
    } catch (error) {
      console.log("❌ Dashboard fetch error:", error.message);
      console.log("❌ Response data:", error.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: theme.text }]}>{user?.fullName || 'User'}</Text> 
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: theme.cardBg }]}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={isDark ? '#FFD700' : '#1C1C1E'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={[styles.iconBtn, { backgroundColor: isDark ? '#7F1D1D' : '#FFE5E5' }]}>
            <Ionicons name="log-out-outline" size={24} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {queue.length > 0 && (
        <TouchableOpacity onPress={syncQueue} style={[styles.syncBanner, { backgroundColor: theme.warning }]}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.syncText}>{queue.length} offline sale(s) pending. Tap to Sync.</Text>
        </TouchableOpacity>
      )}

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Today's Sales</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>₦{stats.sales.toLocaleString()}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Today's Profit</Text>
          <Text style={[styles.statValue, { color: theme.success }]}>₦{stats.profit.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
      
      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => navigation.navigate('Sales')}>
        <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}><Ionicons name="cart" size={24} color="#fff" /></View>
        <View style={styles.actionText}>
          <Text style={[styles.actionTitle, { color: theme.text }]}>Record a Sale</Text>
          <Text style={[styles.actionSubtitle, { color: theme.textMuted }]}>Sell pieces or cartons</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => navigation.navigate('History')}>
        <View style={[styles.actionIcon, { backgroundColor: '#5856D6' }]}><Ionicons name="receipt" size={24} color="#fff" /></View>
        <View style={styles.actionText}>
          <Text style={[styles.actionTitle, { color: theme.text }]}>Sales History</Text>
          <Text style={[styles.actionSubtitle, { color: theme.textMuted }]}>View recent transactions</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => navigation.navigate('Inventory')}>
        <View style={[styles.actionIcon, { backgroundColor: theme.warning }]}><Ionicons name="cube" size={24} color="#fff" /></View>
        <View style={styles.actionText}>
          <Text style={[styles.actionTitle, { color: theme.text }]}>Check Inventory</Text>
          <Text style={[styles.actionSubtitle, { color: theme.textMuted }]}>View stock and low items</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  greeting: { fontSize: 16 },
  name: { fontSize: 24, fontWeight: 'bold' },
  iconBtn: { padding: 8, borderRadius: 8 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600' },
  actionSubtitle: { fontSize: 13, marginTop: 2 },
  syncBanner: { padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  syncText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
});