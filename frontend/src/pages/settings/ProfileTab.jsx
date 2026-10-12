// src/pages/settings/ProfileTab.jsx
// v1.2.0 — Removes Change Password stub; replaces with link to forgot-password flow.
// v1.1.0 — Adds EmailStatusBadge under the Email field.
// v1.0.0 — Initial.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import api from '../../services/api';
import EmailStatusBadge from '../../components/common/EmailStatusBadge';

const ProfileTab = ({ profileData, setProfileData }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.put('/users/profile', {
        fullName: profileData.fullName,
        phoneNumber: profileData.phone,
      });
      if (res.data.success) {
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">👤 Profile Settings</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <EmailStatusBadge />
            </div>
            <input
              type="email"
              value={profileData.email}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
            />
          </div>
          {success && <p className="text-green-600 dark:text-green-400">{success}</p>}
          {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">🔒 Password</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          To change your password, use the{' '}
          <Link
            to="/forgot-password"
            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            Forgot password
          </Link>{' '}
          flow.
        </p>
      </div>
    </div>
  );
};

export default ProfileTab;