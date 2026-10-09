// frontend/src/pages/ResetPassword.jsx
// v1.0.0 — Handles /reset-password?token=... from the reset email.
//           Password + confirm fields, validates locally, calls
//           POST /auth/reset-password, then routes to /login.

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Moon,
  Sun,
} from 'lucide-react';
import { authApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

function validatePassword(password) {
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.trim().length === 0) {
    return 'Password cannot be only whitespace';
  }
  // Match backend: 72-byte limit (bcrypt)
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `Password is too long (max ${PASSWORD_MAX_BYTES} bytes)`;
  }
  return null;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};

    const pwError = validatePassword(password);
    if (pwError) errors.password = pwError;

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setIsSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'The reset link is invalid or has expired. Please request a new one.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // No token in URL — show "invalid link" state
  if (!token) {
    return (
      <Shell theme={theme} toggleTheme={toggleTheme}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invalid reset link
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            This link is missing its reset token. Please request a new password reset.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-medium hover:bg-primary-700 dark:hover:bg-gold-600 transition"
          >
            Request new reset link
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </Shell>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Shell theme={theme} toggleTheme={toggleTheme}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Password updated
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your password has been reset successfully. Redirecting you to log in…
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-medium hover:bg-primary-700 dark:hover:bg-gold-600 transition"
          >
            Go to login now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </Shell>
    );
  }

  // Form state
  return (
    <Shell theme={theme} toggleTheme={toggleTheme}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 mb-4">
          <Lock className="w-8 h-8 text-primary-600 dark:text-gold-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Set a new password
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Choose a strong password you haven't used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((f) => ({ ...f, password: '' }));
              }}
              className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                fieldErrors.password
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-slate-600'
              } bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
              placeholder="At least 8 characters"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Confirm new password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword)
                  setFieldErrors((f) => ({ ...f, confirmPassword: '' }));
              }}
              className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                fieldErrors.confirmPassword
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-slate-600'
              } bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
              placeholder="Re-enter your new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Updating password...
            </>
          ) : (
            <>
              Update password
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="text-sm text-primary-600 dark:text-gold-400 hover:underline inline-flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to login
        </Link>
      </div>
    </Shell>
  );
}

// ── Shared page shell (header + footer + centered card wrapper)
function Shell({ theme, toggleTheme, children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">
                AI CFO
              </span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
                ENTERPRISE
              </span>
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 transition-colors duration-300">
            {children}
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