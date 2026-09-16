// frontend/src/components/Invoices/RecordInvoiceModal.jsx

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const todayISO = () => new Date().toISOString().slice(0, 10);

const RecordInvoiceModal = ({ isOpen, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    customerId: '',
    projectId: '',
    issueDate: todayISO(),
    dueDate: '',
    subtotal: '',
    tax: '',
    notes: '',
  });
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      customerId: '',
      projectId: '',
      issueDate: todayISO(),
      dueDate: '',
      subtotal: '',
      tax: '',
      notes: '',
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
  }, [isOpen]);

  if (!isOpen) return null;

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

    if (subtotalNum < 0) {
      setLocalError('Subtotal cannot be negative');
      return;
    }
    if (taxNum < 0) {
      setLocalError('Tax cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        customerId: form.customerId ? Number(form.customerId) : null,
        projectId: form.projectId ? Number(form.projectId) : null,
        issueDate: form.issueDate || todayISO(),
        dueDate: form.dueDate || null,
        subtotal: subtotalNum,
        tax: taxNum,
        notes: form.notes.trim(),
      });
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Invoice</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Invoice number is generated automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client
            </label>
            <select
              value={form.customerId}
              onChange={(e) => handleChange('customerId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => handleChange('issueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ₦{computedTotal.toLocaleString()}
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
              placeholder="Optional notes"
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
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordInvoiceModal;