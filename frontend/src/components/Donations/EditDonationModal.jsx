// frontend/src/components/Donations/EditDonationModal.jsx
// Limited edit: amount, donor, pledge, date are LOCKED. Only
// category, method, referenceNumber, and notes can change.

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'TITHE', 'OFFERING', 'ZAKAT', 'SADAQAH', 'SEED',
  'BUILDING_FUND', 'MISSIONS', 'WELFARE', 'PLEDGE_PAYMENT',
  'GENERAL', 'OTHER',
];

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'POS', label: 'POS' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'OTHER', label: 'Other' },
];

const EditDonationModal = ({ isOpen, donation, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    category: 'GENERAL',
    method: 'CASH',
    referenceNumber: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen || !donation) return;
    setForm({
      category: donation.category || 'GENERAL',
      method: donation.method || 'CASH',
      referenceNumber: donation.referenceNumber || '',
      notes: donation.notes || '',
    });
    setLocalError('');
  }, [isOpen, donation]);

  if (!isOpen || !donation) return null;

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (localError) setLocalError('');
    if (error && setError) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const payload = {};
    if (form.category !== (donation.category || 'GENERAL')) payload.category = form.category;
    if (form.method !== (donation.method || 'CASH')) payload.method = form.method;
    if (form.referenceNumber !== (donation.referenceNumber || '')) {
      payload.referenceNumber = form.referenceNumber || null;
    }
    if (form.notes !== (donation.notes || '')) payload.notes = form.notes;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Donation</h2>
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

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs px-3 py-2 rounded">
            Amount, donor, pledge, and date are locked. To change these, delete this donation and record a new one.
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
              <select
                value={form.method}
                onChange={(e) => handleChange('method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference #</label>
            <input
              type="text"
              value={form.referenceNumber}
              onChange={(e) => handleChange('referenceNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDonationModal;