// mobile/src/screens/Partner/ApplyPartnerScreen.js
// v1.2.0 — Handles checking partner status and displays correct UI.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export const ApplyPartnerScreen = ({ navigation }) => {
  const { theme } = useTheme();
  
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Check status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await api.get('/partners/dashboard');
        setIsPartner(true);
      } catch (err) {
        // If 404, they are not a partner
        setIsPartner(false);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await api.post('/partners/apply');
      if (res.data?.success) {
        Alert.alert('Success', 'You are now a partner!');
        setIsPartner(true);
        navigation.replace('PartnerDashboard');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        
        {/* Header (Always visible) */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="gift" size={32} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Partner Program</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Earn 20% recurring commission for every business you refer to AI CFO.
            </Text>
          </View>
        </View>

        {/* Content changes based on isPartner status */}
        {isPartner ? (
          // ★ STATE: ALREADY A PARTNER (Green Block)
          <View style={[styles.activeBlock, { backgroundColor: theme.success + '15', borderColor: theme.success + '40' }]}>
            <Text style={[styles.activeText, { color: theme.success }]}>
              🎉 You are an active partner!
            </Text>
            <TouchableOpacity 
              style={[styles.dashboardBtn, { backgroundColor: theme.success }]}
              onPress={() => navigation.navigate('PartnerDashboard')}
            >
              <Text style={styles.dashboardBtnText}>Go to Partner Dashboard</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : (
          // ★ STATE: NOT A PARTNER YET (Apply Block)
          <View>
            <View style={styles.benefitsList}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.benefitText, { color: theme.text }]}>Earn 20% for 6 months</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.benefitText, { color: theme.text }]}>Track earnings in real-time</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.benefitText, { color: theme.text }]}>Withdraw once you hit ₦10,000</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
              onPress={handleApply}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyBtnText}>Apply to Become a Partner</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 24, borderRadius: 20, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  
  // Active Partner Styles
  activeBlock: { padding: 20, borderRadius: 12, borderWidth: 1 },
  activeText: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  dashboardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10 },
  dashboardBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // Not a Partner Styles
  benefitsList: { marginBottom: 24, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 15, fontWeight: '500' },
  applyBtn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});