// frontend/src/context/NotificationContext.jsx
// Single source of truth for web notifications. Badge, list, and mark-as-read
// stay in sync across all components.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const applyData = (items, count) => {
    const arr = Array.isArray(items) ? items : [];
    setNotifications(arr);
    if (typeof count === 'number') setUnreadCount(count);
    else setUnreadCount(arr.filter(n => n.is_read === false || n.is_read === 0).length);
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
      if (res.data?.success) applyData(res.data.data, res.data.unreadCount);
    } catch (err) {
      console.error('❌ Notification fetch error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error('❌ Mark-as-read failed, refetching:', err?.message);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      try {
        await api.put('/notifications/read-all');
      } catch {
        await Promise.all(unread.map(n => api.put(`/notifications/${n.id}/read`).catch(() => null)));
      }
    } catch (err) {
      console.error('❌ Mark-all failed, refetching:', err?.message);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};