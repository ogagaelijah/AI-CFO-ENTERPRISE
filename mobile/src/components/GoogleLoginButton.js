// mobile/src/components/GoogleLoginButton.js
// v1.2.0 — Diagnostic logging, real error messages in alerts, defensive result handling.
// v1.1.0 — Removes manual navigation after loginWithToken (AppNavigator handles it).
// v1.0.0 — Custom Google Auth Button for Mobile.

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const GoogleLoginButton = ({ navigation }) => {
  const { theme } = useTheme();
  const { loginWithToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (idToken) => {
    console.log('🟢 [1] Got Google idToken, length:', idToken?.length);
    setLoading(true);

    try {
      console.log('🟢 [2] Calling backend /auth/google ...');
      const res = await authApi.googleAuth(idToken);
      console.log('🟢 [3] Backend responded, status:', res.status);
      console.log('🟢 [3] Backend keys:', Object.keys(res.data || {}));

      if (res.data?.needsOnboarding) {
        // New user -> Go to Onboarding (this is the ONLY manual navigation)
        navigation.navigate('GoogleOnboarding', {
          email: res.data.email,
          fullName: res.data.fullName,
          googleId: res.data.googleId,
        });
        return;
      }

      if (res.data?.token) {
        console.log('🟢 [4] Got app token, calling loginWithToken ...');
        const result = await loginWithToken(res.data.token);
        console.log('🟢 [5] loginWithToken result:', JSON.stringify(result));

        if (!result?.success) {
          Alert.alert('Login Error', result?.message || 'Could not sign you in');
        }
        // No navigation here: AppNavigator switches stacks as soon as `user` is set.
        return;
      }

      // Backend answered 200 but without a token or onboarding flag
      console.log('🔴 Unexpected backend response:', JSON.stringify(res.data));
      Alert.alert('Error', 'Unexpected response from server. Please try again.');
    } catch (error) {
      console.log('🔴 GOOGLE BACKEND ERROR');
      console.log('status:', error.response?.status);
      console.log('data:', JSON.stringify(error.response?.data));
      console.log('message:', error.message);
      console.log('code:', error.code);

      const serverMessage = error.response?.data?.message;
      const status = error.response?.status;

      let message;
      if (serverMessage) {
        message = serverMessage;
      } else if (!error.response) {
        message = `Network error (${error.code || 'no response'}): ${error.message}`;
      } else {
        message = `Server error ${status}`;
      }

      Alert.alert('Google Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const { promptAsync, isLoading: isPromptLoading } = useGoogleAuth({
    onSuccess: handleGoogleSuccess,
    onError: (msg) => {
      console.log('🔴 Google sign-in step error:', msg);
      Alert.alert('Google Sign-In Error', msg);
    },
  });

  const isLoading = loading || isPromptLoading;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
      onPress={() => promptAsync()}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <View style={styles.content}>
          <Ionicons name="logo-google" size={20} color={theme.text} style={{ marginRight: 10 }} />
          <Text style={[styles.text, { color: theme.text }]}>Continue with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 15,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});