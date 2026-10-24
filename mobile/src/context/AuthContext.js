import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notifications';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const userData = await SecureStore.getItemAsync('userData');
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const handlePushToken = async () => {
    try {
      console.log("🔔 Requesting push token...");
      const pushToken = await registerForPushNotificationsAsync();
      console.log("🔔 Push Token Received:", pushToken);
      
      if (pushToken) {
        await api.post('/notifications/push-token', { pushToken });
        console.log("🔔 Token saved to backend");
      }
    } catch (pushError) {
      console.log("🔔 PUSH ERROR:", pushError.message);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      
      const data = response.data;
      const token = data.token || data.data?.token;
      const userData = data.user || data.data?.user;

      if (data.requires2FA) {
        return { success: false, requires2FA: true, tempToken: data.tempToken, message: data.message };
      }

      if (token && userData) {
        await SecureStore.setItemAsync('userToken', token);
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        setUser(userData);
        await handlePushToken();
        return { success: true };
      }

      return { success: false, message: "UNKNOWN RESPONSE: " + JSON.stringify(data) };

    } catch (error) {
      console.log("🔴 RAW LOGIN ERROR:", error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Login failed' 
      };
    }
  };

  const register = async (payload) => {
    try {
      const response = await api.post('/auth/register', payload);
      
      const data = response.data;
      const token = data.token || data.data?.token;
      const userData = data.user || data.data?.user;

      if (token && userData) {
        await SecureStore.setItemAsync('userToken', token);
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        setUser(userData);
        await handlePushToken();
        return { success: true };
      }

      return { success: false, message: "UNKNOWN RESPONSE: " + JSON.stringify(data) };

    } catch (error) {
      console.log("🔴 RAW REGISTER ERROR:", error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);