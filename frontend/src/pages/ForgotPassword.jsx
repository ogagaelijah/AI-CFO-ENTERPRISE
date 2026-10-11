// frontend/src/pages/ForgotPassword.jsx
// v1.0.0 — Email input form. Calls POST /auth/forgot-password.
//           Always shows generic success (enumeration protection is
//           handled server-side; we mirror it on the UI).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Moon,
  Sun,
} from 'lucide-react';
import { authApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export default function ForgotPassword() {
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      // Even if the backend returns an error, show the generic success —
      // prevents enumeration and matches the backend's behavior.
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

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
            {isSubmitted ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Check your email
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  If your email is registered, we've sent a password reset link to{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {email}
                  </span>
                  . The link expires in 30 minutes.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                  Didn't get it? Check your spam folder, or try again in a few minutes.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-medium hover:bg-primary-700 dark:hover:bg-gold-600 transition"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 mb-4">
                    <Mail className="w-8 h-8 text-primary-600 dark:text-gold-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Forgot password?
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          error
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                        } bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
                        placeholder="you@example.com"
                        autoFocus
                      />
                    </div>
                    {error && (
                      <p className="mt-1 text-sm text-red-500">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send reset link
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
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-slate-700">
        <p>Built for African SMEs 🇳🇬</p>
      </footer>
    </div>
  );
}