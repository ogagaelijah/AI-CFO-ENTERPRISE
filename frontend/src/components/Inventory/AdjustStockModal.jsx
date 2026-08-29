// frontend/src/components/Inventory/AdjustStockModal.jsx
import { useState } from 'react';
import { X } from 'lucide-react';

const AdjustStockModal = ({ isOpen, item, onClose, onSubmit }) => {
  const [adjustType, setAdjustType] = useState('add');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  if (!isOpen || !item) return null;

  const handleNext = () => {
    if (!quantity || quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (adjustType === 'remove' && quantity > item.quantity) {
      setError(`Cannot remove ${quantity} units. Only ${item.quantity} units available.`);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let adjustment = quantity;
      if (adjustType === 'remove') adjustment = -quantity;
      else if (adjustType === 'set') {
        adjustment = quantity - item.quantity;
      }
      await onSubmit(item.id, { adjustment, reason: `Manual adjustment: ${adjustType} ${quantity} units` });
    } catch (err) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustType('add');
    setQuantity(1);
    setStep(1);
    setError('');
    onClose();
  };

  const getNewQuantity = () => {
    if (adjustType === 'add') return (item.quantity || 0) + quantity;
    if (adjustType === 'remove') return (item.quantity || 0) - quantity;
    return quantity;
  };

  const newQuantity = getNewQuantity();

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adjust Stock: {item.item_name}</h2>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Quantity: <span className="font-bold">{item.quantity || 0} units</span></p>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adjustment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['add', 'remove', 'set'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setAdjustType(type); setError(''); }}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                      adjustType === type
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type === 'add' ? 'Add' : type === 'remove' ? 'Remove' : 'Set Exact'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => { setQuantity(parseInt(e.target.value) || 0); setError(''); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="1"
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Adjustment</h2>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Confirm stock adjustment:</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Item:</span> {item.item_name}</p>
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Current Quantity:</span> {item.quantity || 0} units</p>
              <p><span className="font-medium text-gray-700 dark:text-gray-300">Action:</span> {adjustType === 'add' ? 'Add' : adjustType === 'remove' ? 'Remove' : 'Set to'} {quantity} units</p>
              <p><span className="font-medium text-gray-700 dark:text-gray-300">New Quantity:</span> <span className="font-bold text-blue-600 dark:text-blue-400">{newQuantity} units</span></p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustStockModal;