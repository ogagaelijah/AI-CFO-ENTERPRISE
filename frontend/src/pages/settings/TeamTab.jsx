// frontend/src/pages/settings/TeamTab.jsx
// v1.3.0-prod — Fixes trial bug. Bypasses plan limits for Platform Staff.

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, RefreshCw, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import useRole from '../../hooks/useRole';
import api from '../../services/api';
import InviteMemberModal from '../../components/team/InviteMemberModal';
import MemberRow from '../../components/team/MemberRow';

const TeamTab = () => {
  const { user } = useAuth();
  const { planData } = usePlan();
  const { isPlatformStaff } = useRole();
  
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isResendingId, setIsResendingId] = useState(null);

  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';

  // ★ FIXED: If status is 'trial', treat them as Pro (do not block)
  const isTrial = planData?.status === 'trial' || planData?.isTrial === true;
  const isBasicPlan = !isPlatformStaff && !isTrial && (planData?.id === 'basic' || planData?.id === 'free');
  
  const maxUsers = isPlatformStaff ? -1 : (planData?.limits?.users || (isTrial ? 3 : 1));
  const isLimitReached = maxUsers !== -1 && members.length >= maxUsers;

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/team');
      if (res.data?.success) {
        setMembers(res.data.data?.members || []);
        setPendingInvites(res.data.data?.pendingInvites || []);
      } else {
        setError(res.data?.message || 'Failed to load team');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleInviteSuccess = () => {
    setIsInviteModalOpen(false);
    setSuccess('Invite sent!');
    loadTeam();
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleResendInvite = async (invite) => {
    setIsResendingId(invite.id);
    try {
      const res = await api.post(`/team/invite/${invite.id}/resend`);
      if (res.data?.success) {
        setSuccess(`Invite resent to ${invite.email}`);
        loadTeam();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(res.data?.message || 'Failed to resend invite');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend invite');
    } finally {
      setIsResendingId(null);
    }
  };

  const handleRevokeInvite = async (invite) => {
    if (!window.confirm(`Revoke the invite for ${invite.email}?`)) return;
    try {
      const res = await api.delete(`/team/invite/${invite.id}`);
      if (res.data?.success) {
        setSuccess('Invite revoked');
        loadTeam();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(res.data?.message || 'Failed to revoke invite');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke invite');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  const canInvite = isOwner || isAdmin || isPlatformStaff;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Team members
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {members.length} {members.length === 1 ? 'member' : 'members'} ·{' '}
            {pendingInvites.length} pending {pendingInvites.length === 1 ? 'invite' : 'invites'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTeam}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          {canInvite && !isBasicPlan && !isLimitReached && (
            <button
              onClick={() => { setError(''); setIsInviteModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
            >
              <UserPlus className="w-4 h-4" />
              Invite member
            </button>
          )}

          {canInvite && (isBasicPlan || isLimitReached) && (
            <Link
              to="/subscription"
              className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-slate-900 rounded-lg font-medium transition"
            >
              <Lock className="w-4 h-4" />
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  onChanged={loadTeam}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Pending invites
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {invite.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Invited as <span className="font-medium">{invite.role}</span> ·{' '}
                      expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleResendInvite(invite)}
                      disabled={isResendingId === invite.id}
                      className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-gold-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition disabled:opacity-60"
                    >
                      {isResendingId === invite.id ? 'Sending…' : 'Resend'}
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
        isOwner={isOwner}
      />
    </div>
  );
};

export default TeamTab;