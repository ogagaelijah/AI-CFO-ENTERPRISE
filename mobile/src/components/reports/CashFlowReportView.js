// mobile/src/components/reports/CashFlowReportView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

export default function CashFlowReportView({ data, theme }) {
  if (!data) return null;

  const operating = data.operatingActivities || {};
  const investing = data.investingActivities || {};
  const financing = data.financingActivities || {};
  const summary = data.summary || {};

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Cash Flow Statement</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 16 }}>
          {data.period?.startDate} to {data.period?.endDate}
        </Text>

        {/* 1. OPERATING ACTIVITIES */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Operating Activities</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 12 }}>Cash generated from core business operations</Text>
          
          <Text style={{ color: theme.textMuted, fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>CASH IN</Text>
          <View style={{ paddingLeft: 12, gap: 6, marginBottom: 8 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>From Customers</Text><Text style={{ color: theme.success }}>{formatCurrency(operating.cashIn?.fromCustomers)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>From Debtors</Text><Text style={{ color: theme.success }}>{formatCurrency(operating.cashIn?.fromDebtors)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>From Other Income</Text><Text style={{ color: theme.success }}>{formatCurrency(operating.cashIn?.fromOtherIncome)}</Text></View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>Total Cash In</Text>
              <Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(operating.cashIn?.total)}</Text>
            </View>
          </View>

          <Text style={{ color: theme.textMuted, fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>CASH OUT</Text>
          <View style={{ paddingLeft: 12, gap: 6, marginBottom: 8 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>To Suppliers</Text><Text style={{ color: theme.danger }}>{formatCurrency(operating.cashOut?.toSuppliers)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>To Creditors</Text><Text style={{ color: theme.danger }}>{formatCurrency(operating.cashOut?.toCreditors)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Operating Expenses</Text><Text style={{ color: theme.danger }}>{formatCurrency(operating.cashOut?.operatingExpenses)}</Text></View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>Total Cash Out</Text>
              <Text style={{ color: theme.danger, fontWeight: 'bold' }}>{formatCurrency(operating.cashOut?.total)}</Text>
            </View>
          </View>

          <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Operating Cash Flow</Text>
            <Text style={{ color: operating.netOperatingCash >= 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{formatCurrency(operating.netOperatingCash)}</Text>
          </View>
        </View>

        {/* 2. INVESTING ACTIVITIES */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Investing Activities</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 12 }}>Cash used for asset purchases and investments</Text>

          <View style={{ paddingLeft: 12, gap: 6 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Purchase of Equipment</Text><Text style={{ color: theme.danger }}>{formatCurrency(investing.purchaseOfEquipment)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Purchase of Long-Term Assets</Text><Text style={{ color: theme.danger }}>{formatCurrency(investing.purchaseOfLongTermAssets)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Proceeds from Asset Sales</Text><Text style={{ color: theme.success }}>{formatCurrency(investing.proceedsFromAssetSales)}</Text></View>
          </View>

          <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 8 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Investing Cash Flow</Text>
            <Text style={{ color: investing.netInvestingCash >= 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{formatCurrency(investing.netInvestingCash)}</Text>
          </View>
        </View>

        {/* 3. FINANCING ACTIVITIES */}
        <View style={[styles.section, { borderBottomWidth: 0 }]}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Financing Activities</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 12 }}>Cash from loans, investments, and owner contributions</Text>

          <View style={{ paddingLeft: 12, gap: 6 }}>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Loans Received</Text><Text style={{ color: theme.success }}>{formatCurrency(financing.loansReceived)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Owner Contributions</Text><Text style={{ color: theme.success }}>{formatCurrency(financing.ownerContributions)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Loan Repayments</Text><Text style={{ color: theme.danger }}>{formatCurrency(financing.loanRepayments)}</Text></View>
            <View style={styles.row}><Text style={{ color: theme.textMuted }}>Owner Withdrawals</Text><Text style={{ color: theme.danger }}>{formatCurrency(financing.ownerWithdrawals)}</Text></View>
          </View>

          <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.border, paddingTop: 8, marginTop: 8 }]}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Financing Cash Flow</Text>
            <Text style={{ color: financing.netFinancingCash >= 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{formatCurrency(financing.netFinancingCash)}</Text>
          </View>
        </View>

        {/* 4. SUMMARY */}
        <View style={[styles.row, { borderTopWidth: 2, borderTopColor: theme.text, paddingTop: 16, marginTop: 8 }]}>
          <Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Change in Cash</Text>
          <Text style={{ color: data.netChangeInCash >= 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{formatCurrency(data.netChangeInCash)}</Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={{ color: theme.textMuted }}>Opening Cash</Text>
          <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(data.openingCash)}</Text>
        </View>
        <View style={[styles.row, { marginTop: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }]}>
          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>Closing Cash Balance</Text>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(data.closingCash)}</Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  section: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});