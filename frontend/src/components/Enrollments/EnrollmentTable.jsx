// frontend/src/components/Enrollments/EnrollmentTable.jsx

import { UserMinus, GraduationCap } from 'lucide-react';

const STATUS_STYLES = {
  ACTIVE:    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  COMPLETED: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  WITHDRAWN: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const EnrollmentTable = ({ enrollments, onUnenroll }) => {
  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
        <GraduationCap className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No enrollments yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Click &ldquo;Enroll Student&rdquo; to assign a student to a class.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Class
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Term
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {enrollments.map((enrollment) => {
              const statusClass = STATUS_STYLES[enrollment.status] || STATUS_STYLES.ACTIVE;
              const isActive = enrollment.status === 'ACTIVE';

              return (
                <tr
                  key={enrollment.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {enrollment.studentName || `Student #${enrollment.studentId}`}
                    </div>
                    {enrollment.admissionNumber && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {enrollment.admissionNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {enrollment.className || `Class #${enrollment.classId}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {enrollment.session}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {enrollment.term}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClass}`}
                    >
                      {enrollment.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-2">
                      {isActive && (
                        <button
                          onClick={() => onUnenroll(enrollment)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition"
                          title="Unenroll"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnrollmentTable;