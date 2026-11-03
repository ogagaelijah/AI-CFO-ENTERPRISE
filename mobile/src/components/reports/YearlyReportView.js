// mobile/src/components/reports/YearlyReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DebtorsCreditors, TopLists } from './ReportLists';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function YearlyReportView({ data, theme }) {
  if (!data) return null;

  const exec = data.executiveSummary || {};
  const kpi = data.annualKpiDashboard || {};
  const yoy = data.yearOverYear || {};
  const inventory = data.inventory || {};

  return (
    <View style={{ gap: 16 }}>
      {/* 1. FINANCIAL SUMMARY */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Yearly Report ({data.year})</Text>
        
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Revenue</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Total annual revenue</Text>
          </View>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(exec.totalRevenue)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Gross Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Revenue – COGS • Margin: {formatPercentage(kpi.grossMargin)}</Text>
          </View>
          <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(kpi.grossProfit)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted }}>Expenses</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Total annual operating expenses</Text>
          </View>
          <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(kpi.expenses)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Profit</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>Gross Profit – Expenses • Margin: {formatPercentage(exec.netMargin)}</Text>
          </View>
          <Text style={{ color: exec.netProfit >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(exec.netProfit)}</Text>
        </View>
      </View>

      {/* 2. YOY + INVENTORY STATS */}
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 4 }}>YoY Growth & Inventory</Text>
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.primary + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>YoY Revenue</Text>
            {yoy.hasPriorYearData ? (
              <Text style={{ color: yoy.revenueChange >= 0 ? theme.success : theme.danger, fontSize: 16, fontWeight: 'bold' }}>
                {yoy.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(yoy.revenueChange || 0).toFixed(1)}%
              </Text>
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>First year tracked</Text>
            )}
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>YoY Profit</Text>
            {yoy.hasPriorYearData ? (
              <Text style={{ color: yoy.profitChange >= 0 ? theme.success : theme.danger, fontSize: 16, fontWeight: 'bold' }}>
                {yoy.profitChange >= 0 ? '↑' : '↓'} {Math.abs(yoy.profitChange || 0).toFixed(1)}%
              </Text>
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>First year tracked</Text>
            )}
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Total COGS</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatCurrency(kpi.cogs)}
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', borderColor: theme.border }]}>
            <Text style={styles.gridLabel}>Net Margin</Text>
            <Text style={{ color: theme.success, fontSize: 16, fontWeight: 'bold' }}>{formatPercentage(kpi.netMargin)}</Text>
          </View>
        </View>
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
      </View>

      {/* 3. DEBTORS, CREDITORS & TOP LISTS */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <DebtorsCreditors debtors={data.debtors} creditors={data.creditors} theme={theme} />
        <TopLists topProducts={data.topProducts} topCustomers={data.topCustomers} theme={theme} />
      </View>

      {/* 4. INSIGHTS, RISKS & OPPORTUNITIES */}
      {data.strategicInsights?.length > 0 && (
        <View style={styles.card}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 8 }}>📊 Strategic Insights</Text>
          {data.strategicInsights.map((i, idx) => (
            <Text key={idx} style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>• {i}</Text>
          ))}
        </View>
      )}

      {data.majorRisks?.length > 0 && (
        <View style={[styles.card, { borderColor: theme.danger }]}>
          <Text style={{ color: theme.danger, fontWeight: 'bold', marginBottom: 8 }}>⚠️ Major Risks</Text>
          {data.majorRisks.map((r, idx) => (
            <Text key={idx} style={{ color: theme.danger, fontSize: 12, marginBottom: 4 }}>• {r}</Text>
          ))}
        </View>
      )}

      {data.majorOpportunities?.length > 0 && (
        <View style={[styles.card, { borderColor: theme.success }]}>
          <Text style={{ color: theme.success, fontWeight: 'bold', marginBottom: 8 }}>🚀 Major Opportunities</Text>
          {data.majorOpportunities.map((o, idx) => (
            <Text key={idx} style={{ color: theme.success, fontSize: 12, marginBottom: 4 }}>• {o}</Text>
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