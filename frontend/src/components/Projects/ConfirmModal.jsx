// frontend/src/components/Projects/ConfirmModal.jsx

import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, project, onConfirm, onCancel }) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Project</h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-gray-100">
                Are you sure you want to delete this project?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <strong>{project.name}</strong> will be permanently removed. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;