// mobile/src/screens/RegisterScreen.js
// v1.1.0-prod — Fixes industry label to "Wholesale / Retail".

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// Value sent to backend stays as 'RETAIL' (matches web's normalizeIndustry)
// But the label shown to the user is 'Wholesale / Retail'
const READY_INDUSTRIES = [
  { value: 'RETAIL', label: 'Wholesale / Retail' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'CONSULTANCY', label: 'Consultancy / Services' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'NGO', label: 'NGO / Non-profit' },
];

const COMING_SOON_INDUSTRIES = [
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'LOGISTICS', label: 'Logistics' },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) return Alert.alert('Error', 'Full name is required');
    if (!businessName.trim()) return Alert.alert('Error', 'Business name is required');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return Alert.alert('Error', 'Valid email is required');
    if (!password || password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (!industry) return Alert.alert('Error', 'Please select an industry');

    setLoading(true);
    const payload = {
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      password,
      industry,
    };

    const result = await register(payload);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.message || 'Please check your details');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.cardBg }]}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.text }]}>Get Started</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Create your account — 14 days free</Text>
        </View>

        <Text style={[styles.label, { color: theme.textMuted }]}>Full Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="John Doe"
          placeholderTextColor={theme.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Business Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Joe's Electronics"
          placeholderTextColor={theme.textMuted}
          value={businessName}
          onChangeText={setBusinessName}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Email *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="you@example.com"
          placeholderTextColor={theme.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Phone (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="08012345678"
          placeholderTextColor={theme.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Password *</Text>
        <View style={[styles.passwordWrap, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <TextInput
            style={{ flex: 1, padding: 15, color: theme.text }}
            placeholder="Minimum 8 characters"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 15 }}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>Industry *</Text>
        <View style={styles.industryWrap}>
          {READY_INDUSTRIES.map(ind => (
            <TouchableOpacity
              key={ind.value}
              style={[
                { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg }, 
                industry === ind.value && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setIndustry(ind.value)}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: industry === ind.value ? '#fff' : theme.text }}>
                {ind.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {COMING_SOON_INDUSTRIES.map(ind => (
            <View
              key={ind.value}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, opacity: 0.5 }}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted }}>{ind.label} (Soon)</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start 14-day free trial</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textMuted }}>Already have an account? <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Log In</Text></Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginTop: 30, marginBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  titleWrap: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { padding: 15, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  industryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkBtn: { alignItems: 'center', marginTop: 20 }
});