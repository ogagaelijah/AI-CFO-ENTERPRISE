// frontend/src/components/Fees/GenerateClassFeesModal.jsx
// Generates one fee per ACTIVE student in a class for a term.
// POST /api/fees/bulk

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { X, AlertCircle } from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

const GenerateClassFeesModal = ({ isOpen, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    classId: '',
    termId: '',
    issueDate: todayISO(),
    dueDate: '',
    status: 'DRAFT',
  });
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      classId: '', termId: '', issueDate: todayISO(), dueDate: '', status: 'DRAFT',
    });
    setLocalError('');
    (async () => {
      try {
        const [t, c] = await Promise.all([
          api.get('/terms',   { params: { limit: 200 } }),
          api.get('/classes', { params: { limit: 200, status: 'ACTIVE' } }),
        ]);
        setTerms(t.data?.terms || []);
        setClasses(c.data?.classes || []);
      } catch (e) {
        console.error('Picker load error:', e);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (localError) setLocalError('');
    if (error && setError) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!form.classId) { setLocalError('Class is required'); return; }
    if (!form.termId)  { setLocalError('Term is required');  return; }

    setIsSubmitting(true);
    try {
      await onSubmit({
        classId: parseInt(form.classId, 10),
        termId: parseInt(form.termId, 10),
        issueDate: form.issueDate,
        dueDate: form.dueDate || null,
        status: form.status,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generate Class Fees</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              One fee per ACTIVE student in the class
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
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
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={form.classId}
              onChange={(e) => handleChange('classId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">— Select class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.termFee ? ` — ₦${Number(c.termFee).toLocaleString()}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Term <span className="text-red-500">*</span>
            </label>
            <select
              value={form.termId}
              onChange={(e) => handleChange('termId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">— Select term —</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.session} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => handleChange('issueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="DRAFT">Draft (recommended — review before sending)</option>
              <option value="SENT">Sent (creates debtor rows immediately)</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg transition">
              {isSubmitting ? 'Generating...' : 'Generate Fees'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateClassFeesModal;