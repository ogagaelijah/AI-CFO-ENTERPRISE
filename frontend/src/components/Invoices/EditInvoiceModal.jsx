// frontend/src/components/Invoices/EditInvoiceModal.jsx

import { useState, useEffect } from 'react';
import { X, AlertCircle, Lock } from 'lucide-react';
import api from '../../services/api';

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const EditInvoiceModal = ({ isOpen, invoice, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    customerId: '',
    projectId: '',
    issueDate: '',
    dueDate: '',
    status: 'DRAFT',
    subtotal: '',
    tax: '',
    notes: '',
  });
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen || !invoice) return;
    setForm({
      customerId: invoice.customerId ? String(invoice.customerId) : '',
      projectId: invoice.projectId ? String(invoice.projectId) : '',
      issueDate: toDateInput(invoice.issueDate),
      dueDate: toDateInput(invoice.dueDate),
      status: invoice.status || 'DRAFT',
      subtotal: invoice.subtotal != null ? String(invoice.subtotal) : '',
      tax: invoice.tax != null ? String(invoice.tax) : '',
      notes: invoice.notes || '',
    });
    setLocalError('');

    api.get('/customers', { params: { limit: 200, type: 'CLIENT' } })
      .then((res) => {
        if (res.data?.success) setCustomers(res.data.customers || []);
      })
      .catch(() => {});

    api.get('/projects', { params: { limit: 200 } })
      .then((res) => {
        if (res.data?.success) setProjects(res.data.projects || []);
      })
      .catch(() => {});
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  // Locking rules — mirror the backend's UpdateInvoiceUseCase validations.
  const hasPayments = Number(invoice.amountPaid) > 0;
  const isPaid = invoice.status === 'PAID';

  // If PAID: only notes editable.
  // If has payments (but not PAID): amounts are locked.
  const amountsLocked = hasPayments || isPaid;
  const nonNotesLocked = isPaid;

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (localError) setLocalError('');
    if (error && setError) setError('');
  };

  const subtotalNum = Number(form.subtotal) || 0;
  const taxNum = Number(form.tax) || 0;
  const computedTotal = Math.round((subtotalNum + taxNum) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // PAID invoices: only notes may be sent.
    if (isPaid) {
      setIsSubmitting(true);
      try {
        await onSubmit({ notes: form.notes.trim() });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (subtotalNum < 0) {
      setLocalError('Subtotal cannot be negative');
      return;
    }
    if (taxNum < 0) {
      setLocalError('Tax cannot be negative');
      return;
    }

    const payload = {
      customerId: form.customerId ? Number(form.customerId) : null,
      projectId: form.projectId ? Number(form.projectId) : null,
      issueDate: form.issueDate || null,
      dueDate: form.dueDate || null,
      status: form.status,
      notes: form.notes.trim(),
    };

    // Only send amounts if they're not locked.
    if (!amountsLocked) {
      payload.subtotal = subtotalNum;
      payload.tax = taxNum;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Invoice</h2>
            {invoice.invoiceNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {invoice.invoiceNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isPaid && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>This invoice is fully paid. Only notes can be edited.</span>
            </div>
          )}
          {!isPaid && hasPayments && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-3 py-2 rounded text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Payments recorded — amounts are locked.</span>
            </div>
          )}

          {displayError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={nonNotesLocked}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client
            </label>
            <select
              value={form.customerId}
              onChange={(e) => handleChange('customerId', e.target.value)}
              disabled={nonNotesLocked}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">— No client —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project
            </label>
            <select
              value={form.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              disabled={nonNotesLocked}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">— No project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => handleChange('issueDate', e.target.value)}
                disabled={nonNotesLocked}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                disabled={nonNotesLocked}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subtotal (₦)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.subtotal}
                onChange={(e) => handleChange('subtotal', e.target.value)}
                disabled={amountsLocked}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax (₦)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tax}
                onChange={(e) => handleChange('tax', e.target.value)}
                disabled={amountsLocked}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ₦{(amountsLocked ? Number(invoice.total) : computedTotal).toLocaleString()}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoiceModal;