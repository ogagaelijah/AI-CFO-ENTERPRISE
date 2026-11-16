// frontend/src/components/ProtectedRoute.jsx
// v2.1.0-prod — Adds allowedRoles prop to block unauthorized URL access.
// v2.0.0-prod — Uses platformRole for admin access instead of hardcoded emails.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // ★ NEW: Check if the user's role is in the allowedRoles array
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin) {
    const allowedPlatformRoles = ['SUPERADMIN', 'ADMIN', 'SUPPORT', 'TECHNICAL', 'OPERATIONS', 'MARKETING', 'HR', 'COMPLIANCE', 'FINANCE'];
    const isPlatformStaff = user?.platformRole && allowedPlatformRoles.includes(user.platformRole);
    const isTenantAdmin = user?.isAdmin === true;

    if (!isPlatformStaff && !isTenantAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;