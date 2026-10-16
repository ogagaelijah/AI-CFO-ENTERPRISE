// frontend/src/components/team/MemberRow.jsx
// v1.0.0-prod — One row in the team member table.

import { useState } from 'react';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import RoleBadge from '../common/RoleBadge';
import api from '../../services/api';

const ROLE_OPTIONS = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'];

const MemberRow = ({
  member,
  currentUserId,
  currentUserRole,
  onChanged,     // called after role change or removal
}) => {
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');

  const isSelf = member.userId === currentUserId;
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';

  // Permission rules
  const canChangeRole = isOwner && !isSelf;
  const canRemove =
    !isSelf &&
    (isOwner || (isAdmin && member.role !== 'OWNER' && member.role !== 'ADMIN'));

  const handleRoleChange = async (newRole) => {
    if (newRole === member.role || isChangingRole) return;
    setError('');
    setIsChangingRole(true);
    try {
      const res = await api.put(`/team/${member.id}/role`, { role: newRole });
      if (res.data?.success) {
        onChanged?.();
      } else {
        setError(res.data?.message || 'Failed to update role');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleRemove = async () => {
    if (isRemoving) return;
    if (!window.confirm(`Remove ${member.userFullName || member.userEmail} from the team?`)) return;
    setError('');
    setIsRemoving(true);
    try {
      const res = await api.delete(`/team/${member.id}`);
      if (res.data?.success) {
        onChanged?.();
      } else {
        setError(res.data?.message || 'Failed to remove member');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const initials = (member.userFullName || member.userEmail || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'U';

  const statusTone =
    member.status === 'ACTIVE'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-600 dark:bg-gold-500 flex items-center justify-center text-white dark:text-slate-900 text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {member.userFullName || '—'}
              {isSelf && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">(you)</span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {member.userEmail}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        {canChangeRole ? (
          <div className="flex items-center gap-2">
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={isChangingRole}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {isChangingRole && <Loader2 className="w-4 h-4 animate-spin text-primary-600" />}
          </div>
        ) : (
          <RoleBadge role={member.role} size="sm" />
        )}
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusTone}`}>
          {member.status === 'ACTIVE' ? 'Active' : member.status}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        {canRemove ? (
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-60"
            title="Remove member"
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
    </tr>
  );
};

export default MemberRow;