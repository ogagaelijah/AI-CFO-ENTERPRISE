// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
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
    return <Navigate to="/login" replace />;
  }

  // Check admin access if required
  if (requireAdmin) {
    // Admin emails - add any emails that should have admin access
    const adminEmails = [
      'ogagaokeelijah@gmail.com',
      'ogagaoke66@gmail.com',
      'ogalosautomation@gmail.com',
    ];
    
    const isAdmin = adminEmails.includes(user?.email) || user?.isAdmin === true;
    
    if (!isAdmin) {
      // Redirect non-admin users to their dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;