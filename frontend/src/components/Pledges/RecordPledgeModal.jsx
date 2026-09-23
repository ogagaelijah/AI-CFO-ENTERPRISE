// frontend/src/components/Pledges/RecordPledgeModal.jsx

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { X, AlertCircle } from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

const CATEGORIES = [
  'TITHE', 'OFFERING', 'ZAKAT', 'SADAQAH', 'SEED',
  'BUILDING_FUND', 'MISSIONS', 'WELFARE', 'PLEDGE_PAYMENT',
  'GENERAL', 'OTHER',
];

const RecordPledgeModal = ({ isOpen, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    donorId: '',
    amount: '',
    category: 'GENERAL',
    pledgeDate: todayISO(),
    dueDate: '',
    notes: '',
  });
  const [donors, setDonors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      donorId: '', amount: '', category: 'GENERAL',
      pledgeDate: todayISO(), dueDate: '', notes: '',
    });
    setLocalError('');
    (async () => {
      try {
        const res = await api.get('/customers', { params: { limit: 500 } });
        const list = res.data?.customers || res.data?.data || [];
        setDonors(list);
      } catch (e) {
        console.error('Donor load error:', e);
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

    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setLocalError('Amount must be a positive number');
      return;
    }
    if (!form.pledgeDate) {
      setLocalError('Pledge date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        donorId: form.donorId ? parseInt(form.donorId, 10) : null,
        amount: amt,
        category: form.category,
        pledgeDate: form.pledgeDate,
        dueDate: form.dueDate || null,
        notes: form.notes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Pledge</h2>
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
              Donor (optional)
            </label>
            <select
              value={form.donorId}
              onChange={(e) => handleChange('donorId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">— Anonymous —</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>{d.name || d.fullName || `Donor #${d.id}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (₦) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c.replace(/_/g, ' ')}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pledge Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.pledgeDate}
                onChange={(e) => handleChange('pledgeDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg transition">
              {isSubmitting ? 'Creating...' : 'Create Pledge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPledgeModal;