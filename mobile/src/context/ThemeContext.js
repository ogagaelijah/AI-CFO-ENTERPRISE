import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('@app_theme');
      if (savedTheme) setIsDark(savedTheme === 'dark');
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    await AsyncStorage.setItem('@app_theme', newTheme ? 'dark' : 'light');
  };

  // Define the color palettes
  const theme = isDark ? {
    isDark: true,
    background: '#0F172A', // Slate 900
    cardBg: '#1E293B',     // Slate 800
    text: '#F8FAFC',       // Slate 50
    textMuted: '#94A3B8',  // Slate 400
    border: '#334155',     // Slate 700
    inputBg: '#0F172A',
    primary: '#3B82F6',    // Blue 500
    success: '#10B981',    // Green 500
    danger: '#EF4444',     // Red 500
    warning: '#F59E0B',    // Amber 500
    badgeGreen: '#064E3B',
    badgeOrange: '#78350F',
    badgeRed: '#7F1D1D',
  } : {
    isDark: false,
    background: '#f2f2f7',
    cardBg: '#ffffff',
    text: '#1C1C1E',
    textMuted: '#8E8E93',
    border: '#E5E5EA',
    inputBg: '#ffffff',
    primary: '#007AFF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    badgeGreen: '#E5F9E5',
    badgeOrange: '#FFF4E5',
    badgeRed: '#FFE5E5',
  };

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);