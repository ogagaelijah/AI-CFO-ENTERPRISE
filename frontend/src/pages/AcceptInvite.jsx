// frontend/src/pages/AcceptInvite.jsx
// v1.0.0-prod — Public page to accept a team invite.
//               Two paths:
//                 - userExists: prompt to log in (redirect)
//                 - new user: form to create account, then redirect to /login

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, AlertCircle, CheckCircle, Mail, Building2, Shield,
} from 'lucide-react';
import api from '../services/api';

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  ACCOUNTANT: 'Accountant',
};

const PASSWORD_MIN_LENGTH = 8;

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('loading'); // loading | form | userExists | invalid | done
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setPhase('invalid');
      setError('No invite token found in the link.');
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await api.get(`/team/invite/${token}`);
        if (res.data?.success) {
          setInvite(res.data.invite);
          setPhase(res.data.invite.userExists ? 'userExists' : 'form');
        } else {
          setPhase('invalid');
          setError(res.data?.message || 'Invite not found.');
        }
      } catch (err) {
        const status = err.response?.status;
        setPhase('invalid');
        setError(
          err.response?.data?.message ||
            (status === 404 ? 'Invite not found or already used.' :
             status === 400 ? 'This invite has expired.' :
             'Failed to load invite details.')
        );
      }
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/team/accept', {
        token,
        fullName: fullName.trim(),
        password,
      });
      if (res.data?.success) {
        setPhase('done');
        // Small delay, then redirect to login with success message
        setTimeout(() => {
          navigate(`/login?msg=${encodeURIComponent('Account created. Please log in to continue.')}`);
        }, 2000);
      } else {
        setError(res.data?.message || 'Failed to accept invite');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg max-w-md w-full p-6 sm:p-8 border border-gray-200 dark:border-slate-700">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-primary-600 dark:text-gold-400">
            AI CFO <span className="text-gray-900 dark:text-white">ENTERPRISE</span>
          </div>
        </div>

        {/* Loading */}
        {phase === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading invite…</p>
          </div>
        )}

        {/* Invalid */}
        {phase === 'invalid' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Invite unavailable
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 text-sm font-medium text-primary-600 dark:text-gold-400 hover:underline"
            >
              Return to home
            </Link>
          </div>
        )}

        {/* User exists — prompt to log in */}
        {phase === 'userExists' && (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              You've been invited
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You already have an account with this email. Log in to accept the invitation and
              join <strong>{invite?.businessName}</strong>.
            </p>

            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Building2 className="w-4 h-4" />
                <span>{invite?.businessName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Shield className="w-4 h-4" />
                <span>Role: <strong>{ROLE_LABELS[invite?.role] || invite?.role}</strong></span>
              </div>
            </div>

            <Link
              to={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
              className="block w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium text-center transition"
            >
              Log in to accept
            </Link>
            <Link to="/" className="block mt-3 text-sm text-gray-500 dark:text-gray-400 hover:underline">
              Return to home
            </Link>
          </div>
        )}

        {/* New user — form */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary-600 dark:text-gold-400" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                You've been invited
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create your account to join <strong>{invite?.businessName}</strong> as a{' '}
                <strong>{ROLE_LABELS[invite?.role] || invite?.role}</strong>.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
              <p className="font-medium">{invite?.email}</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Re-enter your password"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account & join'
              )}
            </button>
          </form>
        )}

        {/* Success */}
        {phase === 'done' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Welcome aboard!
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your account is ready. Redirecting you to log in…
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-primary-600 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;