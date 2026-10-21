// frontend/src/components/Inventory/EditItemModal.jsx
// v2.0.0-prod — Adds Base Unit and Pack editing.

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import ReadOnlyBanner from '../common/ReadOnlyBanner';
import CommentSection from '../Comments/CommentSection';

const EditItemModal = ({ isOpen, item, onClose, onSubmit }) => {
  const { canWrite, guardMessage } = useWriteGuard();

  const [formData, setFormData] = useState({
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 5,
    baseUnit: 'Piece',
    packName: '',
    packMultiplier: '',
    packPrice: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        costPrice: item.cost_price || 0,
        sellingPrice: item.selling_price || 0,
        reorderLevel: item.reorder_level || 5,
        baseUnit: item.base_unit || 'Piece',
        packName: item.packs?.[0]?.pack_name || '',
        packMultiplier: item.packs?.[0]?.multiplier || '',
        packPrice: item.packs?.[0]?.selling_price || '',
      });
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        costPrice: parseFloat(formData.costPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        baseUnit: formData.baseUnit,
        packs: formData.packName && formData.packMultiplier ? [{
          packName: formData.packName,
          multiplier: parseFloat(formData.packMultiplier),
          sellingPrice: parseFloat(formData.packPrice) || 0
        }] : []
      };
      await onSubmit(item.id, payload);
    } catch (err) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const profit = parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice);
  const margin = parseFloat(formData.costPrice) > 0 ? (profit / parseFloat(formData.costPrice) * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Item: {item.item_name}</h2>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <ReadOnlyBanner />

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base Unit
            </label>
            <select name="baseUnit" value={formData.baseUnit} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="Piece">Piece</option>
              <option value="Kg">Kilogram (Kg)</option>
              <option value="Bag">Bag</option>
              <option value="Litre">Litre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price / {formData.baseUnit}</label>
              <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price / {formData.baseUnit}</label>
              <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600" min="0" step="0.01" />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <p className="text-xs text-gray-500 mb-2">Wholesale Pack (Optional)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Pack Name</label>
                <input type="text" name="packName" value={formData.packName} onChange={handleChange} placeholder="Carton" className="w-full px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Qty per Pack</label>
                <input type="number" name="packMultiplier" value={formData.packMultiplier} onChange={handleChange} placeholder="12" className="w-full px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Price / Pack</label>
                <input type="number" name="packPrice" value={formData.packPrice} onChange={handleChange} placeholder="0.00" className="w-full px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level</label>
            <input type="number" name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600" min="0" />
          </div>

          {profit > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
              <p className="text-green-700 dark:text-green-400">
                Profit per {formData.baseUnit}: ₦{profit.toLocaleString()} ({margin}% margin)
              </p>
            </div>
          )}

          <CommentSection entityType="INVENTORY" entityId={item.id} />

          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={handleClose} className="flex-1 px-4 py-2 border rounded-lg dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading || !canWrite} title={guardMessage} className={`flex-1 px-4 py-2 rounded-lg transition ${loading || !canWrite ? 'bg-gray-300 text-gray-500' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
              {loading ? 'Updating...' : 'Update Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;