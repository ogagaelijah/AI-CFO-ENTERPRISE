// frontend/src/components/Creditors/ConfirmModal.jsx
import { X } from 'lucide-react';

const ConfirmModal = ({ isOpen, data, onConfirm, onCancel, type }) => {
  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isAdd = type === 'add';
  const isPayment = type === 'payment';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isAdd ? 'Confirm Add Creditor' : isPayment ? 'Confirm Payment' : 'Confirm'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            {isAdd && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Supplier:</span> {data?.supplierName || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Amount Owed:</span> ₦{(data?.totalOwed || 0).toLocaleString()}
                </p>
                {data?.dueDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Due Date:</span> {formatDate(data.dueDate)}
                  </p>
                )}
                {data?.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Notes:</span> {data.notes}
                  </p>
                )}
              </>
            )}
            {isPayment && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Supplier:</span> {data?.creditor?.supplier_name || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Outstanding Balance:</span> ₦{(data?.creditor?.balance_remaining || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Amount to Pay:</span> ₦{(data?.amount || 0).toLocaleString()}
                </p>
                {data?.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Notes:</span> {data.notes}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                  <span className="font-medium">Remaining After Payment:</span>
                  <span className="font-bold text-red-600 dark:text-red-400 ml-1">
                    ₦{((data?.creditor?.balance_remaining || 0) - (data?.amount || 0)).toLocaleString()}
                  </span>
                </p>
              </>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Are you sure you want to {isAdd ? 'add this creditor' : isPayment ? 'record this payment' : 'proceed'}?
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
              {isAdd ? 'Add Creditor' : isPayment ? 'Confirm Payment' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;