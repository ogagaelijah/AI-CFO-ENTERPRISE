import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

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

      // 1. Handle 2FA (Your backend returns success:true, requires2FA:true)
      if (data.requires2FA) {
        return { 
          success: false, 
          requires2FA: true, 
          tempToken: data.tempToken,
          message: data.message || '2FA code required'
        };
      }

      // 2. Handle successful login (backend sends 'token' and 'user')
      if (data.success && data.token && data.user) {
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      }

      // 3. Fallback debug if something is still missing
      return { success: false, message: "UNKNOWN RESPONSE: " + JSON.stringify(data) };

    } catch (error) {
      console.log("LOGIN ERROR:", error.response?.data);
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