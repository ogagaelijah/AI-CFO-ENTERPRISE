// frontend/src/App.jsx
// v2.4.0 — Adds route-level code splitting via React.lazy + Suspense.
//           Entry pages (Landing, Login, Register, VerifyEmail,
//           ForgotPassword, ResetPassword) stay eager for zero-delay load.
//           All other pages load on demand.
// v2.3.0 — Adds /verify-email, /forgot-password, /reset-password public routes.
// v2.2.0 — Mounts <ChatWidget /> globally inside BrowserRouter.

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/Landing/ChatWidget';

// ── Entry pages (eager — first-visit critical) ──────────────────────────
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// ── Lazy pages (loaded on demand) ───────────────────────────────────────
// Authenticated / dashboard
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'));
const Settings        = lazy(() => import('./pages/Settings'));
const Subscription    = lazy(() => import('./pages/Subscription'));
const PaymentSuccess  = lazy(() => import('./pages/PaymentSuccess'));

// Core business
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

// Education vertical
const Students        = lazy(() => import('./pages/Students'));
const Classes         = lazy(() => import('./pages/Classes'));
const Enrollments     = lazy(() => import('./pages/Enrollments'));
const Terms           = lazy(() => import('./pages/Terms'));
const Fees            = lazy(() => import('./pages/Fees'));

// NGO vertical
const Pledges         = lazy(() => import('./pages/Pledges'));
const Donations       = lazy(() => import('./pages/Donations'));

// Consultancy vertical
const Projects        = lazy(() => import('./pages/Projects'));
const TimeEntries     = lazy(() => import('./pages/TimeEntries'));

// Intelligence layer
const Analytics       = lazy(() => import('./pages/Analytics'));
const Forecast        = lazy(() => import('./pages/Forecast'));
const Risk            = lazy(() => import('./pages/Risk'));
const Decisions       = lazy(() => import('./pages/Decisions'));
const Advisor         = lazy(() => import('./pages/Advisor'));

// Reports
const Reports         = lazy(() => import('./pages/Reports'));

// ── Loading fallback ────────────────────────────────────────────────────
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
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />

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
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/debtors" element={<ProtectedRoute><Debtors /></ProtectedRoute>} />
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
              <Route path="/admin/*" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />

              {/* Fallback Route */}
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>

          {/* Global chat widget — visible on every page */}
          <ChatWidget />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;