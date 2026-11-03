// mobile/src/components/reports/ReportLists.js
import React from 'react';
import { View, Text } from 'react-native';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();

export function TopLists({ topProducts, topCustomers, theme }) {
  return (
    <>
      {topProducts && topProducts.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 12 }}>📦 Top 5 Products</Text>
          {topProducts.slice(0, 5).map((p, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{idx + 1}. {p.name}</Text>
              <Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(p.amount || p.totalRevenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {topCustomers && topCustomers.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 12 }}>🏆 Top 5 Customers</Text>
          {topCustomers.slice(0, 5).map((c, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{idx + 1}. {c.name}</Text>
              <Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(c.amount || c.totalRevenue)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function DebtorsCreditors({ debtors, creditors, theme }) {
  return (
    <>
      {debtors && debtors.count > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 12 }}>📋 Debtors</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.primary + '15' }}>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>Total Debtors</Text>
              <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>{formatNumber(debtors.count)}</Text>
            </View>
            <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.danger + '15' }}>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>Amount Owed</Text>
              <Text style={{ color: theme.danger, fontSize: 18, fontWeight: 'bold' }}>{formatCurrency(debtors.totalAmount)}</Text>
            </View>
          </View>
          {debtors.top3 && debtors.top3.map((d, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{d.name}</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(d.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {creditors && creditors.count > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 12 }}>📋 Creditors</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.primary + '15' }}>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>Total Creditors</Text>
              <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>{formatNumber(creditors.count)}</Text>
            </View>
            <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.warning + '15' }}>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>Amount Owed</Text>
              <Text style={{ color: theme.warning, fontSize: 18, fontWeight: 'bold' }}>{formatCurrency(creditors.totalAmount)}</Text>
            </View>
          </View>
          {creditors.top3 && creditors.top3.map((c, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{c.name}</Text>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(c.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}