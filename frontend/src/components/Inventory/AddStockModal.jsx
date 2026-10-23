// frontend/src/components/Inventory/AddStockModal.jsx
// v2.0.0-prod — Adds Base Unit and Carton Multipliers.

import { useState } from 'react';
import { X } from 'lucide-react';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import ReadOnlyBanner from '../common/ReadOnlyBanner';

const AddStockModal = ({ isOpen, onClose, onSubmit }) => {
  const { canWrite, guardMessage } = useWriteGuard();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    itemName: '',
    baseUnit: 'Piece', // ★ NEW
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    packName: '', // ★ NEW (e.g. 'Carton')
    packMultiplier: '', // ★ NEW (e.g. 12)
    packPrice: '', // ★ NEW
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && !formData.itemName.trim()) {
      setError('Item name is required');
      return;
    }
    if (step === 2 && (!formData.quantity || parseFloat(formData.quantity) <= 0)) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (step === 3 && (!formData.costPrice || parseFloat(formData.costPrice) < 0)) {
      setError('Cost price cannot be negative');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) < 0) {
      setError('Selling price cannot be negative');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        itemName: formData.itemName,
        baseUnit: formData.baseUnit,
        quantity: parseFloat(formData.quantity),
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        // Optional Carton data
        packs: formData.packName && formData.packMultiplier ? [{
          packName: formData.packName,
          multiplier: parseFloat(formData.packMultiplier),
          sellingPrice: parseFloat(formData.packPrice) || 0
        }] : []
      };
      await onSubmit(payload);
      setFormData({ itemName: '', baseUnit: 'Piece', quantity: '', costPrice: '', sellingPrice: '', packName: '', packMultiplier: '', packPrice: '' });
      setStep(1);
    } catch (err) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ itemName: '', baseUnit: 'Piece', quantity: '', costPrice: '', sellingPrice: '', packName: '', packMultiplier: '', packPrice: '' });
    setStep(1);
    setError('');
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter item name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.baseUnit}
                onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Piece">Piece</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Bag">Bag</option>
                <option value="Litre">Litre</option>
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opening Stock Quantity ({formData.baseUnit}s) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="1"
                placeholder="0"
              />
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <p className="text-xs text-gray-500 mb-2">Optional: Define a wholesale pack (e.g. Carton)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pack Name</label>
                  <input type="text" placeholder="e.g. Carton" value={formData.packName} onChange={(e) => setFormData({ ...formData, packName: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qty per Pack</label>
                  <input type="number" placeholder="e.g. 12" value={formData.packMultiplier} onChange={(e) => setFormData({ ...formData, packMultiplier: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cost Price per {formData.baseUnit} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        );
      case 4:
        const qty = parseFloat(formData.quantity) || 0;
        const cost = parseFloat(formData.costPrice) || 0;
        const sell = parseFloat(formData.sellingPrice) || 0;
        
        const totalCost = qty * cost;
        const totalSell = qty * sell;
        const totalProfit = totalSell - totalCost;
        const margin = cost > 0 ? ((sell - cost) / cost * 100).toFixed(1) : 0;

        return (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Confirm stock addition:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Item:</span> {formData.itemName}</p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Quantity:</span> {qty} {formData.baseUnit}s</p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Cost Price:</span> ₦{cost.toLocaleString()} / {formData.baseUnit}</p>
                {formData.packName && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium">Pack: 1 {formData.packName} = {formData.packMultiplier} {formData.baseUnit}s</p>
                )}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Total Cost:</span> ₦{totalCost.toLocaleString()}</p>
                  <p><span className="font-medium text-green-600 dark:text-green-400">Potential Profit:</span> ₦{totalProfit.toLocaleString()} ({margin}% margin)</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Selling Price per {formData.baseUnit} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              {formData.packName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selling Price per {formData.packName}
                  </label>
                  <input
                    type="number"
                    value={formData.packPrice}
                    onChange={(e) => setFormData({ ...formData, packPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Enter Item Name & Unit';
      case 2: return 'Enter Quantity & Pack';
      case 3: return 'Enter Cost Price';
      case 4: return 'Enter Selling Price & Confirm';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Stock</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{getStepTitle()} ({step}/4)</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <ReadOnlyBanner className="mb-4" />

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {renderStep()}

          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleBack}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                step === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              disabled={step === 1}
            >
              Back
            </button>
            <div className="space-x-2">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !canWrite}
                  title={guardMessage}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    loading || !canWrite
                      ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {loading ? 'Adding...' : 'Add Stock'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;