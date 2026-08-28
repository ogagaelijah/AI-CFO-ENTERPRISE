// frontend/src/components/Creditors/CreditorTable.jsx
import { Eye, Edit, Trash2, CreditCard } from 'lucide-react';

const CreditorTable = ({ creditors, onView, onPay, onEdit, onDelete }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status, balance) => {
    if (balance <= 0 || status === 'PAID') {
      return { label: 'PAID', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    }
    if (status === 'OVERDUE') {
      return { label: 'OVERDUE', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }
    return { label: 'ACTIVE', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  };

  if (!creditors || creditors.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No creditors recorded yet. Add your first creditor!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owed</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {creditors.map((creditor) => {
              const status = getStatusBadge(creditor.status, creditor.balance_remaining);
              return (
                <tr key={creditor.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{creditor.supplier_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {creditor.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    ₦{(creditor.total_owed || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                    ₦{(creditor.amount_paid || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${creditor.balance_remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      ₦{(creditor.balance_remaining || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {creditor.due_date ? formatDate(creditor.due_date) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {creditor.balance_remaining > 0 && (
                      <button
                        onClick={() => onPay(creditor)}
                        className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition"
                        title="Record Payment"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onView(creditor.id)}
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(creditor)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {creditor.balance_remaining <= 0 && (
                      <button
                        onClick={() => onDelete(creditor.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

export default CreditorTable;