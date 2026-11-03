// mobile/src/components/reports/MonthlyReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DebtorsCreditors, TopLists } from './ReportLists';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function MonthlyReportView({ data, theme }) {
  if (!data) return null;

  const exec = data.executiveSummary || {};
  const kpi = data.kpiDashboard || {};
  const inventory = data.inventory || {};

  return (
    <View style={{ gap: 16 }}>
      {/* 1. FINANCIAL SUMMARY */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Report</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 12 }}>{data.month} {data.year}</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Revenue</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Product Sales + Other Income</Text>
          </View>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(exec.totalRevenue)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Gross Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Product Sales – COGS • Margin: {formatPercentage(exec.grossMargin)}</Text>
          </View>
          <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(exec.grossProfit)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Expenses</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Operating expenses for the month</Text>
          </View>
          <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(exec.expenses)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Gross Profit – Expenses + Other Income</Text>
          </View>
          <Text style={{ color: exec.netProfit >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(exec.netProfit)}</Text>
        </View>
      </View>

      {/* 2. MOM + YTD STATS */}
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 4 }}>MoM & YTD Growth</Text>
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.primary + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>MoM Revenue</Text>
            <Text style={{ color: exec.revenueChange >= 0 ? theme.success : theme.danger, fontSize: 16, fontWeight: 'bold' }}>
              {exec.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(exec.revenueChange || 0).toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>MoM Profit</Text>
            <Text style={{ color: exec.profitChange >= 0 ? theme.success : theme.danger, fontSize: 16, fontWeight: 'bold' }}>
              {exec.profitChange >= 0 ? '↑' : '↓'} {Math.abs(exec.profitChange || 0).toFixed(1)}%
            </Text>
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>YTD Revenue</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatCurrency(kpi.ytdRevenue)}
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>YTD Net Profit</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatCurrency(kpi.ytdNetProfit)}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. KPI & INVENTORY */}
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 4 }}>KPI Dashboard</Text>
        
        {/* Row 1: Margins */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Gross Margin</Text>
            <Text style={{ color: theme.success, fontSize: 16, fontWeight: 'bold' }}>{formatPercentage(kpi.grossMargin)}</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Net Margin</Text>
            <Text style={{ color: theme.success, fontSize: 16, fontWeight: 'bold' }}>{formatPercentage(kpi.netMargin)}</Text>
          </View>
        </View>

        {/* Row 2: Sales & Customers */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.primary + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Sales Count</Text>
            <Text style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}>{formatNumber(data.salesCount)}</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Unique Customers</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{formatNumber(kpi.uniqueCustomers)}</Text>
          </View>
        </View>

        {/* Row 3: Inventory (NEW) */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Total Inventory Items</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{formatNumber(inventory.totalItems)}</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.warning + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Inventory Value</Text>
            <Text style={{ color: theme.warning, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatCurrency(inventory.totalValue)}
            </Text>
          </View>
        </View>

        {/* Row 4: Low Stock (NEW) */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.danger + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Low Stock</Text>
            <Text style={{ color: theme.danger, fontSize: 16, fontWeight: 'bold' }}>{formatNumber(inventory.lowStockCount)}</Text>
          </View>
          <View style={{ flex: 1 }} />
        </View>

      </View>

      {/* 4. DEBTORS, CREDITORS & TOP LISTS */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <DebtorsCreditors debtors={data.debtors} creditors={data.creditors} theme={theme} />
        <TopLists topProducts={data.topProducts} topCustomers={data.topCustomers} theme={theme} />
      </View>

      {/* 5. RISKS & RECOMMENDATIONS */}
      {data.risks?.length > 0 && (
        <View style={[styles.card, { borderColor: theme.danger }]}>
          <Text style={{ color: theme.danger, fontWeight: 'bold', marginBottom: 8 }}>⚠️ Risks</Text>
          {data.risks.map((r, i) => (
            <Text key={i} style={{ color: theme.danger, fontSize: 12, marginBottom: 4 }}>• {r.type}: {r.description}</Text>
          ))}
        </View>
      )}

      {data.recommendations?.length > 0 && (
        <View style={styles.card}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 8 }}>📋 Recommendations</Text>
          {data.recommendations.map((r, i) => (
            <Text key={i} style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>• {r}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  divider: { height: 1, marginVertical: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  gridLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  gridValue: { fontSize: 16, fontWeight: 'bold' }
});