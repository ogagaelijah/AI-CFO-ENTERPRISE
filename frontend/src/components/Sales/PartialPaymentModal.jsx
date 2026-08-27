// frontend/src/components/Sales/PartialPaymentModal.jsx
import { X } from 'lucide-react';

const PartialPaymentModal = ({ isOpen, data, totalRevenue, amount, setAmount, onContinue, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Partial Payment</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Customer:</span> {data?.customerName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Total Amount:</span> 
              <span className="font-bold text-gray-900 dark:text-white ml-1">₦{totalRevenue.toLocaleString()}</span>
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
              ⚠️ Enter the amount the customer is paying now.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount Paid (₦)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={`Enter amount (max: ₦${totalRevenue.toLocaleString()})`}
              min="0"
              max={totalRevenue}
              step="0.01"
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max: ₦{totalRevenue.toLocaleString()}
            </p>
          </div>

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
              onClick={onContinue}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartialPaymentModal;