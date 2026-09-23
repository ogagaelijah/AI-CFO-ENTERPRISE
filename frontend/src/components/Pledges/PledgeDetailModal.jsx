// frontend/src/components/Pledges/PledgeDetailModal.jsx

import { X } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).slice(0, 10));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_STYLES = {
  ACTIVE:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  FULFILLED: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  OVERDUE:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
};

const PledgeDetailModal = ({ isOpen, pledge, isLoading, onClose }) => {
  if (!isOpen || !pledge) return null;

  const statusClass = STATUS_STYLES[pledge.status] || STATUS_STYLES.ACTIVE;
  const progress = Number(pledge.progressPercent) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pledge Details</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                {pledge.status}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{pledge.category}</span>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full ${progress >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Donor" value={pledge.donorName || (pledge.donorId ? `Donor #${pledge.donorId}` : 'Anonymous')} />
              <Field label="Currency" value={pledge.currency || 'NGN'} />
              <Field label="Amount" value={formatCurrency(pledge.amount)} />
              <Field label="Fulfilled" value={formatCurrency(pledge.amountFulfilled)} />
              <Field label="Balance" value={formatCurrency(pledge.balance)} highlight={pledge.balance > 0} />
              <Field label="Pledge Date" value={formatDate(pledge.pledgeDate)} />
              <Field label="Due Date" value={formatDate(pledge.dueDate)} />
            </div>

            {pledge.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pledge.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value, highlight }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</p>
    <p className={`text-sm mt-0.5 ${highlight ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}`}>
      {value}
    </p>
  </div>
);

export default PledgeDetailModal;