import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const VerifyEmailScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [checking, setChecking] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      // Fetch latest user data to check if email_verified is now true
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data.user.emailVerified) {
        Alert.alert('Verified!', 'Your email has been verified. Welcome to AI CFO!', [
          { text: 'Continue', onPress: () => navigation.replace('Main') }
        ]);
      } else {
        Alert.alert('Not Verified', 'We could not confirm your email yet. Please click the link in your email and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not check verification status.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name="mail" size={48} color={theme.primary} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
      
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        We sent a verification link to {'\n'}
        <Text style={{ fontWeight: 'bold', color: theme.text }}>{user?.email}</Text>
      </Text>

      <Text style={[styles.instructions, { color: theme.textMuted }]}>
        Click the link in that email to verify your account. Once you have verified, tap the button below.
      </Text>

      <TouchableOpacity 
        style={[styles.primaryBtn, { backgroundColor: theme.primary }, checking && { opacity: 0.7 }]} 
        onPress={handleCheckVerification}
        disabled={checking}
      >
        {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>I have verified my email</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.secondaryBtn, { borderColor: theme.border }]} 
        onPress={() => api.post('/auth/resend-verification', { email: user?.email }).then(() => Alert.alert('Sent', 'A new verification email has been sent.'))}
      >
        <Text style={{ color: theme.text, fontWeight: '600' }}>Resend verification email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 30 }} onPress={logout}>
        <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  instructions: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  primaryBtn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
});