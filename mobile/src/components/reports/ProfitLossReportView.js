// mobile/src/components/reports/ProfitLossReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function ProfitLossReportView({ data, theme }) {
  if (!data) return null;

  const revenue = data.revenue || {};
  const cogs = data.cogs || {};
  const grossProfit = data.grossProfit || {};
  const operatingExpenses = data.operatingExpenses || {};
  const operatingProfit = data.operatingProfit || {};
  const netProfit = data.netProfit || {};

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Profit & Loss Statement</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 16 }}>
          {data.period} • {data.startDate} to {data.endDate}
        </Text>

        {/* 1. REVENUE */}
        <View style={{ gap: 8 }}>
          <View style={styles.row}>
            <Text style={{ color: theme.textMuted }}>Product Sales</Text>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(revenue.productSales)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.textMuted }}>Other Revenue</Text>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(revenue.otherRevenue)}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Total Revenue</Text>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(revenue.totalRevenue)}</Text>
          </View>
        </View>

        {/* 2. COGS */}
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 12 }]}>
          <Text style={{ color: theme.textMuted, fontWeight: '500' }}>Cost of Goods Sold (COGS)</Text>
          <Text style={{ color: theme.warning, fontWeight: 'bold' }}>{formatCurrency(cogs.total)}</Text>
        </View>

        {/* 3. GROSS PROFIT */}
        <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 12, marginTop: 12 }]}>
          <View>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Gross Profit</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>Revenue – COGS</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(grossProfit.amount)}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>({formatPercentage(grossProfit.margin)})</Text>
          </View>
        </View>

        {/* 4. OPERATING EXPENSES */}
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 12 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 8 }}>Operating Expenses</Text>
          
          <View style={{ paddingLeft: 12, gap: 8 }}>
            {operatingExpenses.salaries > 0 && <View style={styles.row}><Text style={{ color: theme.textMuted, fontSize: 13 }}>Salaries</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatCurrency(operatingExpenses.salaries)}</Text></View>}
            {operatingExpenses.rent > 0 && <View style={styles.row}><Text style={{ color: theme.textMuted, fontSize: 13 }}>Rent</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatCurrency(operatingExpenses.rent)}</Text></View>}
            {operatingExpenses.advertising > 0 && <View style={styles.row}><Text style={{ color: theme.textMuted, fontSize: 13 }}>Advertising</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatCurrency(operatingExpenses.advertising)}</Text></View>}
            {operatingExpenses.transportation > 0 && <View style={styles.row}><Text style={{ color: theme.textMuted, fontSize: 13 }}>Transportation</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatCurrency(operatingExpenses.transportation)}</Text></View>}
            {operatingExpenses.utilities > 0 && <View style={styles.row}><Text style={{ color: theme.textMuted, fontSize: 13 }}>Utilities</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatCurrency(operatingExpenses.utilities)}</Text></View>}
            {operatingExpenses.other > 0 && <View style={styles.row}><Text style={{ color: theme.textMuted, fontSize: 13 }}>Other</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatCurrency(operatingExpenses.other)}</Text></View>}
          </View>

          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 8 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Total Operating Expenses</Text>
            <Text style={{ color: theme.danger, fontWeight: 'bold' }}>{formatCurrency(operatingExpenses.total)}</Text>
          </View>
        </View>

        {/* 5. OPERATING PROFIT */}
        <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 12, marginTop: 12 }]}>
          <View>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Operating Profit</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>Gross Profit – Operating Expenses</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{formatCurrency(operatingProfit.amount)}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>({formatPercentage(operatingProfit.margin)})</Text>
          </View>
        </View>

        {/* 6. NET PROFIT */}
        <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.text, paddingTop: 16, marginTop: 12 }]}>
          <View>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 18 }}>Net Profit</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>Operating Profit + Other Income</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: netProfit.amount >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 20 }}>
              {formatCurrency(netProfit.amount)}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>({formatPercentage(netProfit.margin)})</Text>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});