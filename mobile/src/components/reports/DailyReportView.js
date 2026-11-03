// mobile/src/components/reports/DailyReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function DailyReportView({ data, theme }) {
  if (!data) return <Text style={{ color: theme.text }}>No data available.</Text>;

  const today = data.today || {};
  const inventory = today.inventory || {};
  
  // Safely extract using the top5 key
  const debtors = data.debtors || { count: 0, totalAmount: 0, top5: [] };
  const creditors = data.creditors || { count: 0, totalAmount: 0, top5: [] };
  const topProducts = data.topProducts || [];
  const topCustomers = data.topCustomers || [];

  return (
    <View style={{ gap: 16 }}>
      
      {/* 1. FINANCIAL SUMMARY */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Daily Report</Text>
        
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Revenue</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Product Sales + Other Income</Text>
          </View>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(today.revenue)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Gross Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Product Sales − COGS (Margin: {formatPercentage(today.grossMargin)})</Text>
          </View>
          <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(today.grossProfit)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Expenses</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Operating Expenses</Text>
          </View>
          <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(today.expenses)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Gross Profit − Expenses + Other Income</Text>
          </View>
          <Text style={{ color: today.netProfit >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(today.netProfit)}</Text>
        </View>
      </View>

      {/* 2. INVENTORY & SALES STATS */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Sales Count</Text>
            <Text style={[styles.gridValue, { color: theme.text }]}>{formatNumber(today.salesCount)}</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Total Items</Text>
            <Text style={[styles.gridValue, { color: theme.text }]}>{formatNumber(inventory.totalItems)}</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Inventory Value</Text>
            <Text 
              style={[styles.gridValue, { color: theme.warning }]} 
              numberOfLines={1} 
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCurrency(inventory.totalValue)}
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Low Stock</Text>
            <Text style={[styles.gridValue, { color: theme.danger }]}>{formatNumber(inventory.lowStockCount)}</Text>
          </View>
        </View>
      </View>

      {/* 3. DEBTORS & CREDITORS (Top 5) */}
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
          {debtors.top5?.map((d, idx) => (
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
          {creditors.top5?.map((c, idx) => (
            <View key={idx} style={[styles.listRow, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{c.name}</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(c.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 4. TOP 5 PRODUCTS & CUSTOMERS */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        
        {topProducts.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📦 Top 5 Products</Text>
            {topProducts.slice(0, 5).map((p, idx) => (
              <View key={idx} style={[styles.listRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textMuted }}>{idx + 1}. {p.name}</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Qty: {p.quantitySold}</Text>
                </View>
                <Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(p.totalRevenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {topCustomers.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Top 5 Customers</Text>
            {topCustomers.slice(0, 5).map((c, idx) => (
              <View key={idx} style={[styles.listRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textMuted }}>{idx + 1}. {c.name}</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Sales Count: {c.salesCount || c.totalQuantity}</Text>
                </View>
                <Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(c.totalRevenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {topProducts.length === 0 && topCustomers.length === 0 && (
          <Text style={{ color: theme.textMuted, textAlign: 'center', padding: 20 }}>No top products or customers for this date.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  divider: { height: 1, marginVertical: 12 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  
  gridContainer: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  gridLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  gridValue: { fontSize: 16, fontWeight: 'bold' },
  
  innerBox: { flex: 1, padding: 12, borderRadius: 8 }
});