// frontend/src/pages/VerifyEmail.jsx
// v1.0.1 — Uses setUser + authApi.getCurrentUser to refresh the current
//           user's verified flag after successful verification. No
//           refreshUser in AuthContext, so we fetch and merge manually.
// v1.0.0 — Initial: handles /verify-email?token=...

import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
  Moon,
  Sun,
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  const alreadyRan = useRef(false);

  useEffect(() => {
    if (alreadyRan.current) return;
    alreadyRan.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('missing');
      setMessage(
        'No verification token found in the link. Please check your email and try again.'
      );
      return;
    }

    (async () => {
      try {
        const res = await authApi.verifyEmail(token);
        setMessage(res?.data?.message || 'Email verified successfully.');

        // If the user is logged in in this browser, refresh their record
        // so the emailVerified flag propagates without a manual reload.
        if (user) {
          try {
            const meRes = await authApi.getCurrentUser();
            if (meRes.data?.user) {
              setUser((prev) => ({
                ...(prev || {}),
                ...meRes.data.user,
                ...(meRes.data.business
                  ? {
                      businessId: meRes.data.business.id,
                      businessName: meRes.data.business.name,
                      industry: meRes.data.business.industry,
                    }
                  : {}),
              }));
            }
          } catch {
            /* non-fatal — verification succeeded either way */
          }
        }

        setStatus('success');
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          'The verification link is invalid or has expired. Please request a new one.';
        setMessage(msg);
        setStatus('error');
      }
    })();
  }, [searchParams, user, setUser]);

  // Auto-redirect after success
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => {
      navigate(user ? '/dashboard' : '/login', { replace: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [status, user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">ENTERPRISE</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gold-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 transition-colors duration-300 text-center">
            {status === 'verifying' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 mb-4">
                  <Loader2 className="w-8 h-8 text-primary-600 dark:text-gold-400 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Verifying your email…
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Just a moment while we confirm your email address.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Email verified
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                  Redirecting you…
                </p>
                <Link
                  to={user ? '/dashboard' : '/login'}
                  className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-medium hover:bg-primary-700 dark:hover:bg-gold-600 transition"
                >
                  {user ? 'Go to dashboard' : 'Log in'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 mb-4">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Verification failed
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-medium hover:bg-primary-700 dark:hover:bg-gold-600 transition"
                >
                  Back to login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </>
            )}

            {status === 'missing' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/30 mb-4">
                  <Mail className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Check your email
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-medium hover:bg-primary-700 dark:hover:bg-gold-600 transition"
                >
                  Back to login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-500">
            Need help?{' '}
            <a
              href="mailto:support@aicfotechnologies.com"
              className="text-primary-600 dark:text-gold-400 hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>

      <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-slate-700">
        <p>Built for African SMEs 🇳🇬</p>
      </footer>
    </div>
  );
}