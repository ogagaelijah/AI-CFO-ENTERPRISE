// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

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
          console.log('🔍 Auth check user:', response.data.user); // Debug log
          setUser(response.data.user);
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
    console.log('🔍 Register response:', response.data); // Debug log
    if (response.data?.user) {
      setUser(response.data.user);
      setIsAuthenticated(true);
    }
    return response.data;
  };

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    console.log('🔍 Login response user:', response.data?.user); // Debug log
    if (response.data?.user) {
      setUser(response.data.user);
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