// frontend/src/components/Customers/ConfirmModal.jsx

import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, customer, onConfirm, onCancel }) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Body */}
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
            Delete Customer
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300">{customer.name}</span>?
            <br />
            <span className="text-red-500 text-xs">This action cannot be undone.</span>
          </p>

          {/* Footer */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;