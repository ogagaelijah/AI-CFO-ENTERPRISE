// frontend/src/components/Purchases/PartialPaymentModal.jsx
import { X } from 'lucide-react';

const PartialPaymentModal = ({ isOpen, data, amount, setAmount, onConfirm, onCancel, error, setError }) => {
  if (!isOpen) return null;

  // Calculate total cost
  const calculateTotal = () => {
    if (!data?.items) return 0;
    return data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const totalCost = calculateTotal();

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
            {data?.supplierName && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Supplier:</span> {data.supplierName}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Total Items:</span> {data?.items?.length || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Total Cost:</span>
              <span className="font-bold text-gray-900 dark:text-white ml-1">₦{totalCost.toLocaleString()}</span>
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              ⚠️ Enter the amount you are paying now. The remaining balance will be recorded as a creditor.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount Paying Now (₦)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (setError) setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={`Enter amount (max: ₦${totalCost.toLocaleString()})`}
              min="0"
              max={totalCost}
              step="0.01"
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max: ₦{totalCost.toLocaleString()}
            </p>
            {amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Remaining balance: ₦{(totalCost - parseFloat(amount)).toLocaleString()} will be recorded as creditor
              </p>
            )}
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
              onClick={onConfirm}
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