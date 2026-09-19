// frontend/src/components/Classes/ClassTable.jsx

import { Edit, Trash2, Archive, Layers } from 'lucide-react';

const STATUS_STYLES = {
  ACTIVE:   'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  ARCHIVED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const formatCurrency = (n) => `₦${(Number(n) || 0).toLocaleString('en-NG')}`;

const ClassTable = ({ classes, onEdit, onDelete, onArchive }) => {
  if (!classes || classes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
        <Layers className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No classes yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Click &ldquo;Add Class&rdquo; to create your first one.
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
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Level
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Term Fee
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
            {classes.map((klass) => {
              const statusClass = STATUS_STYLES[klass.status] || STATUS_STYLES.ACTIVE;
              const isActive = klass.status === 'ACTIVE';

              return (
                <tr
                  key={klass.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {klass.name}
                      </p>
                      {klass.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {klass.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {klass.level || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(klass.termFee)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClass}`}
                    >
                      {klass.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEdit(klass)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {isActive && (
                        <button
                          onClick={() => onArchive(klass)}
                          className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(klass)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition"
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

export default ClassTable;