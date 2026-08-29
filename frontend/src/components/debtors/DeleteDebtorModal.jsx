// frontend/src/components/debtors/DeleteDebtorModal.jsx
import { X, AlertTriangle, Trash2 } from 'lucide-react';

const DeleteDebtorModal = ({ isOpen, onClose, onConfirm, debtor }) => {
  if (!isOpen || !debtor) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG').format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Debtor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-medium">
              ⚠️ Are you sure you want to delete this debtor?
            </p>
          </div>

          {/* Debtor Info */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Customer:</span>
              <span className="font-medium text-gray-900 dark:text-white">{debtor.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Owed:</span>
              <span className="font-medium text-gray-900 dark:text-white">₦{formatCurrency(debtor.total_owed || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Paid:</span>
              <span className="font-medium text-green-600 dark:text-green-400">₦{formatCurrency(debtor.amount_paid || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-600">
              <span className="text-gray-600 dark:text-gray-400">Balance:</span>
              <span className="font-medium text-green-600 dark:text-green-400">₦0 (Fully Paid)</span>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ This action cannot be undone. The debtor record will be permanently deleted.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteDebtorModal;