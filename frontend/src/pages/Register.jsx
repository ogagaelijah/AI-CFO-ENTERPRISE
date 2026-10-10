// frontend/src/pages/Register.jsx
// v1.5.1-prod — Phone-taken block now also shows the "Log in instead" link
//               (parity with email-taken).
// v1.5.0-prod — Surfaces EMAIL_TAKEN + PHONE_TAKEN as inline errors with
//               actionable "Log in instead" hints (was silently swallowed).
// v1.4.0-prod — Post-registration "Check your email" success screen.
// v1.3.1-prod — Renames "Consultancy" to "Consultancy / Services".

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Moon, Sun, User, Mail, Phone, Lock, Building2, ChevronRight,
  Eye, EyeOff, Sparkles, MailCheck, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react';
import { authApi } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const READY_INDUSTRIES = [
  'Retail / Wholesale',
  'Construction',
  'Consultancy / Services',
  'Education',
  'NGO / Non-Profit',
];

const COMING_SOON_INDUSTRIES = [
  'Manufacturing',
  'Healthcare',
  'Real Estate',
  'Logistics',
];

const Register = () => {
  const { theme, toggleTheme } = useTheme();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedPlanId = searchParams.get('plan');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    businessName: '',
    industry: '',
  });
  const [errors, setErrors] = useState({});

  // Set when registration succeeds — triggers the "check your email" screen
  const [successEmail, setSuccessEmail] = useState(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!requestedPlanId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/subscription/plans`);
        const json = await res.json();
        if (cancelled) return;
        const match = (json?.plans || []).find((p) => p.id === requestedPlanId);
        if (match) setSelectedPlan(match);
      } catch {
        /* silent */
      }
    };
    load();
    return () => { cancelled = true; };
  }, [requestedPlanId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (errors.submit) setErrors((prev) => ({ ...prev, submit: '' }));
    if (errors.submitCode) setErrors((prev) => ({ ...prev, submitCode: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.industry) newErrors.industry = 'Please select an industry';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        businessName: formData.businessName.trim(),
        industry: formData.industry,
      };
      await register(userData);
      setSuccessEmail(userData.email);
    } catch (error) {
      console.error('Registration error:', error);
      const responseData = error.response?.data || {};
      const code = responseData.code;
      const message = responseData.message || 'Registration failed. Please try again.';

      setErrors({
        submit: message,
        submitCode: code || null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification(successEmail);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      /* silent — Resend behavior is intentionally opaque */
    } finally {
      setResending(false);
    }
  };

  // ── Success screen (post-registration)
  if (successEmail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">ENTERPRISE</span>
              </Link>
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" aria-label="Toggle dark mode">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 transition-colors duration-300 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 mb-4">
                <MailCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Check your email
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                We've sent a verification link to{' '}
                <span className="font-medium text-gray-900 dark:text-white break-all">
                  {successEmail}
                </span>
                . Click the link in that email to verify your account.
              </p>

              <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-left">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Didn't get it?</strong> Check your spam or promotions folder. The link expires in 24 hours.
                </p>
              </div>

              {resent && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    ✓ Verification email sent again.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={resending || resent}
                  className="w-full py-3 px-4 text-primary-700 dark:text-gold-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </button>

                <button
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="w-full py-3 px-4 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition shadow-md hover:shadow-lg inline-flex items-center justify-center"
                >
                  Continue to dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>

              <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
                You can use the app now — verify your email anytime before your trial ends.
              </p>
            </div>
          </div>
        </div>

        <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-slate-700">
          <p>Built for African SMEs 🇳🇬</p>
        </footer>
      </div>
    );
  }

  // ── Registration form
  const isEmailTaken = errors.submitCode === 'EMAIL_TAKEN';
  const isPhoneTaken = errors.submitCode === 'PHONE_TAKEN';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">ENTERPRISE</span>
            </Link>
            <div className="flex items-center space-x-4">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" aria-label="Toggle dark mode">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <Link to="/login" className="text-sm font-medium text-primary-600 dark:text-gold-400 hover:underline transition">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {selectedPlan && (
            <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg border bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-gold-300">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">You're signing up for {selectedPlan.name}</p>
                <p className="text-xs mt-0.5">
                  {selectedPlan.trialDays > 0
                    ? `Start with a ${selectedPlan.trialDays}-day free trial. No card required.`
                    : 'Start using AI CFO ENTERPRISE today.'}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 transition-colors duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 mb-4">
                <User className="w-8 h-8 text-primary-600 dark:text-gold-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Get Started</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Create your account — 14 days of Pro, free</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
                    placeholder="Enter your full name" autoComplete="name" />
                </div>
                {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.email || isEmailTaken ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
                    placeholder="you@example.com" autoComplete="email" />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${isPhoneTaken ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
                    placeholder="080 1234 5678" autoComplete="tel" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
                    placeholder="Min 8 characters" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="businessName" name="businessName" type="text" value={formData.businessName} onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.businessName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none`}
                    placeholder="Your business name" autoComplete="organization" />
                </div>
                {errors.businessName && <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>}
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <select id="industry" name="industry" value={formData.industry} onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.industry ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none appearance-none`}>
                  <option value="">Select your industry</option>
                  {READY_INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                  {COMING_SOON_INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry} disabled>
                      {industry} — Coming soon
                    </option>
                  ))}
                </select>
                {errors.industry && <p className="mt-1 text-sm text-red-500">{errors.industry}</p>}
              </div>

              {/* Submit-level errors: email-taken, phone-taken, generic */}
              {errors.submit && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                      {isEmailTaken && (
                        <Link
                          to="/login"
                          className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-gold-400 hover:underline mt-1"
                        >
                          Log in instead
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      )}
                      {isPhoneTaken && (
                        <>
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            If you have another account with this phone, log in with that account's email instead.
                          </p>
                          <Link
                            to="/login"
                            className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-gold-400 hover:underline mt-1"
                          >
                            Log in instead
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 px-4 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center">
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>Start 14-day free trial<ChevronRight className="w-5 h-5 ml-2" /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 dark:text-gold-400 font-medium hover:underline transition">Log in →</Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                By creating an account, you agree to our{' '}
                <a href="#" className="hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-slate-700">
        <p>Built for African SMEs 🇳🇬</p>
      </footer>
    </div>
  );
};

export default Register;