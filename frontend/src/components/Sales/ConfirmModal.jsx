// frontend/src/components/Sales/ConfirmModal.jsx
import { X } from 'lucide-react';

const ConfirmModal = ({ isOpen, data, totalRevenue, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Sale</h2>
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
              <span className="font-medium">Items:</span> {data?.items?.length || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Total Amount:</span> 
              <span className="font-bold text-gray-900 dark:text-white ml-1">₦{totalRevenue.toLocaleString()}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Payment Status:</span> 
              <span className={`font-bold ml-1 ${
                data?.paymentStatus === 'PAID' ? 'text-green-600' :
                data?.paymentStatus === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data?.paymentStatus}
              </span>
            </p>
            {data?.paymentStatus === 'PARTIAL' && data?.amountPaid > 0 && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Amount Paid:</span> 
                  <span className="font-bold text-green-600 ml-1">₦{data.amountPaid.toLocaleString()}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Remaining:</span> 
                  <span className="font-bold text-red-600 ml-1">₦{(totalRevenue - data.amountPaid).toLocaleString()}</span>
                </p>
              </>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Are you sure you want to record this sale?
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
              Confirm Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;