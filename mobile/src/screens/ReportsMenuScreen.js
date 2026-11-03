// mobile/src/screens/ReportsMenuScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const REPORT_CATEGORIES = [
  {
    title: 'Financial Statements',
    items: [
      { id: 'PL', label: 'Profit & Loss', icon: 'trending-up', color: '#3B82F6' },
      { id: 'BALANCE_SHEET', label: 'Balance Sheet', icon: 'document-text', color: '#8B5CF6' },
      { id: 'CASHFLOW', label: 'Cash Flow', icon: 'cash', color: '#10B981' },
    ],
  },
  {
    title: 'Periodic Reports',
    items: [
      { id: 'DAILY', label: 'Daily Report', icon: 'today', color: '#F59E0B' },
      { id: 'WEEKLY', label: 'Weekly Report', icon: 'calendar', color: '#F59E0B' },
      { id: 'MONTHLY', label: 'Monthly Report', icon: 'calendar-outline', color: '#F59E0B' },
      { id: 'YEARLY', label: 'Yearly Report', icon: 'calendar-number', color: '#F59E0B' },
    ],
  },
  {
    title: 'Advanced Analytics',
    items: [
      { id: 'EXECUTIVE', label: 'Executive Summary', icon: 'briefcase', color: '#EF4444' },
      { id: 'INVENTORY', label: 'Inventory Valuation', icon: 'cube', color: '#6366F1' },
      { id: 'INVENTORY_MOVEMENT', label: 'Inventory Movement', icon: 'swap-horizontal', color: '#6366F1' },
    ],
  },
];

export default function ReportsMenuScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const isAuthorized = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user?.role);

  if (!isAuthorized) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed" size={48} color={theme.danger} />
        <Text style={{ color: theme.text, marginTop: 16, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {REPORT_CATEGORIES.map((category, catIndex) => (
        <View key={catIndex} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{category.title}</Text>
          <View style={styles.grid}>
            {category.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => navigation.navigate('ReportDetail', { reportType: item.id, reportLabel: item.label })}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={[styles.cardLabel, { color: theme.text }]} numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 14, fontWeight: '600' },
});