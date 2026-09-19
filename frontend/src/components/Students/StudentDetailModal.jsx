// frontend/src/components/Students/StudentDetailModal.jsx

import { X } from 'lucide-react';

const STATUS_STYLES = {
  ACTIVE:    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  GRADUATED: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  WITHDRAWN: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  SUSPENDED: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Row = ({ label, value, valueClass = '' }) => (
  <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    <div className={`col-span-2 text-sm text-gray-900 dark:text-gray-100 ${valueClass}`}>{value}</div>
  </div>
);

const StudentDetailModal = ({ isOpen, student, isLoading, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Student Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !student ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No student loaded.</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {student.fullName || '—'}
                    </h3>
                    {student.admissionNumber && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {student.admissionNumber}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[student.status] || STATUS_STYLES.ACTIVE}`}
                  >
                    {student.status || 'ACTIVE'}
                  </span>
                </div>
              </div>

              <Row label="Gender" value={student.gender || '—'} />
              <Row label="Date of Birth" value={formatDate(student.dateOfBirth)} />

              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                Guardian
              </div>

              <Row label="Name" value={student.guardianName || '—'} />
              <Row label="Phone" value={student.guardianPhone || '—'} />
              <Row label="Email" value={student.guardianEmail || '—'} />

              {student.address && (
                <>
                  <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
                  <Row label="Address" value={student.address} />
                </>
              )}

              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              <Row label="Enrolled On" value={formatDate(student.enrolledOn)} />
              <Row label="Created" value={formatDate(student.createdAt)} />
              <Row label="Updated" value={formatDate(student.updatedAt)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;