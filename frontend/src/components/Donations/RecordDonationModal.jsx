// frontend/src/components/Donations/RecordDonationModal.jsx

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { X, AlertCircle } from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

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

const RecordDonationModal = ({ isOpen, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    donorId: '',
    pledgeId: '',
    amount: '',
    category: 'GENERAL',
    method: 'CASH',
    donationDate: todayISO(),
    referenceNumber: '',
    notes: '',
  });
  const [donors, setDonors] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      donorId: '', pledgeId: '', amount: '', category: 'GENERAL',
      method: 'CASH', donationDate: todayISO(), referenceNumber: '', notes: '',
    });
    setLocalError('');
    (async () => {
      try {
        const [custRes, plgRes] = await Promise.all([
          api.get('/customers', { params: { limit: 500 } }),
          api.get('/pledges', { params: { limit: 500, status: 'ACTIVE' } }),
        ]);
        setDonors(custRes.data?.customers || custRes.data?.data || []);
        setPledges(plgRes.data?.pledges || []);
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

  // Auto-fill donor when a pledge is picked (if it has one)
  const handlePledgeChange = (pledgeId) => {
    handleChange('pledgeId', pledgeId);
    if (pledgeId) {
      const pledge = pledges.find((p) => String(p.id) === String(pledgeId));
      if (pledge && pledge.donorId && !form.donorId) {
        setForm((f) => ({ ...f, donorId: String(pledge.donorId) }));
      }
      if (pledge && !form.category) {
        setForm((f) => ({ ...f, category: pledge.category || 'GENERAL' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setLocalError('Amount must be a positive number');
      return;
    }
    if (!form.donationDate) {
      setLocalError('Donation date is required');
      return;
    }

    // Validate against pledge balance if a pledge is picked
    if (form.pledgeId) {
      const pledge = pledges.find((p) => String(p.id) === String(form.pledgeId));
      if (pledge && amt > Number(pledge.balance)) {
        setLocalError(
          `Amount exceeds pledge balance (₦${Number(pledge.balance).toLocaleString()})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        donorId: form.donorId ? parseInt(form.donorId, 10) : null,
        pledgeId: form.pledgeId ? parseInt(form.pledgeId, 10) : null,
        amount: amt,
        category: form.category,
        method: form.method,
        donationDate: form.donationDate,
        referenceNumber: form.referenceNumber || null,
        notes: form.notes,
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Donation</h2>
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
              Linked Pledge (optional)
            </label>
            <select
              value={form.pledgeId}
              onChange={(e) => handlePledgeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">— No pledge —</option>
              {pledges.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.donorName || 'Anonymous'} — ₦{Number(p.amount).toLocaleString()}
                  {' '}({Number(p.progressPercent) || 0}% fulfilled)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selecting a pledge auto-fills the donor and increments the pledge fulfilment.
            </p>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.donationDate}
                onChange={(e) => handleChange('donationDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference #</label>
              <input
                type="text"
                value={form.referenceNumber}
                onChange={(e) => handleChange('referenceNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional"
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
              {isSubmitting ? 'Recording...' : 'Record Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordDonationModal;