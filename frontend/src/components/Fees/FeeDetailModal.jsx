// frontend/src/components/Fees/FeeDetailModal.jsx

import { X, CreditCard, Send } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).slice(0, 10));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_STYLES = {
  DRAFT:     'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  SENT:      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  PAID:      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  OVERDUE:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
};

const FeeDetailModal = ({ isOpen, fee, isLoading, onClose, onRecordPayment, onMarkAsSent }) => {
  if (!isOpen || !fee) return null;

  const statusClass = STATUS_STYLES[fee.status] || STATUS_STYLES.DRAFT;
  const canPay = fee.status !== 'PAID' && fee.status !== 'DRAFT' && fee.status !== 'CANCELLED';
  const canSend = fee.status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Fee {fee.feeNumber}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {fee.studentName || 'Student'} {fee.admissionNumber ? `(${fee.admissionNumber})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                {fee.status}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {fee.description || '—'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount" value={formatCurrency(fee.amount)} />
              <Field label="Amount Paid" value={formatCurrency(fee.amountPaid)} />
              <Field label="Balance" value={formatCurrency(fee.balance)} highlight={fee.balance > 0} />
              <Field label="Currency" value={fee.currency} />
              <Field label="Issue Date" value={formatDate(fee.issueDate)} />
              <Field label="Due Date" value={formatDate(fee.dueDate)} />
              <Field label="Term" value={fee.termName ? `${fee.termName} ${fee.termSession || ''}` : '—'} />
              <Field label="Class" value={fee.className || '—'} />
            </div>

            {fee.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{fee.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              {canSend && (
                <button
                  onClick={() => onMarkAsSent(fee)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Mark as Sent</span>
                </button>
              )}
              {canPay && (
                <button
                  onClick={() => onRecordPayment(fee)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>
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

export default FeeDetailModal;