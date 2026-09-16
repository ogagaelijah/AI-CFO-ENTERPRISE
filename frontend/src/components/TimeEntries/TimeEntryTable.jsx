// frontend/src/components/TimeEntries/TimeEntryTable.jsx

import { Edit, Trash2, Clock } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatHours = (n) => {
  const v = Number(n) || 0;
  return `${v % 1 === 0 ? v : v.toFixed(2).replace(/\.?0+$/, '')}h`;
};

const TimeEntryTable = ({ entries, onEdit, onDelete }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
        <Clock className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No time entries yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Click &ldquo;Log Hours&rdquo; to record your first entry.
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Billable
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
              >
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(entry.entryDate)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entry.projectId ? (
                    <span className="font-medium">Project #{entry.projectId}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                  {entry.description || <span className="text-gray-400 dark:text-gray-500">—</span>}
                </td>
                <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatHours(entry.hours)}
                </td>
                <td className="px-4 py-4">
                  {entry.invoiced ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                      Invoiced
                    </span>
                  ) : entry.billable ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                      Billable
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      Non-billable
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(entry)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeEntryTable;