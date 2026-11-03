// mobile/src/components/reports/WeeklyReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TopLists } from './ReportLists'; // We only need TopLists now

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function WeeklyReportView({ data, theme }) {
  if (!data) return null;

  const inventory = data.inventory || {};
  const wow = data.weekOverWeek || {};
  
  // Safely extract using top3 as the backend sends top3
  const debtors = data.debtors || { count: 0, totalAmount: 0, top3: [] };
  const creditors = data.creditors || { count: 0, totalAmount: 0, top3: [] };

  return (
    <View style={{ gap: 16 }}>
      {/* 1. FINANCIAL SUMMARY */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Report</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 12 }}>
          {data.period?.start} to {data.period?.end}
        </Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Revenue</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Product Sales + Other Income</Text>
          </View>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(data.revenue)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Gross Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Product Sales − COGS (Margin: {formatPercentage(data.grossMargin)})</Text>
          </View>
          <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(data.grossProfit)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Expenses</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Operating Expenses</Text>
          </View>
          <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(data.expenses)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Gross Profit − Expenses + Other Income</Text>
          </View>
          <Text style={{ color: data.netProfit >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(data.netProfit)}</Text>
        </View>
      </View>

      {/* 2. INVENTORY & WOW STATS */}
      <View style={styles.gridRow}>
        <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={styles.gridLabel}>Sales Count</Text>
          <Text style={[styles.gridValue, { color: theme.text }]}>{formatNumber(data.salesCount)}</Text>
        </View>
        <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={styles.gridLabel}>Total Inventory Items</Text>
          <Text style={[styles.gridValue, { color: theme.text }]}>{formatNumber(inventory.totalItems)}</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={styles.gridLabel}>Inventory Value</Text>
          <Text style={[styles.gridValue, { color: theme.warning }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {formatCurrency(inventory.totalValue)}
          </Text>
        </View>
        <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={styles.gridLabel}>Low Stock</Text>
          <Text style={[styles.gridValue, { color: theme.danger }]}>{formatNumber(inventory.lowStockCount)}</Text>
        </View>
      </View>

      {inventory.lowStockCount > 0 && (
        <View style={[styles.card, { borderColor: theme.warning }]}>
          <Text style={{ color: theme.warning, fontWeight: 'bold', marginBottom: 8 }}>⚠️ {inventory.lowStockCount} items below reorder level</Text>
          {inventory.lowStockItems?.map((item, idx) => (
            <View key={idx} style={[styles.listRow, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{item.name || item.item_name}</Text>
              <Text style={{ color: theme.warning, fontWeight: 'bold' }}>Qty: {formatNumber(item.quantity)}</Text>
            </View>
          ))}
        </View>
      )}

      {wow && (
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.primary + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>WoW Revenue</Text>
            <Text style={{ color: wow.revenueChange >= 0 ? theme.success : theme.danger, fontSize: 16, fontWeight: 'bold' }}>
              {wow.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(wow.revenueChange || 0).toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>WoW Profit</Text>
            <Text style={{ color: wow.profitChange >= 0 ? theme.success : theme.danger, fontSize: 16, fontWeight: 'bold' }}>
              {wow.profitChange >= 0 ? '↑' : '↓'} {Math.abs(wow.profitChange || 0).toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* 3. DEBTORS & CREDITORS (Manual UI) */}
      {debtors.count > 0 && (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Debtors</Text>
          <View style={styles.gridRow}>
            <View style={[styles.innerBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.gridLabel}>Total Debtors</Text>
              <Text style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}>{formatNumber(debtors.count)}</Text>
            </View>
            <View style={[styles.innerBox, { backgroundColor: theme.danger + '15' }]}>
              <Text style={styles.gridLabel}>Amount Owed</Text>
              <Text style={{ color: theme.danger, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCurrency(debtors.totalAmount)}</Text>
            </View>
          </View>
          {debtors.top3?.map((d, idx) => (
            <View key={idx} style={[styles.listRow, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{d.name}</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(d.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {creditors.count > 0 && (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Creditors</Text>
          <View style={styles.gridRow}>
            <View style={[styles.innerBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.gridLabel}>Total Creditors</Text>
              <Text style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}>{formatNumber(creditors.count)}</Text>
            </View>
            <View style={[styles.innerBox, { backgroundColor: theme.warning + '15' }]}>
              <Text style={styles.gridLabel}>Amount Owed</Text>
              <Text style={{ color: theme.warning, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCurrency(creditors.totalAmount)}</Text>
            </View>
          </View>
          {creditors.top3?.map((c, idx) => (
            <View key={idx} style={[styles.listRow, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{c.name}</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(c.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 4. TOP LISTS */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TopLists topProducts={data.topProducts} topCustomers={data.topCustomers} theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  divider: { height: 1, marginVertical: 12 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  gridLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  gridValue: { fontSize: 16, fontWeight: 'bold' },
  innerBox: { flex: 1, padding: 12, borderRadius: 8 }
});