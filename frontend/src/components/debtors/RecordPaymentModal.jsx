// frontend/src/components/debtors/RecordPaymentModal.jsx
import { useState } from 'react';
import { X, AlertCircle, CheckCircle, CreditCard, ArrowRight } from 'lucide-react';
import api from '../../services/api';

const RecordPaymentModal = ({ isOpen, onClose, onSuccess, debtor }) => {
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen || !debtor) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!amount || amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (amount > debtor.balance_remaining) {
      setError(`Payment amount exceeds balance of ₦${debtor.balance_remaining.toLocaleString()}`);
      return;
    }

    // Show confirmation
    setShowConfirmation(true);
  };

  const handleConfirmPayment = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await api.post(`/debtors/${debtor.id}/payment`, {
        amount: parseFloat(amount),
        notes: notes.trim() || '',
      });

      if (response.data?.success) {
        setSuccess(`✅ Payment of ₦${parseFloat(amount).toLocaleString()} recorded successfully!`);
        setTimeout(() => {
          onSuccess();
          onClose();
          setAmount(0);
          setNotes('');
          setShowConfirmation(false);
          setSuccess('');
        }, 1000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setAmount(0);
    setNotes('');
    setError('');
    setSuccess('');
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG').format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {showConfirmation ? 'Confirm Payment' : 'Record Payment'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            disabled={isLoading}
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {!showConfirmation ? (
            // Step 1: Enter Payment Details
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Customer Info */}
              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Customer:</span> {debtor.customer_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Outstanding Balance:</span>
                  <span className="font-bold text-red-600 dark:text-red-400 ml-1">
                    ₦{formatCurrency(debtor.balance_remaining)}
                  </span>
                </p>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Amount (₦) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  max={debtor.balance_remaining}
                  step="0.01"
                  placeholder="0.00"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max: ₦{formatCurrency(debtor.balance_remaining)}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Payment notes..."
                  disabled={isLoading}
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  disabled={isLoading}
                >
                  <span>Record Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            // Step 2: Confirmation
            <div className="space-y-4">
              {/* Success/Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Confirmation Details */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">Confirm Payment</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{debtor.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment Amount:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">₦{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Remaining Balance:</span>
                    <span className="font-medium text-gray-900 dark:text-white">₦{formatCurrency(debtor.balance_remaining - amount)}</span>
                  </div>
                  {notes && (
                    <div className="flex justify-between pt-2 border-t border-yellow-200 dark:border-yellow-800">
                      <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Are you sure you want to record this payment?
              </p>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  disabled={isLoading}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Confirm Payment ✅'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;