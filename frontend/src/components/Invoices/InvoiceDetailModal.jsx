// frontend/src/components/Invoices/InvoiceDetailModal.jsx

import { X, CreditCard, Send } from 'lucide-react';

const STATUS_STYLES = {
  DRAFT:     'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  SENT:      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  PAID:      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  OVERDUE:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700',
};

const formatCurrency = (n) => `₦${(Number(n) || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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

const InvoiceDetailModal = ({
  isOpen,
  invoice,
  isLoading,
  onClose,
  onRecordPayment,
  onMarkAsSent,
}) => {
  if (!isOpen) return null;

  const status = invoice?.status;
  const balance = Number(invoice?.balance) || 0;

  const canMarkAsSent = status === 'DRAFT';
  const canRecordPayment =
    (status === 'SENT' || status === 'OVERDUE') && balance > 0;

  const showActions = !isLoading && invoice && (canMarkAsSent || canRecordPayment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invoice Details</h2>
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
          ) : !invoice ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No invoice loaded.</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {invoice.invoiceNumber || '—'}
                  </h3>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[invoice.status] || STATUS_STYLES.DRAFT}`}
                  >
                    {invoice.status || 'DRAFT'}
                  </span>
                </div>
              </div>

              <Row label="Client" value={invoice.customerId ? `Client #${invoice.customerId}` : '—'} />
              <Row label="Project" value={invoice.projectId ? `Project #${invoice.projectId}` : '—'} />
              <Row label="Issue Date" value={formatDate(invoice.issueDate)} />
              <Row label="Due Date" value={formatDate(invoice.dueDate)} />

              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

              <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <Row label="Tax" value={formatCurrency(invoice.tax)} />
              <Row
                label="Total"
                value={formatCurrency(invoice.total)}
                valueClass="font-semibold"
              />
              <Row label="Amount Paid" value={formatCurrency(invoice.amountPaid)} />
              <Row
                label="Balance"
                value={formatCurrency(invoice.balance)}
                valueClass={
                  Number(invoice.balance) > 0
                    ? 'font-semibold text-red-600 dark:text-red-400'
                    : 'font-semibold text-green-600 dark:text-green-400'
                }
              />

              {invoice.notes && (
                <>
                  <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
                  <Row label="Notes" value={invoice.notes} />
                </>
              )}

              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              <Row label="Created" value={formatDate(invoice.createdAt)} />
              <Row label="Updated" value={formatDate(invoice.updatedAt)} />
            </>
          )}
        </div>

        {showActions && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {canMarkAsSent && (
              <button
                onClick={() => onMarkAsSent && onMarkAsSent(invoice)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
                <span>Mark as Sent</span>
              </button>
            )}
            {canRecordPayment && (
              <button
                onClick={() => onRecordPayment && onRecordPayment(invoice)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetailModal;