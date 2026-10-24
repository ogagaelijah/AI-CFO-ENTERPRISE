import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const ForgotPasswordScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (error) {
      // Backend intentionally returns success even if email doesn't exist for security
      setSent(true); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>

        {!sent ? (
          <>
            <View style={[styles.iconWrap, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="lock-closed" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Email Address"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} 
              onPress={handleSubmit} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.iconWrap, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="mail-outline" size={40} color={theme.success} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              We sent a password reset link to {'\n'}
              <Text style={{ fontWeight: 'bold', color: theme.text }}>{email}</Text>.{'\n\n'}
              Click the link in the email to reset your password, then come back to the app to log in.
            </Text>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.primary }]} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8, zIndex: 10 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  input: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  button: { padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});