import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Hammer } from 'lucide-react';

const ComingSoon = () => {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 rounded-2xl flex items-center justify-center mb-6">
          <Hammer className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize mb-2">
          {pageName} Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          We are currently building this section. It will be available in a future update.
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default ComingSoon;