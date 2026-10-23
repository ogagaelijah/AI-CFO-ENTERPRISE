import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationService';

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

        // ★ Register for push notifications
        try {
          console.log("🔔 Requesting push token...");
          const pushToken = await registerForPushNotificationsAsync();
          console.log("🔔 Push Token Received:", pushToken);
          
          if (pushToken) {
            const response = await api.post('/users/push-token', { pushToken });
            console.log("🔔 Token saved to backend:", response.data);
          }
        } catch (pushError) {
          // ★ This catches the error and prevents the app from crashing
          console.log("🔔 PUSH ERROR:", pushError.message);
        }

        return { success: true };
      }

      return { success: false, message: "UNKNOWN RESPONSE: " + JSON.stringify(data) };

    } catch (error) {
      console.log("🔴 RAW LOGIN ERROR:", error.message);
      console.log("🔴 SERVER RESPONSE:", JSON.stringify(error.response?.data));
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);