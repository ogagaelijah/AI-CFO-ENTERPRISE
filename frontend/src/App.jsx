// frontend/src/App.jsx
// v2.0.0 — Adds NGO routes: /pledges, /donations, /donors

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import PaymentSuccess from './pages/PaymentSuccess';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Debtors from './pages/Debtors';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Purchases from './pages/Purchases';
import Creditors from './pages/Creditors';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Forecast from './pages/Forecast';
import Risk from './pages/Risk';
import Decisions from './pages/Decisions';
import Advisor from './pages/Advisor';
import Projects from './pages/Projects';
import TimeEntries from './pages/TimeEntries';
import Invoices from './pages/Invoices';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Enrollments from './pages/Enrollments';
import Terms from './pages/Terms';
import Fees from './pages/Fees';
import Pledges from './pages/Pledges';                        // ← ADDED
import Donations from './pages/Donations';                    // ← ADDED

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />

            {/* Protected Routes - Regular Users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hours"
              element={
                <ProtectedRoute>
                  <TimeEntries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute>
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments"
              element={
                <ProtectedRoute>
                  <Enrollments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/terms"
              element={
                <ProtectedRoute>
                  <Terms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fees"
              element={
                <ProtectedRoute>
                  <Fees />
                </ProtectedRoute>
              }
            />
            {/* NGO routes */}
            <Route
              path="/pledges"                                    // ← ADDED
              element={
                <ProtectedRoute>
                  <Pledges />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donations"                                  // ← ADDED
              element={
                <ProtectedRoute>
                  <Donations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debtors"
              element={
                <ProtectedRoute>
                  <Debtors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/income"
              element={
                <ProtectedRoute>
                  <Income />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Expenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <Purchases />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creditors"
              element={
                <ProtectedRoute>
                  <Creditors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donors"                                     // ← ADDED
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forecast"
              element={
                <ProtectedRoute>
                  <Forecast />
                </ProtectedRoute>
              }
            />
            <Route
              path="/risk"
              element={
                <ProtectedRoute>
                  <Risk />
                </ProtectedRoute>
              }
            />
            <Route
              path="/decisions"
              element={
                <ProtectedRoute>
                  <Decisions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <Advisor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advisor"
              element={
                <ProtectedRoute>
                  <Advisor />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Admin Only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback Route */}
            <Route path="*" element={<Landing />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;