import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for the detail modal
  const [selectedNotification, setSelectedNotification] = useState(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // 1. Open the modal and mark as read
  const handleOpenNotification = async (notification) => {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        // Update local state so it turns grey immediately
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  // 2. Navigate from inside the modal
  const handleNavigate = (type) => {
    setSelectedNotification(null); // Close modal
    if (type === 'NEW_SALE') {
      navigation.navigate('Main', { screen: 'History' });
    } else if (type === 'OVERDUE_DEBTOR') {
      navigation.navigate('Main', { screen: 'Debtors' });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: theme.textMuted }}>No notifications yet.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationCard,
                { backgroundColor: item.is_read ? theme.cardBg : theme.primary + '20', borderColor: theme.border }
              ]}
              onPress={() => handleOpenNotification(item)}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={item.type === 'NEW_SALE' ? 'cart' : 'warning'}
                  size={24}
                  color={item.type === 'NEW_SALE' ? theme.primary : theme.warning}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: theme.text, fontWeight: item.is_read ? '500' : 'bold' }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.message, { color: theme.textMuted }]} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={[styles.date, { color: theme.textMuted }]}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Read-Only Notification Detail Modal */}
      <Modal visible={!!selectedNotification} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 20, width: '100%', padding: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={selectedNotification?.type === 'NEW_SALE' ? 'cart' : 'warning'}
                  size={28}
                  color={selectedNotification?.type === 'NEW_SALE' ? theme.primary : theme.warning}
                />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
                  {selectedNotification?.type === 'NEW_SALE' ? 'Sale Alert' : 'Debtor Alert'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedNotification(null)}>
                <Ionicons name="close-circle" size={28} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
              {selectedNotification?.title}
            </Text>

            <View style={{ padding: 16, backgroundColor: theme.background, borderRadius: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 15, color: theme.text, lineHeight: 22 }}>
                {selectedNotification?.message}
              </Text>
            </View>

            <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 24 }}>
              {selectedNotification && new Date(selectedNotification.created_at).toLocaleString()}
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={() => handleNavigate(selectedNotification?.type)}
            >
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {selectedNotification?.type === 'NEW_SALE' ? 'View Sales History' : 'View Debtors'}
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: { flex: 1 },
  title: { fontSize: 16, marginBottom: 4 },
  message: { fontSize: 14, marginBottom: 6 },
  date: { fontSize: 12 },
});