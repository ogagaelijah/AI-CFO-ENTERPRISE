// frontend/src/components/Payments/PaymentDetailModal.jsx

import { X, Calendar, DollarSign, Tag, FileText, User } from 'lucide-react';

const PaymentDetailModal = ({ isOpen, payment, isLoading, onClose }) => {
  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeBadge = (type) => {
    if (type === 'IN') {
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    }
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Type & Amount */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(payment.type)}`}>
                {payment.type}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
              <p className={`text-2xl font-bold ${payment.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {payment.type === 'IN' ? '+' : '-'} ₦{(payment.amount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Reference */}
          <div className="flex items-start space-x-3">
            <Tag className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reference</p>
              <p className="text-gray-900 dark:text-white">
                {payment.referenceType || 'N/A'} #{payment.referenceId || 'N/A'}
              </p>
            </div>
          </div>

          {/* Method */}
          <div className="flex items-start space-x-3">
            <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
              <p className="text-gray-900 dark:text-white">{payment.paymentMethod || 'CASH'}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment Date</p>
              <p className="text-gray-900 dark:text-white">{formatDate(payment.paymentDate)}</p>
            </div>
          </div>

          {/* Reference Number */}
          {payment.referenceNumber && (
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reference Number</p>
                <p className="text-gray-900 dark:text-white">{payment.referenceNumber}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{payment.notes}</p>
              </div>
            </div>
          )}

          {/* Created */}
          <div className="flex items-start space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(payment.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailModal;