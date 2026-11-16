// mobile/src/screens/Partner/PartnerDashboardScreen.js
// v1.2.0 — Kicks non-partners back to ApplyPartner screen.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export const PartnerDashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/partners/dashboard');
      if (res.data?.success) setData(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        // ★ Kicks non-partner directly to the Apply screen
        navigation.replace('ApplyPartner');
      } else {
        setError('Failed to load partner dashboard.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleShare = async () => {
    if (!data?.partner?.partnerCode) return;
    const link = `https://aicfotechnologies.com/p/${data.partner.partnerCode}`;
    try {
      await Share.share({
        message: `Join AI CFO Enterprise and manage your business like a pro! Use my link to get started: ${link}`,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleWithdraw = async () => {
    if (!data?.partner?.walletBalance || data.partner.walletBalance < 10000) return;
    setWithdrawing(true);
    try {
      const res = await api.post('/partners/withdraw', {
        amount: data.partner.walletBalance,
        bankDetails: { note: 'Mobile withdrawal request' }
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Withdrawal requested! Admin will process it shortly.');
        fetchDashboard();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.danger }}>{error}</Text>
      </View>
    );
  }

  const { partner, referrals, withdrawalThreshold } = data;
  const canWithdraw = partner.walletBalance >= withdrawalThreshold;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => navigation.navigate('Profile')}
      >
        <Ionicons name="arrow-back" size={20} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted, fontWeight: '500', marginLeft: 8 }}>Back to Profile</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Partner Dashboard</Text>
        <Text style={{ color: theme.textMuted, fontSize: 14 }}>Track your referrals and earnings.</Text>
      </View>

      {/* Referral Link Card */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>YOUR REFERRAL LINK</Text>
        <View style={[styles.linkBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={{ flex: 1, color: theme.text, fontSize: 13 }} numberOfLines={1}>
            https://aicfotechnologies.com/p/{partner.partnerCode}
          </Text>
          <TouchableOpacity onPress={handleShare} style={[styles.copyBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name="copy-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Card (Gold/Yellow Theme matching Web) */}
      <View style={[styles.walletCard, { backgroundColor: '#EAB308' }]}>
        <View style={styles.walletHeader}>
          <Text style={styles.walletLabel}>Available Balance</Text>
          <Ionicons name="wallet-outline" size={24} color="rgba(0,0,0,0.7)" />
        </View>
        <Text style={styles.walletAmount}>₦{partner.walletBalance.toLocaleString()}</Text>
        
        <TouchableOpacity 
          style={[styles.withdrawBtn, { backgroundColor: canWithdraw ? '#fff' : 'rgba(255,255,255,0.4)' }]}
          onPress={handleWithdraw}
          disabled={!canWithdraw || withdrawing}
        >
          <Text style={[styles.withdrawText, { color: canWithdraw ? '#B45309' : 'rgba(255,255,255,0.8)' }]}>
            {withdrawing ? 'Processing...' : canWithdraw ? 'Request Withdrawal' : `Min ₦${withdrawalThreshold.toLocaleString()}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Referrals List */}
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 0 }]}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="people" size={20} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Your Referrals</Text>
        </View>
        
        {referrals.length === 0 ? (
          <Text style={{ color: theme.textMuted, textAlign: 'center', padding: 32 }}>No referrals yet. Share your link to start earning!</Text>
        ) : (
          referrals.map((ref, index) => (
            <View key={ref.id} style={[styles.refRow, { paddingHorizontal: 16 }, index !== referrals.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>{ref.business_name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>Joined: {new Date(ref.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>{ref.months_paid} / 6 Months</Text>
                <View style={[styles.statusBadge, { backgroundColor: ref.status === 'ACTIVE' ? theme.success + '20' : theme.textMuted + '20' }]}>
                  <Text style={{ color: ref.status === 'ACTIVE' ? theme.success : theme.textMuted, fontSize: 10, fontWeight: 'bold' }}>{ref.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  linkBox: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  walletCard: { padding: 20, borderRadius: 16, marginBottom: 16 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  walletLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14, fontWeight: '600' },
  walletAmount: { color: '#000', fontSize: 36, fontWeight: '900', marginBottom: 16 },
  withdrawBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  withdrawText: { fontSize: 16, fontWeight: 'bold' },
  refRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
});