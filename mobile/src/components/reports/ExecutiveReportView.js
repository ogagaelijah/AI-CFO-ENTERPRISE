// mobile/src/components/reports/ExecutiveReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function ExecutiveReportView({ data, theme }) {
  if (!data) return null;

  const overview = data.businessOverview || {};
  const kpi = data.kpiSummary || {};
  const profit = data.profitability || {};
  const cash = data.cashFlow || {};
  const ratios = data.financialRatios || {};

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Executive Report</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 16 }}>
          {data.period?.start} to {data.period?.end}
        </Text>

        {/* 1. BUSINESS OVERVIEW */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Business Overview</Text>
          <View style={styles.gridRow}>
            <View style={[styles.gridCard, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.gridLabel}>Revenue</Text>
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(overview.revenue)}</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.success + '15' }]}>
              <Text style={styles.gridLabel}>Net Profit</Text>
              <Text style={{ color: overview.netProfit >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(overview.netProfit)}</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15' }]}>
              <Text style={styles.gridLabel}>Health</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{overview.businessHealth}</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.textMuted + '15' }]}>
              <Text style={styles.gridLabel}>Score</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{overview.businessScore}/100</Text>
            </View>
          </View>
        </View>

        {/* 2. KPI SUMMARY */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>KPI Summary</Text>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Gross Margin</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatPercentage(kpi.grossMargin)}</Text></View>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Net Margin</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatPercentage(kpi.netMargin)}</Text></View>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Cash Position</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(kpi.cashPosition)}</Text></View>
        </View>

        {/* 3. PROFITABILITY & CASH FLOW */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', flex: 1 }]}>
            <Text style={styles.gridLabel}>Gross Profit</Text>
            <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(profit.grossProfit)}</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.primary + '15', flex: 1 }]}>
            <Text style={styles.gridLabel}>Opening Cash</Text>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(cash.opening)}</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 12 }]}>
          <View style={[styles.gridCard, { backgroundColor: theme.success + '15', flex: 1 }]}>
            <Text style={styles.gridLabel}>Net Profit</Text>
            <Text style={{ color: profit.netProfit >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(profit.netProfit)}</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: theme.primary + '15', flex: 1 }]}>
            <Text style={styles.gridLabel}>Closing Cash</Text>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(cash.closing)}</Text>
          </View>
        </View>

        {/* 4. FINANCIAL RATIOS */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Financial Ratios</Text>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Expense Ratio</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatPercentage(ratios.expenseRatio)}</Text></View>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Gross Margin</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatPercentage(ratios.grossMargin)}</Text></View>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Net Margin</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatPercentage(ratios.netMargin)}</Text></View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, padding: 12, borderRadius: 12 },
  gridLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
});