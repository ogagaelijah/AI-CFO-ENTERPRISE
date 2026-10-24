import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const displayName = user?.businessName || user?.business_name || user?.fullName || 'User';
  const role = user?.role || 'OWNER';
  
  // ★ NEW: Check permissions
  const canManageTeam = role === 'OWNER' || role === 'ADMIN';

  const MenuItem = ({ icon, title, subtitle, onPress, isDanger }) => (
    <TouchableOpacity 
      style={[styles.menuItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: isDanger ? theme.danger + '20' : theme.primary + '20' }]}>
        <Ionicons name={icon} size={22} color={isDanger ? theme.danger : theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, { color: isDanger ? theme.danger : theme.text }]}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: theme.textMuted }}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={styles.container}>
        
        {/* ─── TOP PROFILE CARD (Bybit Style) ─── */}
        <View style={[styles.profileHeader, { backgroundColor: theme.cardBg }]}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 14, marginBottom: 12 }}>{user?.email}</Text>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.badge, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="shield-checkmark" size={12} color={theme.success} />
              <Text style={[styles.badgeText, { color: theme.success }]}>Verified</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>{role}</Text>
            </View>
          </View>
        </View>

        {/* ─── MENU ITEMS ─── */}
        <View style={{ padding: 16, gap: 12 }}>
          <MenuItem 
            icon="person-outline" 
            title="Account Settings" 
            subtitle="Profile, Business Details"
            onPress={() => navigation.navigate('Settings', { tab: 'Profile' })} 
          />
          
          <MenuItem 
            icon="shield-outline" 
            title="Security & 2FA" 
            subtitle="Password, Two-Factor Auth"
            onPress={() => navigation.navigate('Settings', { tab: 'Security' })} 
          />

          {/* ★ HIDDEN FOR CASHIERS */}
          {canManageTeam && (
            <MenuItem 
              icon="people-outline" 
              title="Team Management" 
              subtitle="Manage roles and invites"
              onPress={() => navigation.navigate('TeamManagement')} 
            />
          )}

          <MenuItem 
            icon="log-out-outline" 
            title="Log Out" 
            isDanger
            onPress={logout} 
          />
        </View>

        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>AI CFO Enterprise v1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { 
    padding: 24, 
    paddingTop: 60, 
    alignItems: 'center', 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24,
    marginBottom: 16,
    position: 'relative'
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 10
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1,
    gap: 12
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  menuTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
});