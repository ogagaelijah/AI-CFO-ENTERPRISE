// frontend/src/components/Creditors/CreditorDetailModal.jsx
import { X, User, Calendar, DollarSign, FileText } from 'lucide-react';

const CreditorDetailModal = ({ isOpen, creditor, isLoading, onClose }) => {
  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status, balance) => {
    if (balance <= 0 || status === 'PAID') {
      return { label: 'PAID', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    }
    if (status === 'OVERDUE') {
      return { label: 'OVERDUE', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }
    return { label: 'ACTIVE', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Creditor Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading details...</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {creditor?.supplier_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${getStatusBadge(creditor?.status, creditor?.balance_remaining).color}`}>
                  {getStatusBadge(creditor?.status, creditor?.balance_remaining).label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Owed</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  ₦{(creditor?.total_owed || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Amount Paid</p>
                <p className="font-bold text-green-600 dark:text-green-400">
                  ₦{(creditor?.amount_paid || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className={`font-bold ${creditor?.balance_remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  ₦{(creditor?.balance_remaining || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(creditor?.due_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Last Payment</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(creditor?.last_payment_date)}
                </p>
              </div>
            </div>

            {creditor?.reference_type && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {creditor.reference_type}: #{creditor.reference_id || 'N/A'}
                </p>
              </div>
            )}

            {creditor?.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{creditor.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditorDetailModal;