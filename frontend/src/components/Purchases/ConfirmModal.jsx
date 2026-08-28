// frontend/src/components/Purchases/ConfirmModal.jsx
import { X } from 'lucide-react';

const ConfirmModal = ({ isOpen, data, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate totals from items
  const calculateTotals = () => {
    if (!data?.items || data.items.length === 0) {
      return { totalCost: 0, totalItems: 0, totalQuantity: 0 };
    }
    let totalCost = 0;
    let totalQuantity = 0;
    for (const item of data.items) {
      totalCost += (item.quantity || 0) * (item.unitCost || 0);
      totalQuantity += (item.quantity || 0);
    }
    return { totalCost, totalItems: data.items.length, totalQuantity };
  };

  const { totalCost, totalItems, totalQuantity } = calculateTotals();
  
  // ✅ Calculate amount paid and remaining for partial payments
  const amountPaid = data?.amountPaid || 0;
  const isPartial = data?.paymentStatus === 'PARTIAL' && amountPaid > 0;
  const remainingBalance = isPartial ? totalCost - amountPaid : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Purchase</h2>
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
              <span className="font-medium">Items:</span> {totalItems}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Total Quantity:</span> {totalQuantity}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Total Cost:</span> ₦{totalCost.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Payment Status:</span> {data?.paymentStatus || 'UNPAID'}
            </p>
            
            {/* ✅ Show partial payment details */}
            {isPartial && (
              <>
                <p className="text-sm text-green-600 dark:text-green-300 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                  <span className="font-medium">Amount Paid:</span> ₦{amountPaid.toLocaleString()}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  <span className="font-medium">Remaining Balance:</span> ₦{remainingBalance.toLocaleString()}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Remaining balance will be recorded as a creditor.
                </p>
              </>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Date:</span> {formatDate(data?.purchaseDate)}
            </p>

            {/* Show items summary */}
            {data?.items && data.items.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Items:</p>
                {data.items.map((item, index) => (
                  <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
                    • {item.name} × {item.quantity} @ ₦{item.unitCost.toLocaleString()}
                  </p>
                ))}
              </div>
            )}

            {data?.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Notes:</span> {data.notes}
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Are you sure you want to record this purchase? This will update inventory and {isPartial ? 'create a creditor for the remaining balance.' : 'may create a creditor.'}
          </p>

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
              Confirm Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;