// frontend/src/components/Fees/FeeTable.jsx

import { Eye, Edit, Trash2, FileText } from 'lucide-react';

const STATUS_STYLES = {
  DRAFT:     'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  SENT:      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  PAID:      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  OVERDUE:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700',
};

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FeeTable = ({ fees, onView, onEdit, onDelete }) => {
  if (!fees || fees.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No fees yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Click &ldquo;Create Fee&rdquo; to raise your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Fee #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Term</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Due Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Balance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {fees.map((fee) => {
              const statusClass = STATUS_STYLES[fee.status] || STATUS_STYLES.DRAFT;
              const balance = Number(fee.balance) || 0;
              const studentLabel =
                fee.studentName ||
                (fee.admissionNumber ? fee.admissionNumber : null) ||
                (fee.studentId ? `Student #${fee.studentId}` : '—');
              const termLabel =
                fee.termName && fee.termSession
                  ? `${fee.termName} ${fee.termSession}`
                  : (fee.termId ? `Term #${fee.termId}` : '—');

              return (
                <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {fee.feeNumber || '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="font-medium">{studentLabel}</p>
                      {fee.admissionNumber && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fee.admissionNumber}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {termLabel}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(fee.dueDate)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatCurrency(fee.amount)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                      {fee.status || 'DRAFT'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                    {balance > 0 ? (
                      <span className="text-red-600 dark:text-red-400">{formatCurrency(balance)}</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">Settled</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(fee.id)}
                        className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(fee)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(fee)}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default FeeTable;