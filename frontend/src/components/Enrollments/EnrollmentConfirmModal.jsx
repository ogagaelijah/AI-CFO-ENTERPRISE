// frontend/src/components/Enrollments/EnrollmentConfirmModal.jsx

import { X, AlertTriangle } from 'lucide-react';

const EnrollmentConfirmModal = ({ isOpen, enrollment, onConfirm, onCancel }) => {
  if (!isOpen || !enrollment) return null;

  const studentLabel = enrollment.studentName || `Student #${enrollment.studentId}`;
  const classLabel = enrollment.className || `Class #${enrollment.classId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unenroll Student</h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-gray-100">
                Unenroll this student from the class?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <strong>{studentLabel}</strong>
                {' '}will be removed from <strong>{classLabel}</strong> for{' '}
                <strong>{enrollment.term} {enrollment.session}</strong>.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Their enrollment record stays, marked WITHDRAWN — history is preserved.
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
            >
              Unenroll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentConfirmModal;