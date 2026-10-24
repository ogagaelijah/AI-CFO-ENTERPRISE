import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  
  // Determine which tabs to show based on role
  const role = user?.role || 'OWNER';
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';
  
  // Base tabs for everyone
  const availableTabs = ['Profile', 'Security'];
  
  // Add privileged tabs only for Owner/Admin
  if (isOwnerOrAdmin) {
    availableTabs.push('Business', 'Subscription', 'Team');
  }

  // Set initial tab (respecting the route params if passed from ProfileScreen)
  const initialTab = route.params?.tab && availableTabs.includes(route.params.tab) 
    ? route.params.tab 
    : 'Profile';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  // Profile State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  // Business State
  const [businessName, setBusinessName] = useState(user?.businessName || 'AI CFO ENTERPRISE');
  const [industry, setIndustry] = useState(user?.industry || 'RETAIL');

  // Security (2FA) State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.twoFactorEnabled || false);

  // Subscription State
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Team State
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CASHIER');

  const fetchSubscription = async () => {
    setIsSubLoading(true);
    try {
      const [currentRes, plansRes] = await Promise.all([
        api.get('/subscription/current'),
        api.get('/subscription/plans')
      ]);
      if (currentRes.data?.success) setCurrentPlan(currentRes.data.data);
      if (plansRes.data?.success) setPlans(plansRes.data.plans || []);
    } catch (error) {
      console.log("Error fetching subscription data:", error.message);
    } finally {
      setIsSubLoading(false);
    }
  };

  const fetchTeam = async () => {
    setIsTeamLoading(true);
    try {
      const res = await api.get('/team');
      if (res.data?.success) {
        setMembers(res.data.data.members || []);
        setInvites(res.data.data.pendingInvites || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load team');
    } finally {
      setIsTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Team' && isOwnerOrAdmin) fetchTeam();
    if (activeTab === 'Subscription' && isOwnerOrAdmin) fetchSubscription();
  }, [activeTab, isOwnerOrAdmin]);

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) return Alert.alert('Error', 'Name cannot be empty');
    setLoading(true);
    try {
      await api.put('/auth/profile', { fullName, phoneNumber });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart2FA = async () => {
    setIs2FALoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      if (res.data?.success) {
        setSecret(res.data.data.secret);
        setShow2FAModal(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate 2FA setup');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (otpCode.length !== 6) return Alert.alert('Error', 'Please enter a 6-digit code');
    setIs2FALoading(true);
    try {
      await api.post('/auth/2fa/enable', { code: otpCode });
      Alert.alert('Success', '2FA Enabled successfully!');
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setOtpCode('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid code');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (otpCode.length !== 6) return Alert.alert('Error', 'Please enter your 6-digit code to disable 2FA');
    setIs2FALoading(true);
    try {
      await api.post('/auth/2fa/disable', { code: otpCode });
      Alert.alert('Success', '2FA Disabled successfully.');
      setIs2FAEnabled(false);
      setShow2FAModal(false);
      setOtpCode('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid code');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return Alert.alert('Error', 'Email is required');
    setLoading(true);
    try {
      await api.post('/team/invite', { email: inviteEmail.trim(), role: inviteRole });
      Alert.alert('Success', 'Invite sent successfully');
      setShowInviteModal(false);
      setInviteEmail('');
      fetchTeam();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (planId) => {
    Linking.openURL(`https://aicfotechnologies.com/dashboard?tab=subscription&plan=${planId}`);
  };

  // ─── RENDER TABS ───
  const renderProfile = () => (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Full Name</Text>
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={fullName} onChangeText={setFullName} />

      <Text style={[styles.label, { color: theme.textMuted }]}>Email</Text>
      <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.textMuted, borderColor: theme.border }]} value={user?.email} editable={false} />

      <Text style={[styles.label, { color: theme.textMuted }]}>Phone Number</Text>
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderBusiness = () => (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 16 }}>Manage your business details</Text>
      
      <Text style={[styles.label, { color: theme.textMuted }]}>Business Name</Text>
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={businessName} onChangeText={setBusinessName} />

      <Text style={[styles.label, { color: theme.textMuted }]}>Industry</Text>
      <View style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
         <Text style={{ color: theme.text }}>{industry}</Text>
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} onPress={() => Alert.alert('Notice', 'Business update endpoint required on backend.')}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderSecurity = () => (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Two-Factor Authentication (2FA)</Text>
      <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 16 }}>
        Add an extra layer of security to your account.
      </Text>

      {is2FAEnabled ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={{ color: theme.success, fontWeight: 'bold' }}>2FA is Enabled</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.danger + '20', borderWidth: 1, borderColor: theme.danger }]} onPress={() => { setOtpCode(''); setShow2FAModal('disable'); }}>
            <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Disable 2FA</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.primary }]} onPress={handleStart2FA} disabled={is2FALoading}>
          {is2FALoading ? <ActivityIndicator color={theme.primary} /> : <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Enable 2FA</Text>}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSubscription = () => {
    if (isSubLoading) {
      return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />;
    }

    return (
      <View>
        {currentPlan && (
          <View style={[styles.card, { backgroundColor: theme.primary }]}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Current Plan</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {currentPlan.planName || 'Trial'} 
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14 }}>
                {currentPlan.status === 'trial' 
                  ? `Expires in ${Math.max(0, Math.ceil((new Date(currentPlan.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)))} days` 
                  : `Active until ${new Date(currentPlan.endDate).toLocaleDateString()}`}
              </Text>
            </View>
          </View>
        )}

        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 12, marginTop: 8 }}>Upgrade Plan</Text>
        
        {plans.map((plan, index) => {
          const isYearly = billingCycle === 'yearly';
          const amount = isYearly ? plan.pricing?.yearly : plan.pricing?.monthly;
          const isPopular = plan.id === 'pro';
          
          return (
            <View key={plan.id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isPopular ? theme.primary : theme.border }]}>
              {isPopular && (
                <View style={{ position: 'absolute', top: -10, right: 20, backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>POPULAR</Text>
                </View>
              )}
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{plan.name}</Text>
              <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 16 }}>{plan.description}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.primary }}>₦{Number(amount || 0).toLocaleString()}</Text>
                <Text style={{ fontSize: 14, color: theme.textMuted, marginLeft: 4 }}>/{isYearly ? 'yr' : 'mo'}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: isPopular ? theme.primary : theme.cardBg, borderWidth: isPopular ? 0 : 1, borderColor: theme.primary }]} 
                onPress={() => handleUpgrade(plan.id)}
              >
                <Text style={{ color: isPopular ? '#fff' : theme.primary, fontWeight: 'bold' }}>Upgrade to {plan.name}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTeam = () => (
    <View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={() => setShowInviteModal(true)}>
        <Ionicons name="person-add" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Invite Member</Text>
      </TouchableOpacity>

      {isTeamLoading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : (
        <>
          {invites.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.warning, marginBottom: 8 }}>Pending Invites</Text>
              {invites.map(invite => (
                <View key={invite.id} style={[styles.memberCard, { backgroundColor: theme.background, borderColor: theme.border, borderStyle: 'dashed' }]}>
                  <Text style={{ color: theme.textMuted, flex: 1 }}>{invite.email}</Text>
                  <Text style={{ color: theme.warning, fontWeight: 'bold' }}>Pending</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Active Members</Text>
          {members.map(item => (
            <View key={item.id} style={[styles.memberCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                  {item.userFullName || 'Unknown User'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>
                  {item.userEmail || 'No email'}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: theme.primary + '20' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary }}>{item.role}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Top Tabs - Dynamic based on role */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {availableTabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, { borderColor: theme.border, backgroundColor: theme.cardBg }, activeTab === tab && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={{ color: activeTab === tab ? '#fff' : theme.text, fontWeight: 'bold' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {activeTab === 'Profile' && renderProfile()}
        {activeTab === 'Security' && renderSecurity()}
        {activeTab === 'Business' && isOwnerOrAdmin && renderBusiness()}
        {activeTab === 'Subscription' && isOwnerOrAdmin && renderSubscription()}
        {activeTab === 'Team' && isOwnerOrAdmin && renderTeam()}
        
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.danger + '20', marginTop: 24, marginBottom: 40 }]} onPress={logout}>
          <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 2FA Modal */}
      <Modal visible={!!show2FAModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 16 }}>
              {show2FAModal === 'disable' ? 'Disable 2FA' : 'Setup 2FA'}
            </Text>
            {show2FAModal !== 'disable' && (
              <View style={{ padding: 16, backgroundColor: theme.background, borderRadius: 8, marginBottom: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Secret Key</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, letterSpacing: 2 }}>{secret}</Text>
              </View>
            )}
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, fontSize: 24, textAlign: 'center', letterSpacing: 8 }]} placeholder="000000" placeholderTextColor={theme.textMuted} keyboardType="numeric" maxLength={6} value={otpCode} onChangeText={setOtpCode} />
            <TouchableOpacity style={[styles.btn, { backgroundColor: show2FAModal === 'disable' ? theme.danger : theme.success, marginTop: 16 }, is2FALoading && { opacity: 0.7 }]} onPress={show2FAModal === 'disable' ? handleDisable2FA : handleEnable2FA} disabled={is2FALoading}>
              {is2FALoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>{show2FAModal === 'disable' ? 'Disable 2FA' : 'Verify & Enable'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShow2FAModal(false)}>
              <Text style={{ color: theme.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 16 }}>Invite Team Member</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Email Address</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="name@example.com" placeholderTextColor={theme.textMuted} keyboardType="email-address" autoCapitalize="none" value={inviteEmail} onChangeText={setInviteEmail} />
            <Text style={[styles.label, { color: theme.textMuted }]}>Role</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['CASHIER', 'MANAGER', 'ADMIN'].map(r => (
                <TouchableOpacity key={r} style={[{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border }, inviteRole === r && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setInviteRole(r)}>
                  <Text style={{ color: inviteRole === r ? '#fff' : theme.text, fontWeight: 'bold' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} onPress={handleInvite} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send Invite</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowInviteModal(false)}>
              <Text style={{ color: theme.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: 'bold' },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20, position: 'relative' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  memberCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
});