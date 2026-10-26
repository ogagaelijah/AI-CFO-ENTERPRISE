// mobile/src/context/NotificationContext.js
// v2.1.0-prod — Graceful network error handling. Keeps previous state on fail.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const applyNotifications = (items, count) => {
    const arr = Array.isArray(items) ? items : [];
    setNotifications(arr);
    
    if (typeof count === 'number') {
      setUnreadCount(count);
    } else {
      // FIX: !n.is_read correctly catches false, 0, null, and undefined
      setUnreadCount(arr.filter(n => !n.is_read).length);
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        applyNotifications(res.data.data, res.data.unreadCount);
      }
    } catch (err) {
      // ★ GRACEFUL FALLBACK: Do NOT clear the notifications or badge on network failure.
      // Only log as a warning (not an error) to avoid red screens in dev.
      if (err.message !== 'Network Error') {
        console.warn('⚠️ Notification fetch failed:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch once when the user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      // If we can't reach the server, we keep the optimistic update. 
      // It will sync on the next successful fetch.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      try {
        await api.put('/notifications/read-all');
      } catch {
        await Promise.all(unread.map(n => api.put(`/notifications/${n.id}/read`).catch(() => null)));
      }
    } catch (err) {
      // Silent fail — optimistic update already applied
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};