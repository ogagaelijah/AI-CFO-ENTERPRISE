// frontend/src/components/Inventory/ConfirmModal.jsx
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  data,
  title = 'Confirm',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700',
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  const isDelete = confirmColor === 'red';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isDelete && (
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          )}

          {data && (
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-1">
              {data.itemName && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Item:</span> {data.itemName}
                </p>
              )}
              {data.quantity !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Quantity:</span> {data.quantity}
                </p>
              )}
              {data.costPrice !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Cost Price:</span> ₦{data.costPrice?.toLocaleString()}
                </p>
              )}
              {data.sellingPrice !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Selling Price:</span> ₦{data.sellingPrice?.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{message}</p>
          )}

          {isDelete && (
            <p className="text-xs text-red-500 text-center">This action cannot be undone.</p>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition ${colorClasses[confirmColor] || colorClasses.primary}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;