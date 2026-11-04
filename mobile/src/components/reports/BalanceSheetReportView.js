// mobile/src/components/reports/BalanceSheetReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

export default function BalanceSheetReportView({ data, theme }) {
  if (!data) return null;

  const assets = data.assets || {};
  const currentAssets = assets.currentAssets || {};
  const liabilities = data.liabilities || {};
  const currentLiabilities = liabilities.currentLiabilities || {};
  const equity = data.equity || {};
  const control = data.control || {};
  const insights = data.aiInsights || [];
  const managementAttention = data.managementAttention;

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Balance Sheet</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 16 }}>
          As at: {data.asAtDate}
        </Text>

        {/* ASSETS */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 4, marginBottom: 8 }}>ASSETS</Text>
          
          <Text style={{ color: theme.textMuted, fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>CURRENT ASSETS</Text>
          <View style={{ paddingLeft: 12, gap: 6 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Cash & Cash Equivalents</Text><Text style={{ color: theme.text }}>{formatCurrency(currentAssets.cash)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Accounts Receivable</Text><Text style={{ color: theme.text }}>{formatCurrency(currentAssets.accountsReceivable)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Inventory</Text><Text style={{ color: theme.text }}>{formatCurrency(currentAssets.inventory)}</Text></View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>TOTAL CURRENT ASSETS</Text>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{formatCurrency(currentAssets.total)}</Text>
            </View>
          </View>
          
          <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 12 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>TOTAL ASSETS</Text>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(assets.totalAssets)}</Text>
          </View>
        </View>

        {/* LIABILITIES */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 16, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 4, marginBottom: 8 }}>LIABILITIES</Text>
          
          <Text style={{ color: theme.textMuted, fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>CURRENT LIABILITIES</Text>
          <View style={{ paddingLeft: 12, gap: 6 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Accounts Payable</Text><Text style={{ color: theme.danger }}>{formatCurrency(currentLiabilities.accountsPayable)}</Text></View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>TOTAL CURRENT LIABILITIES</Text>
              <Text style={{ color: theme.danger, fontWeight: 'bold' }}>{formatCurrency(currentLiabilities.total)}</Text>
            </View>
          </View>

          <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 12 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>TOTAL LIABILITIES</Text>
            <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(liabilities.totalLiabilities)}</Text>
          </View>
        </View>

        {/* EQUITY */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 4, marginBottom: 8 }}>EQUITY</Text>
          <View style={{ paddingLeft: 12, gap: 6 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Owner's Capital</Text><Text style={{ color: theme.text }}>{formatCurrency(equity.ownersCapital)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Retained Earnings</Text><Text style={{ color: theme.success }}>{formatCurrency(equity.retainedEarnings)}</Text></View>
            <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 8 }]}>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>TOTAL EQUITY</Text>
              <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(equity.totalEquity)}</Text>
            </View>
          </View>
        </View>

        {/* CONTROL */}
        <View style={{ borderTopWidth: 2, borderTopColor: theme.text, paddingTop: 12 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 8 }}>BALANCE CHECK</Text>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Assets</Text><Text style={{ color: theme.text }}>{formatCurrency(assets.totalAssets)}</Text></View>
          <View style={styles.row}><Text style={{ color: theme.textMuted }}>Liabilities + Equity</Text><Text style={{ color: theme.text }}>{formatCurrency((liabilities.totalLiabilities || 0) + (equity.totalEquity || 0))}</Text></View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
            <Text style={{ color: theme.textMuted }}>Difference</Text>
            <Text style={{ color: Math.abs(control.difference || 0) < 0.01 ? theme.success : theme.danger, fontWeight: 'bold' }}>{formatCurrency(control.difference)}</Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <Text style={{ color: control.isBalanced ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 16 }}>
              {control.isBalanced ? '✅ BALANCED' : '⚠️ OUT OF BALANCE'}
            </Text>
          </View>
        </View>

      </View>

      {/* ★ NEW: AI CFO INSIGHTS & MANAGEMENT ATTENTION */}
      {(insights.length > 0 || managementAttention) && (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>AI CFO INSIGHTS</Text>
          {insights.map((insight, idx) => (
            <Text key={idx} style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4 }}>• {insight}</Text>
          ))}

          {managementAttention && (
            <View style={{ backgroundColor: theme.warning + '15', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: theme.warning }}>
              <Text style={{ color: theme.warning, fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>⚠️ MANAGEMENT ATTENTION</Text>
              <Text style={{ color: theme.warning, fontSize: 12 }}>{managementAttention}</Text>
            </View>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});