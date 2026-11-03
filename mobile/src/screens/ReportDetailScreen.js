// mobile/src/screens/ReportDetailScreen.js
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import DailyReportView from '../components/reports/DailyReportView';
import WeeklyReportView from '../components/reports/WeeklyReportView';
import MonthlyReportView from '../components/reports/MonthlyReportView';
import YearlyReportView from '../components/reports/YearlyReportView';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();
const formatPercentage = (val) => `${(Number(val) || 0).toFixed(1)}%`;

export default function ReportDetailScreen({ route, navigation }) {
  const { reportType, reportLabel, initialDate } = route.params;
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [expandedItem, setExpandedItem] = useState(null);

  const seedDate = initialDate ? new Date(`${initialDate}T00:00:00`) : new Date();
  const [startDate, setStartDate] = useState(seedDate);
  const [endDate, setEndDate] = useState(seedDate);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const isRangeReport = ['PL', 'CASHFLOW', 'EXECUTIVE'].includes(reportType);
  const isInventoryMovement = reportType === 'INVENTORY_MOVEMENT';

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      let params = {};
      const formattedStart = formatDate(startDate);
      const formattedEnd = formatDate(endDate);

      switch (reportType) {
        case 'PL': endpoint = '/reports/pl'; params = { startDate: formattedStart, endDate: formattedEnd }; break;
        case 'CASHFLOW': endpoint = '/reports/cashflow'; params = { startDate: formattedStart, endDate: formattedEnd }; break;
        case 'BALANCE_SHEET': endpoint = '/reports/balance-sheet'; params = { asAtDate: formattedEnd }; break;
        case 'DAILY': endpoint = '/reports/daily'; params = { date: formattedEnd }; break;
        case 'WEEKLY': endpoint = '/reports/weekly'; params = { date: formattedEnd }; break;
        case 'MONTHLY': endpoint = '/reports/monthly'; params = { date: formattedEnd }; break;
        case 'YEARLY': endpoint = '/reports/yearly'; params = { date: formattedEnd }; break;
        case 'EXECUTIVE': endpoint = '/reports/executive'; params = { startDate: formattedStart, endDate: formattedEnd }; break;
        case 'INVENTORY': endpoint = '/reports/inventory'; params = { asAtDate: formattedEnd, includeDetails: true }; break;
        case 'INVENTORY_MOVEMENT': endpoint = '/reports/inventory-movement'; params = { startDate: formattedStart, endDate: formattedEnd }; break;
        default: throw new Error('Unknown report type');
      }

      const res = await api.get(endpoint, { params });
      
      // ★ DEBUG LOG ADDED HERE
      console.log('🔍 MOBILE WEEKLY API:', JSON.stringify(res.data, null, 2));

      if (res.data?.success) setData(res.data.data);
      else if (res.data?.status === 'SUCCESS') setData(res.data.data);
      else setError('Invalid response from server.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [startDate, endDate, reportType]);

  const onShare = async () => {
    if (!data) return;
    try {
      let message = `📊 *${reportLabel}*\n`;
      message += `📅 ${formatDate(startDate)}${isRangeReport || isInventoryMovement ? ` to ${formatDate(endDate)}` : ''}\n\n`;
      
      if (reportType === 'PL') {
        message += `Revenue: ${formatCurrency(data.revenue?.totalRevenue || data.revenue)}\n`;
        message += `Net Profit: ${formatCurrency(data.netProfit?.amount || data.netProfit)}\n`;
      } else if (reportType === 'CASHFLOW') {
        message += `Closing Cash: ${formatCurrency(data.closingCash)}\n`;
      } else if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(reportType)) {
        const rev = data.today?.revenue || data.revenue || data.executiveSummary?.totalRevenue;
        const profit = data.today?.netProfit || data.netProfit || data.executiveSummary?.netProfit;
        message += `Revenue: ${formatCurrency(rev)}\n`;
        message += `Net Profit: ${formatCurrency(profit)}\n`;
      } else {
        message += `Generated from AI CFO Enterprise.`;
      }
      message += `\n\n_Sent via AI CFO Mobile App_`;

      await Share.share({ message });
    } catch (error) {
      console.error(error.message);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={onShare} style={{ marginRight: 16 }}>
          <Ionicons name="share-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [data, startDate, endDate]);

  const renderDatePicker = (label, date, setDate, show, setShow) => (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity 
        style={[styles.dateBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
        onPress={() => setShow(true)}
      >
        <Ionicons name="calendar" size={16} color={theme.text} style={{ marginRight: 8 }} />
        <Text style={{ color: theme.text, fontWeight: '500' }}>{formatDate(date)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onValueChange={(event, selectedDate) => {
            if (Platform.OS === 'android') setShow(false);
            if (selectedDate) setDate(selectedDate);
          }}
          onDismiss={() => setShow(false)}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.filterBar, { backgroundColor: theme.cardBg, borderBottomColor: theme.border, flexDirection: 'row', gap: 12 }]}>
        {isRangeReport || isInventoryMovement ? (
          <>
            {renderDatePicker('Start Date', startDate, setStartDate, showStartPicker, setShowStartPicker)}
            {renderDatePicker('End Date', endDate, setEndDate, showEndPicker, setShowEndPicker)}
          </>
        ) : (
          renderDatePicker('Select Date', endDate, setEndDate, showEndPicker, setShowEndPicker)
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={{ color: theme.danger, textAlign: 'center', marginTop: 40 }}>{error}</Text>
        ) : !data ? (
          <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 40 }}>No data available.</Text>
        ) : (
          <View style={{ gap: 16 }}>
            
            {reportType === 'DAILY' && <DailyReportView data={data} theme={theme} />}
            {reportType === 'WEEKLY' && <WeeklyReportView data={data} theme={theme} />}
            {reportType === 'MONTHLY' && <MonthlyReportView data={data} theme={theme} />}
            {reportType === 'YEARLY' && <YearlyReportView data={data} theme={theme} />}

            {reportType === 'INVENTORY' && (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Inventory Valuation</Text>
                <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Items</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatNumber(data.summary?.totalItems)}</Text></View>
                <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Cost Value</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(data.summary?.totalCostValue)}</Text></View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, index) => (
                    <View key={index} style={[styles.listItem, { borderBottomColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{item.name || 'Unknown'}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>Qty: {formatNumber(item.quantity)}</Text>
                      </View>
                      <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(item.value)}</Text>
                    </View>
                  ))
                ) : <Text style={{ color: theme.textMuted, textAlign: 'center' }}>No detailed items available.</Text>}
              </View>
            )}

            {reportType === 'INVENTORY_MOVEMENT' && (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Inventory Movement</Text>
                <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total In</Text><Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatNumber(data.summary?.totalIn)}</Text></View>
                <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Out</Text><Text style={{ color: theme.danger, fontWeight: 'bold' }}>{formatNumber(data.summary?.totalOut)}</Text></View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, index) => (
                    <View key={index} style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center' }}
                        onPress={() => setExpandedItem(expandedItem === item.inventoryItemId ? null : item.inventoryItemId)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{item.itemName}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Closing Qty: {formatNumber(item.closingQuantity)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>
                          <Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(item.closingValue)}</Text>
                          <Ionicons name={expandedItem === item.inventoryItemId ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
                        </View>
                      </TouchableOpacity>
                      
                      {expandedItem === item.inventoryItemId && item.movements && item.movements.length > 0 && (
                        <View style={{ backgroundColor: theme.background, padding: 12, borderRadius: 8, marginBottom: 12 }}>
                          <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: 'bold', marginBottom: 8, letterSpacing: 0.5 }}>MOVEMENT LEDGER</Text>
                          {item.movements.map((m, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.border, paddingTop: idx > 0 ? 6 : 0 }}>
                              <View>
                                <Text style={{ color: m.movementType.includes('IN') ? theme.success : theme.danger, fontSize: 11, fontWeight: 'bold' }}>{m.movementType}</Text>
                                <Text style={{ color: theme.textMuted, fontSize: 11 }}>Qty: {formatNumber(m.quantity)} (Before: {formatNumber(m.quantityBefore)} → After: {formatNumber(m.quantityAfter)})</Text>
                              </View>
                              <Text style={{ color: theme.textMuted, fontSize: 11 }}>{formatCurrency(m.totalCost)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                ) : <Text style={{ color: theme.textMuted, textAlign: 'center' }}>No movement details available.</Text>}
              </View>
            )}

            {['PL', 'CASHFLOW', 'BALANCE_SHEET', 'EXECUTIVE'].includes(reportType) && (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{reportLabel}</Text>
                
                {reportType === 'PL' && (
                  <>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Revenue</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(data.revenue?.totalRevenue || data.revenue)}</Text></View>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Gross Profit</Text><Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(data.grossProfit?.amount || data.grossProfit)}</Text></View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.row}><Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Profit</Text><Text style={{ color: (data.netProfit?.amount || data.netProfit) >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(data.netProfit?.amount || data.netProfit)}</Text></View>
                  </>
                )}
                
                {reportType === 'CASHFLOW' && (
                  <>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Operating Cash In</Text><Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(data.operatingActivities?.cashIn?.total)}</Text></View>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Operating Cash Out</Text><Text style={{ color: theme.danger, fontWeight: 'bold' }}>{formatCurrency(data.operatingActivities?.cashOut?.total)}</Text></View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.row}><Text style={{ color: theme.text, fontWeight: 'bold' }}>Closing Cash</Text><Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(data.closingCash)}</Text></View>
                  </>
                )}

                {reportType === 'BALANCE_SHEET' && (
                  <>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Assets</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(data.assets?.totalAssets)}</Text></View>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Total Liabilities</Text><Text style={{ color: theme.danger, fontWeight: 'bold' }}>{formatCurrency(data.liabilities?.totalLiabilities)}</Text></View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.row}><Text style={{ color: theme.text, fontWeight: 'bold' }}>Total Equity</Text><Text style={{ color: theme.success, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(data.equity?.totalEquity)}</Text></View>
                  </>
                )}

                {reportType === 'EXECUTIVE' && (
                  <>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Revenue</Text><Text style={{ color: theme.text, fontWeight: 'bold' }}>{formatCurrency(data.businessOverview?.revenue || data.executiveSummary?.revenue)}</Text></View>
                    <View style={styles.row}><Text style={{ color: theme.textMuted }}>Gross Profit</Text><Text style={{ color: theme.success, fontWeight: 'bold' }}>{formatCurrency(data.executiveSummary?.grossProfit || data.profitability?.grossProfit)}</Text></View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.row}><Text style={{ color: theme.text, fontWeight: 'bold' }}>Net Profit</Text><Text style={{ color: (data.businessOverview?.netProfit || data.executiveSummary?.netProfit) >= 0 ? theme.success : theme.danger, fontWeight: 'bold', fontSize: 18 }}>{formatCurrency(data.businessOverview?.netProfit || data.executiveSummary?.netProfit)}</Text></View>
                  </>
                )}
              </View>
            )}
            
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterBar: { padding: 16, borderBottomWidth: 1 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  divider: { height: 1, marginVertical: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  statBox: { flex: 1, padding: 10, borderRadius: 8 }
});