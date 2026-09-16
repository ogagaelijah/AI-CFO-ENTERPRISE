// frontend/src/components/TimeEntries/EditTimeEntryModal.jsx

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const EditTimeEntryModal = ({ isOpen, entry, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    projectId: '',
    customerId: '',
    entryDate: '',
    hours: '',
    description: '',
    billable: true,
  });
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen || !entry) return;
    setForm({
      projectId: entry.projectId ? String(entry.projectId) : '',
      customerId: entry.customerId ? String(entry.customerId) : '',
      entryDate: toDateInput(entry.entryDate),
      hours: entry.hours != null ? String(entry.hours) : '',
      description: entry.description || '',
      billable: entry.billable !== false,
    });
    setLocalError('');

    api.get('/projects', { params: { limit: 200 } })
      .then((res) => {
        if (res.data?.success) setProjects(res.data.projects || []);
      })
      .catch(() => {});

    api.get('/customers', { params: { limit: 200, type: 'CLIENT' } })
      .then((res) => {
        if (res.data?.success) setCustomers(res.data.customers || []);
      })
      .catch(() => {});
  }, [isOpen, entry]);

  if (!isOpen || !entry) return null;

  const isInvoiced = entry.invoiced === true;

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (localError) setLocalError('');
    if (error && setError) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Invoiced entries may only change description.
    if (isInvoiced) {
      setIsSubmitting(true);
      try {
        await onSubmit({ description: form.description.trim() });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const h = Number(form.hours);
    if (!form.hours || isNaN(h) || h <= 0) {
      setLocalError('Hours must be a positive number');
      return;
    }
    if (h > 24) {
      setLocalError('Hours cannot exceed 24 in a single entry');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        projectId: form.projectId ? Number(form.projectId) : null,
        customerId: form.customerId ? Number(form.customerId) : null,
        entryDate: form.entryDate || null,
        hours: h,
        description: form.description.trim(),
        billable: form.billable,
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Time Entry</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isInvoiced && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-3 py-2 rounded text-sm">
              This entry has been invoiced. Only the description can be edited.
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
              Project
            </label>
            <select
              value={form.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              disabled={isInvoiced}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">— No project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
              disabled={isInvoiced}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">— No client —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => handleChange('entryDate', e.target.value)}
                disabled={isInvoiced}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hours
              </label>
              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={form.hours}
                onChange={(e) => handleChange('hours', e.target.value)}
                disabled={isInvoiced}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit-billable"
              checked={form.billable}
              onChange={(e) => handleChange('billable', e.target.checked)}
              disabled={isInvoiced}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 disabled:opacity-60"
            />
            <label htmlFor="edit-billable" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Billable
            </label>
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

export default EditTimeEntryModal;