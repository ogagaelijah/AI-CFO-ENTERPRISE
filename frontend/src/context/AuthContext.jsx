// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authApi.getCurrentUser();
        if (response.data?.user) {
          const userData = response.data.user;
          
          // Fetch subscription plan
          try {
            const subResponse = await api.get('/subscription/current');
            if (subResponse.data?.plan) {
              userData.plan = subResponse.data.plan;
            } else {
              userData.plan = 'free';
            }
          } catch (subError) {
            console.log('No active subscription, defaulting to free');
            userData.plan = 'free';
          }
          
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log('Not authenticated');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const register = async (userData) => {
    const response = await authApi.register(userData);
    if (response.data?.user) {
      const user = response.data.user;
      user.plan = 'free';
      setUser(user);
      setIsAuthenticated(true);
    }
    return response.data;
  };

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    if (response.data?.user) {
      const user = response.data.user;
      
      // Fetch subscription plan
      try {
        const subResponse = await api.get('/subscription/current');
        if (subResponse.data?.plan) {
          user.plan = subResponse.data.plan;
        } else {
          user.plan = 'free';
        }
      } catch (subError) {
        user.plan = 'free';
      }
      
      setUser(user);
      setIsAuthenticated(true);
    }
    return response.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    setUser,
    isLoading,
    isAuthenticated,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};