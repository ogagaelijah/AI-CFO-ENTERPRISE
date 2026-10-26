// mobile/src/context/AuthContext.js
// v2.0.0-prod — Adds subscription state (isReadOnly, subscriptionStatus).
//               Includes fail-open safety net + dashboard cache warming.

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notifications';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Subscription State
  const [subscriptionStatus, setSubscriptionStatus] = useState('ACTIVE');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // ─── Subscription Fetcher ───
  const checkSubscription = useCallback(async () => {
    try {
      const response = await api.get('/subscription/current');
      if (response.data?.success && response.data?.data) {
        const status = response.data.data.status;
        const readOnly = response.data.data.isReadOnly === true || status === 'EXPIRED' || status === 'READ_ONLY';
        
        setSubscriptionStatus(status);
        setIsReadOnly(readOnly);
      }
    } catch (error) {
      // ⚠️ FAIL-OPEN SAFETY RULE: 
      // If the network fails (not a 403 Forbidden), we must NOT lock the user out.
      // We default to ACTIVE so they can continue working until the network is stable.
      console.warn('⚠️ Subscription check failed, defaulting to ACTIVE (fail-open).', error.message);
      setSubscriptionStatus('ACTIVE');
      setIsReadOnly(false);
    }
  }, []);

  // ─── Initial Load & Auth Validation ───
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const userData = await SecureStore.getItemAsync('userData');
        if (token && userData) {
          setUser(JSON.parse(userData));
          // Check subscription and warm dashboard cache
          await checkSubscription();
          api.get('/dashboard/summary').catch(() => {}); 
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, [checkSubscription]);

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
        
        // Trigger heavy background tasks (not awaited to block UI)
        await handlePushToken();
        await checkSubscription();
        api.get('/dashboard/summary').catch(() => {}); // Cache warm

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
        await checkSubscription();
        api.get('/dashboard/summary').catch(() => {}); // Cache warm

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
    setSubscriptionStatus('ACTIVE');
    setIsReadOnly(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      register, 
      logout,
      subscriptionStatus,
      isReadOnly,
      checkSubscription // Exposed so screens can force-check if needed
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);