
// frontend/src/App.jsx
// v3.2.0 — Adds public Terms of Service and Privacy Policy pages.
// v3.1.0 — Restricts /debtors route to non-Cashiers.
// v3.0.0 — Adds Google OAuth Provider and Onboarding route.
// v2.9.0 — Adds Admin Partner Payouts route.

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Onboarding from './pages/Onboarding';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Resources from './pages/Resources';
import Contact from './pages/Contact';
import TermsOfService from './pages/TermsOfService';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';

const Dashboard       = lazy(() => import('./pages/Dashboard'));
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'));
const ComingSoon      = lazy(() => import('./pages/admin/ComingSoon'));
const AdminPartnerPayouts = lazy(() => import('./pages/admin/AdminPartnerPayouts'));
const Settings        = lazy(() => import('./pages/Settings'));
const Subscription    = lazy(() => import('./pages/Subscription'));
const PaymentSuccess  = lazy(() => import('./pages/PaymentSuccess'));
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'));

const Sales           = lazy(() => import('./pages/Sales'));
const Expenses        = lazy(() => import('./pages/Expenses'));
const Income          = lazy(() => import('./pages/Income'));
const Purchases       = lazy(() => import('./pages/Purchases'));
const Inventory       = lazy(() => import('./pages/Inventory'));
const Debtors         = lazy(() => import('./pages/Debtors'));
const Creditors       = lazy(() => import('./pages/Creditors'));
const Suppliers       = lazy(() => import('./pages/Suppliers'));
const Customers       = lazy(() => import('./pages/Customers'));
const Invoices        = lazy(() => import('./pages/Invoices'));

const Students        = lazy(() => import('./pages/Students'));
const Classes         = lazy(() => import('./pages/Classes'));
const Enrollments     = lazy(() => import('./pages/Enrollments'));
const Terms           = lazy(() => import('./pages/Terms'));
const Fees            = lazy(() => import('./pages/Fees'));

const Pledges         = lazy(() => import('./pages/Pledges'));
const Donations       = lazy(() => import('./pages/Donations'));

const Projects        = lazy(() => import('./pages/Projects'));
const TimeEntries     = lazy(() => import('./pages/TimeEntries'));

const Analytics       = lazy(() => import('./pages/Analytics'));
const Forecast        = lazy(() => import('./pages/Forecast'));
const Risk            = lazy(() => import('./pages/Risk'));
const Decisions       = lazy(() => import('./pages/Decisions'));
const Advisor         = lazy(() => import('./pages/Advisor'));

const Reports         = lazy(() => import('./pages/Reports'));

function ReferralRedirect() {
  const { code } = useParams();
  if (code) {
    localStorage.setItem('referral_code', code);
  }
  return <Navigate to="/register" replace />;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 dark:border-slate-700 border-t-primary-600 dark:border-t-gold-400 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    </div>
  );
}

function App() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '264411909899-7dit8iu4b93gunb11c0oeracrbqb31rd.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />

                  <Route path="/p/:code" element={<ReferralRedirect />} />

                  {/* Protected Routes - Regular Users */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                  <Route path="/hours" element={<ProtectedRoute><TimeEntries /></ProtectedRoute>} />
                  <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                  <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
                  <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
                  <Route path="/enrollments" element={<ProtectedRoute><Enrollments /></ProtectedRoute>} />
                  <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
                  <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
                  <Route path="/pledges" element={<ProtectedRoute><Pledges /></ProtectedRoute>} />
                  <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
                  <Route path="/partner" element={<ProtectedRoute><PartnerDashboard /></ProtectedRoute>} />
                  <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

                  {/* Restrict Debtors to non-Cashiers */}
                  <Route path="/debtors" element={
                    <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}>
                      <Debtors />
                    </ProtectedRoute>
                  } />

                  <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
                  <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                  <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
                  <Route path="/creditors" element={<ProtectedRoute><Creditors /></ProtectedRoute>} />
                  <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                  <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                  <Route path="/clients" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                  <Route path="/donors" element={<ProtectedRoute><Customers initialType="DONOR" /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/forecast" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
                  <Route path="/risk" element={<ProtectedRoute><Risk /></ProtectedRoute>} />
                  <Route path="/decisions" element={<ProtectedRoute><Decisions /></ProtectedRoute>} />
                  <Route path="/ai" element={<ProtectedRoute><Advisor /></ProtectedRoute>} />
                  <Route path="/advisor" element={<ProtectedRoute><Advisor /></ProtectedRoute>} />

                  {/* Protected Routes - Admin Only */}
                  <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/partner-payouts" element={<ProtectedRoute requireAdmin={true}><AdminPartnerPayouts /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />
                  <Route path="/admin/businesses" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />
                  <Route path="/admin/subscriptions" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />
                  <Route path="/admin/revenue" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />
                  <Route path="/admin/health" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute requireAdmin={true}><ComingSoon /></ProtectedRoute>} />

                  {/* 404 Not Found Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
