// frontend/src/components/common/ReadOnlyBanner.jsx
// v1.0.0-prod — Drop-in banner for modals. Shows only when the user is
//               in read-only mode. Renders nothing if writes are allowed.

import { AlertTriangle } from 'lucide-react';
import { useWriteGuard } from '../../hooks/useWriteGuard';

const ReadOnlyBanner = ({ className = '' }) => {
  const { canWrite, guardMessage } = useWriteGuard();

  if (canWrite) return null;

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
      <p className="text-sm text-red-700 dark:text-red-400">{guardMessage}</p>
    </div>
  );
};

export default ReadOnlyBanner;