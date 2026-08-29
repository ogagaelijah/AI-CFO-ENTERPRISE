// frontend/src/components/debtors/DebtorDetailModal.jsx
import { X, User, Calendar, CreditCard, Trash2, FileText, Phone } from 'lucide-react';

const DebtorDetailModal = ({ isOpen, onClose, debtor, onPaymentClick, onDeleteClick }) => {
  if (!isOpen || !debtor) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG').format(value);
  };

  const getStatusBadge = (debtor) => {
    if (debtor.balance_remaining <= 0 || debtor.status === 'PAID') {
      return { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' };
    }
    if (debtor.status === 'OVERDUE' || (debtor.due_date && new Date(debtor.due_date) < new Date())) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🔴' };
    }
    return { label: 'Active', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🟡' };
  };

  const status = getStatusBadge(debtor);
  const isPaid = debtor.balance_remaining <= 0 || debtor.status === 'PAID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Debtor Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Customer Name</p>
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {debtor.customer_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Customer Type</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {debtor.customer_type || 'CUSTOMER'}
              </p>
            </div>
            {debtor.phone && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {debtor.phone}
                </p>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Owed</p>
              <p className="font-bold text-gray-900 dark:text-white">
                ₦{formatCurrency(debtor.total_owed || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount Paid</p>
              <p className="font-bold text-green-600 dark:text-green-400">
                ₦{formatCurrency(debtor.amount_paid || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
              <p className={`font-bold ${debtor.balance_remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                ₦{formatCurrency(debtor.balance_remaining || 0)}
              </p>
            </div>
          </div>

          {/* Status & Dates */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block mt-1 ${status.color}`}>
                {status.icon} {status.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDate(debtor.due_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(debtor.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last Payment</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(debtor.last_payment_date)}
              </p>
            </div>
          </div>

          {/* Reference Info */}
          {debtor.reference_type && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {debtor.reference_type}: #{debtor.reference_id || 'N/A'}
              </p>
            </div>
          )}

          {/* Notes */}
          {debtor.notes && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                {debtor.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            {!isPaid && (
              <button
                onClick={onPaymentClick}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            )}
            {isPaid && (
              <button
                onClick={onDeleteClick}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Debtor</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtorDetailModal;