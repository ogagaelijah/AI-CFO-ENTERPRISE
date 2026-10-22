// frontend/src/components/debtors/AddDebtorModal.jsx
// v1.2.0-prod — Replaces free-text date with Due Date dropdown (3, 7, 14, 30 days).

import { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import ReadOnlyBanner from '../common/ReadOnlyBanner';

const AddDebtorModal = ({ isOpen, onClose, onSuccess }) => {
  const { canWrite, guardMessage } = useWriteGuard();

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    totalOwed: 0,
    dueDays: 3, // ★ NEW: Default to 3 days
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalOwed' || name === 'dueDays' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      setIsLoading(false);
      return;
    }

    if (!formData.totalOwed || formData.totalOwed <= 0) {
      setError('Amount owed must be greater than 0');
      setIsLoading(false);
      return;
    }

    // ★ NEW: Calculate the actual due date based on the selected days
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + Number(formData.dueDays));

    try {
      const response = await api.post('/debtors', {
        customerName: formData.customerName.trim(),
        phone: formData.phone.trim() || null,
        totalOwed: formData.totalOwed,
        dueDate: dueDateObj.toISOString(), // Send the calculated date
        notes: formData.notes.trim() || '',
      });

      if (response.data?.success) {
        setSuccess('✅ Debtor added successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
          setFormData({
            customerName: '',
            phone: '',
            totalOwed: 0,
            dueDays: 3,
            notes: '',
          });
          setSuccess('');
        }, 1000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add debtor');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Debtor</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            disabled={isLoading}
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <ReadOnlyBanner />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter customer name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter phone number"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount Owed (₦) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="totalOwed"
              value={formData.totalOwed || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
              disabled={isLoading}
            />
          </div>

          {/* ★ NEW: Due Days Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Terms
            </label>
            <select
              name="dueDays"
              value={formData.dueDays}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value={3}>Due in 3 Days (Default)</option>
              <option value={7}>Due in 7 Days</option>
              <option value={14}>Due in 14 Days</option>
              <option value={30}>Due in 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows="2"
              placeholder="Additional notes..."
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !canWrite}
              title={guardMessage}
              className={`flex-1 px-4 py-2 rounded-lg transition ${
                isLoading || !canWrite
                  ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isLoading ? 'Adding...' : 'Add Debtor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtorModal;