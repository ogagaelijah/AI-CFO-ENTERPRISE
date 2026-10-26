// mobile/src/context/NotificationContext.js
// Single source of truth for notifications. Badge count, list, and mark-as-read
// all live here so every screen stays in sync automatically.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyNotifications = (items, count) => {
    const arr = Array.isArray(items) ? items : [];
    setNotifications(arr);
    if (typeof count === 'number') {
      setUnreadCount(count);
    } else {
      setUnreadCount(arr.filter(n => n.is_read === false || n.is_read === 0).length);
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        applyNotifications(res.data.data, res.data.unreadCount);
      }
    } catch (err) {
      console.log('❌ Notification fetch error:', err?.message);
      setError('Could not load notifications.');
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
      console.log('❌ Mark-as-read failed, refetching:', err?.message);
      // Revert by refetching the truth
      fetchNotifications();
    }
  }, [fetchNotifications]);

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
      console.log('❌ Mark-all failed, refetching:', err?.message);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
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