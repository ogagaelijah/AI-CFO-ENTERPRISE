// frontend/src/components/Inventory/AddStockModal.jsx
// v3.3.0-prod — Allows decimals in quantity and packs.

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import ReadOnlyBanner from '../common/ReadOnlyBanner';

const AddStockModal = ({ isOpen, onClose, onSubmit }) => {
  const { canWrite, guardMessage } = useWriteGuard();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    itemName: '',
    baseUnit: 'Piece',
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    packs: [], 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddPack = () => {
    setFormData({
      ...formData,
      packs: [...formData.packs, { packName: '', multiplier: '', sellingPrice: '' }]
    });
  };

  const handleRemovePack = (index) => {
    const newPacks = formData.packs.filter((_, i) => i !== index);
    setFormData({ ...formData, packs: newPacks });
  };

  const handlePackChange = (index, field, value) => {
    const newPacks = [...formData.packs];
    newPacks[index][field] = value;
    setFormData({ ...formData, packs: newPacks });
  };

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
        packs: formData.packs
          .filter(p => p.packName && p.multiplier)
          .map(p => ({
            packName: p.packName,
            multiplier: parseFloat(p.multiplier),
            sellingPrice: parseFloat(p.sellingPrice) || 0
          }))
      };
      await onSubmit(payload);
      
      setFormData({ itemName: '', baseUnit: 'Piece', quantity: '', costPrice: '', sellingPrice: '', packs: [] });
      setStep(1);
    } catch (err) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ itemName: '', baseUnit: 'Piece', quantity: '', costPrice: '', sellingPrice: '', packs: [] });
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
                placeholder="e.g. Milo"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Unit (Smallest unit) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.baseUnit}
                onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Piece">Piece / Roll</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Bag">Bag</option>
                <option value="Litre">Litre</option>
                <option value="Sachet">Sachet</option>
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
                min="0"
                step="any" // ★ ALLOWS DECIMALS
                placeholder="e.g. 100.5"
              />
              <p className="text-xs text-gray-500 mt-1">How many individual pieces/rolls do you have in total?</p>
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
              step="any"
              placeholder="0.00"
            />
          </div>
        );
      case 4:
        const qty = parseFloat(formData.quantity) || 0;
        const cost = parseFloat(formData.costPrice) || 0;
        const totalCost = qty * cost;

        return (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Confirm base stock:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Item:</span> {formData.itemName}</p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Quantity:</span> {qty} {formData.baseUnit}s</p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Total Cost:</span> ₦{totalCost.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Selling Price per {formData.baseUnit} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="0"
                step="any"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">This is the price for 1 {formData.baseUnit} (e.g., 1 Roll).</p>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wholesale Packs (Optional)</p>
              <p className="text-xs text-gray-500 mb-3">e.g. Carton, Half Carton, Quarter Carton</p>

              {formData.packs.map((pack, index) => (
                <div key={index} className="flex gap-2 mb-2 items-start bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Pack Name (e.g. Carton)"
                      value={pack.packName}
                      onChange={(e) => handlePackChange(index, 'packName', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={pack.multiplier}
                      onChange={(e) => handlePackChange(index, 'multiplier', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      step="any" // ★ ALLOWS DECIMALS
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Price ₦"
                      value={pack.sellingPrice}
                      onChange={(e) => handlePackChange(index, 'sellingPrice', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      step="any"
                    />
                  </div>
                  <button type="button" onClick={() => handleRemovePack(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddPack}
                className="w-full mt-2 py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 transition"
              >
                <Plus className="w-4 h-4" /> Add Wholesale Pack
              </button>
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
      case 2: return 'Enter Quantity';
      case 3: return 'Enter Cost Price';
      case 4: return 'Prices & Packs';
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