import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

export const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleOpenNotification = async (notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  const handleNavigate = (type) => {
    setSelectedNotification(null);
    if (type === 'NEW_SALE') {
      navigation.navigate('Main', { screen: 'History' });
    } else if (type === 'OVERDUE_DEBTOR') {
      navigation.navigate('Main', { screen: 'Debtors' });
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {unreadCount > 0 && (
          <View style={[styles.headerBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity 
              onPress={handleMarkAll}
              style={[styles.markAllBtn, { backgroundColor: theme.primary + '15' }]}
            >
              <Ionicons name="checkmark-done" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
              {!item.is_read && (
                <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>

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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: { marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  textContainer: { flex: 1 },
  title: { fontSize: 16, marginBottom: 4 },
  message: { fontSize: 14, marginBottom: 6 },
  date: { fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});