// mobile/src/screens/GoogleOnboardingScreen.js
// v1.1.0 — Fixes navigation crash by removing redundant navigation.reset.
// v1.0.0 — Onboarding for Google Auth users on mobile.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; // ★ NEW: Added for referral code
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const READY_INDUSTRIES = [
  'Retail / Wholesale',
  'Construction',
  'Consultancy / Services',
  'Education',
  'NGO / Non-Profit',
];

const COMING_SOON_INDUSTRIES = [
  'Manufacturing',
  'Healthcare',
  'Real Estate',
  'Logistics',
];

export const GoogleOnboardingScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { loginWithToken } = useAuth();
  
  const { email, fullName, googleId } = route.params || {};

  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);

  const handleSave = async () => {
    if (!businessName.trim()) return Alert.alert('Error', 'Business name is required');
    if (!industry) return Alert.alert('Error', 'Please select an industry');

    setLoading(true);
    try {
      const ref = await SecureStore.getItemAsync('referral_code');
      
      const res = await api.post('/auth/google/complete', {
        email,
        fullName,
        googleId,
        businessName: businessName.trim(),
        industry,
        phone: phone.trim(),
        ref: ref || null
      });

      if (res.data?.token) {
        const result = await loginWithToken(res.data.token);

        if (!result?.success) {
          Alert.alert('Error', result?.message || 'Could not sign you in');
          return;
        }

        if (ref) await SecureStore.deleteItemAsync('referral_code');
        
        // ★ FIXED: Removed navigation.reset(). 
        // AppNavigator automatically switches to the Main stack when `user` is set.
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Almost there!</Text>
          <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 4 }}>
            Welcome {fullName}. Tell us about your business.
          </Text>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Business Name *</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder="Your business name" 
          placeholderTextColor={theme.textMuted} 
          value={businessName} 
          onChangeText={setBusinessName} 
        />

        <Text style={[styles.label, { color: theme.text }]}>Industry *</Text>
        <TouchableOpacity 
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          onPress={() => setShowIndustryPicker(!showIndustryPicker)}
        >
          <Text style={{ color: industry ? theme.text : theme.textMuted }}>
            {industry || 'Select your industry'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {showIndustryPicker && (
          <View style={[styles.pickerContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            {READY_INDUSTRIES.map((ind) => (
              <TouchableOpacity 
                key={ind} 
                style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                onPress={() => { setIndustry(ind); setShowIndustryPicker(false); }}
              >
                <Text style={{ color: theme.text, padding: 12 }}>{ind}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Phone Number (optional)</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          placeholder="080 1234 5678" 
          placeholderTextColor={theme.textMuted} 
          keyboardType="phone-pad"
          value={phone} 
          onChangeText={setPhone} 
        />

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 24, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  pickerContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  pickerItem: { borderBottomWidth: 1 },
});