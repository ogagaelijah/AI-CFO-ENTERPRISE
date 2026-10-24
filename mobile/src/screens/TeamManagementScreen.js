import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const TeamManagementScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const canManageTeam = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [isInviting, setIsInviting] = useState(false);

  const fetchTeam = async () => {
    try {
      const res = await api.get('/team');
      if (res.data?.success) {
        setMembers(res.data.data.members || []);
        setInvites(res.data.data.pendingInvites || []);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Email is required');
    setIsInviting(true);
    try {
      await api.post('/team/invite', { email: email.trim(), role });
      Alert.alert('Success', 'Invite sent successfully');
      setShowInviteModal(false);
      setEmail('');
      fetchTeam();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  // ★ NEW: Delete member logic
  const handleDeleteMember = (member) => {
    // Prevent deleting yourself
    if (member.userId === user.id) {
      return Alert.alert('Action Denied', 'You cannot remove yourself. Transfer ownership or ask another admin to remove you.');
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.userFullName || member.userEmail} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/team/${member.id}`);
              Alert.alert('Success', 'Member removed from team');
              fetchTeam();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove member');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderMember = ({ item }) => (
    <View style={[styles.memberCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
          {item.userFullName || 'Unknown User'}
        </Text>
        <Text style={{ fontSize: 12, color: theme.textMuted }}>
          {item.userEmail || 'No email'}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: theme.primary + '20' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary }}>{item.role}</Text>
        </View>

        {/* ★ NEW: Delete Button (Hidden for self, only for managers) */}
        {canManageTeam && item.userId !== user.id && (
          <TouchableOpacity 
            onPress={() => handleDeleteMember(item)}
            disabled={actionLoading}
            style={{ padding: 4, opacity: actionLoading ? 0.5 : 1 }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Team Members</Text>
        
        {canManageTeam ? (
          <TouchableOpacity onPress={() => setShowInviteModal(true)}>
            <Ionicons name="person-add" size={24} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMember}
          ListHeaderComponent={
            invites.length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.warning, marginBottom: 8 }}>Pending Invites</Text>
                {invites.map(invite => (
                  <View key={invite.id} style={[styles.memberCard, { backgroundColor: theme.background, borderColor: theme.border, borderStyle: 'dashed' }]}>
                    <Text style={{ color: theme.textMuted, flex: 1 }}>{invite.email}</Text>
                    <Text style={{ color: theme.warning, fontWeight: 'bold' }}>Pending</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 16 }}>Invite Team Member</Text>
            
            <Text style={[styles.label, { color: theme.textMuted }]}>Email Address</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
              placeholder="name@example.com" 
              placeholderTextColor={theme.textMuted} 
              keyboardType="email-address"
              autoCapitalize="none"
              value={email} 
              onChangeText={setEmail} 
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>Role</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['CASHIER', 'MANAGER', 'ADMIN'].map(r => (
                <TouchableOpacity 
                  key={r}
                  style={[{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border }, role === r && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setRole(r)}
                >
                  <Text style={{ color: role === r ? '#fff' : theme.text, fontWeight: 'bold' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.primary }, isInviting && { opacity: 0.7 }]} 
              onPress={handleInvite}
              disabled={isInviting}
            >
              {isInviting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send Invite</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={{ color: theme.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  memberCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
});