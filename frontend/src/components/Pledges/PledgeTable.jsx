// frontend/src/components/Pledges/PledgeTable.jsx

import { Eye, Edit, Trash2, HandCoins } from 'lucide-react';

const STATUS_STYLES = {
  ACTIVE:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  FULFILLED: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  OVERDUE:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700',
};

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).slice(0, 10));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PledgeTable = ({ pledges, onView, onEdit, onDelete }) => {
  if (!pledges || pledges.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
        <HandCoins className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No pledges yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Click &ldquo;Record Pledge&rdquo; to add the first one.
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Donor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Category</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Due Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {pledges.map((pledge) => {
              const statusClass = STATUS_STYLES[pledge.status] || STATUS_STYLES.ACTIVE;
              const progress = Number(pledge.progressPercent) || 0;
              const donor = pledge.donorName || (pledge.donorId ? `Donor #${pledge.donorId}` : '—');

              return (
                <tr key={pledge.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {donor}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {pledge.category || 'GENERAL'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatCurrency(pledge.amount)}
                  </td>
                  <td className="px-4 py-4 text-sm min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <div
                          className={`h-full ${progress >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                        {progress}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatCurrency(pledge.amountFulfilled)} of {formatCurrency(pledge.amount)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                      {pledge.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(pledge.dueDate)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(pledge.id)}
                        className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(pledge)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(pledge)}
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

export default PledgeTable;