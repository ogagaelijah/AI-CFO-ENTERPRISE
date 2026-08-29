// frontend/src/components/Inventory/LowStockAlert.jsx
import { AlertTriangle } from 'lucide-react';

const LowStockAlert = ({ count }) => {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center space-x-3">
      <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          ⚠️ {count} item{count > 1 ? 's' : ''} below reorder level
        </p>
        <p className="text-sm text-yellow-600 dark:text-yellow-300">
          Consider reordering soon to avoid stockouts.
        </p>
      </div>
    </div>
  );
};

export default LowStockAlert;