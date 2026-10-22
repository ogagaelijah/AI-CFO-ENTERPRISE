import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!identifier || !password) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);
    const credentials = { email: identifier, password: password };
    const result = await login(credentials);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Login Failed', result.message || 'Check your credentials');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>AI CFO Enterprise</Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
        placeholder="Email or Phone"
        placeholderTextColor={theme.textMuted}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
        placeholder="Password"
        placeholderTextColor={theme.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: { padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});