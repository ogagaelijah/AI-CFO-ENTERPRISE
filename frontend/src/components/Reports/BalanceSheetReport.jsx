// frontend/src/components/Reports/BalanceSheetReport.jsx

const BalanceSheetReport = ({ data, formatCurrency }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different date.</p>
      </div>
    );
  }

  const { assets, liabilities, equity, control, asAtDate } = data;

  // Safe values for calculations
  const totalAssets = assets?.totalAssets || 0;
  const inventory = assets?.currentAssets?.inventory || 0;
  const accountsReceivable = assets?.currentAssets?.accountsReceivable || 0;
  const accountsPayable = liabilities?.currentLiabilities?.accountsPayable || 0;
  const isBalanced = control?.isBalanced || false;

  // Calculate inventory percentage of total assets
  const inventoryPercentage = totalAssets > 0 
    ? (inventory / totalAssets * 100).toFixed(1) 
    : 0;

  // Format the date
  const formattedDate = asAtDate 
    ? new Date(asAtDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
          BALANCE SHEET
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          As at: {formattedDate}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Currency: NGN (₦)
        </p>
      </div>

      <div className="p-6 space-y-6 font-mono text-sm">
        {/* =============================================
            ASSETS
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">
            ASSETS
          </h4>
          
          {/* Current Assets */}
          <div className="ml-4 mt-3">
            <p className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
              CURRENT ASSETS
            </p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cash & Cash Equivalents</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.cash || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Accounts Receivable</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.accountsReceivable || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Inventory</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.inventory || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Current Assets</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.otherCurrentAssets || 0)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">TOTAL CURRENT ASSETS</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(assets?.currentAssets?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Non-Current Assets */}
          <div className="ml-4 mt-3">
            <p className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
              NON-CURRENT ASSETS
            </p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Property & Equipment</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.nonCurrentAssets?.propertyAndEquipment || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Non-Current Assets</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.nonCurrentAssets?.otherNonCurrentAssets || 0)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">TOTAL NON-CURRENT ASSETS</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(assets?.nonCurrentAssets?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* TOTAL ASSETS */}
          <div className="mt-3 pt-2 border-t-2 border-gray-400 dark:border-gray-500 flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">TOTAL ASSETS</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(assets?.totalAssets || 0)}</span>
          </div>
        </div>

        {/* =============================================
            LIABILITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">
            LIABILITIES
          </h4>
          
          {/* Current Liabilities */}
          <div className="ml-4 mt-3">
            <p className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
              CURRENT LIABILITIES
            </p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Accounts Payable</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.accountsPayable || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Short-Term Debt</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.shortTermDebt || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Current Liabilities</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.otherCurrentLiabilities || 0)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">TOTAL CURRENT LIABILITIES</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Non-Current Liabilities */}
          <div className="ml-4 mt-3">
            <p className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
              NON-CURRENT LIABILITIES
            </p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Long-Term Debt</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.nonCurrentLiabilities?.longTermDebt || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Non-Current Liabilities</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.nonCurrentLiabilities?.otherNonCurrentLiabilities || 0)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">TOTAL NON-CURRENT LIABILITIES</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.nonCurrentLiabilities?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* TOTAL LIABILITIES */}
          <div className="mt-3 pt-2 border-t-2 border-gray-400 dark:border-gray-500 flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">TOTAL LIABILITIES</span>
            <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.totalLiabilities || 0)}</span>
          </div>
        </div>

        {/* =============================================
            EQUITY
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">
            EQUITY
          </h4>
          <div className="ml-4 space-y-1 mt-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Owner's Capital</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(equity?.ownersCapital || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Retained Earnings</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(equity?.retainedEarnings || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Other Equity</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(equity?.otherEquity || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Less: Drawings</span>
              <span className="text-red-600 dark:text-red-400">({formatCurrency(equity?.lessDrawings || 0)})</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-bold text-lg">
              <span className="text-gray-900 dark:text-white">TOTAL EQUITY</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(equity?.totalEquity || 0)}</span>
            </div>
          </div>
        </div>

        {/* =============================================
            TOTAL LIABILITIES + EQUITY
        ============================================= */}
        <div className="mt-4 pt-4 border-t-2 border-gray-400 dark:border-gray-500">
          <div className="flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">TOTAL LIABILITIES + EQUITY</span>
            <span className="text-purple-600 dark:text-purple-400">
              {formatCurrency((liabilities?.totalLiabilities || 0) + (equity?.totalEquity || 0))}
            </span>
          </div>
        </div>

        {/* =============================================
            BALANCE CHECK
        ============================================= */}
        <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
          <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3">
            BALANCE CHECK
          </h4>
          <div className="space-y-1 ml-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Assets</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Liabilities + Equity</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency((liabilities?.totalLiabilities || 0) + (equity?.totalEquity || 0))}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
              <span className="text-gray-600 dark:text-gray-400">Difference</span>
              <span className={`font-bold ${Math.abs(control?.difference || 0) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(control?.difference || 0)}
              </span>
            </div>
            <div className="mt-2 text-center py-1">
              {isBalanced ? (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">✅ BALANCED</span>
              ) : (
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ OUT OF BALANCE</span>
              )}
            </div>
          </div>
        </div>

        {/* =============================================
            AI CFO INSIGHTS
        ============================================= */}
        {totalAssets > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3">
              AI CFO INSIGHTS
            </h4>
            <div className="space-y-1 ml-4 text-sm text-gray-600 dark:text-gray-400">
              {inventory > 0 && (
                <p>• Inventory represents {inventoryPercentage}% of total assets.</p>
              )}
              {accountsReceivable > 0 && (
                <p>• {formatCurrency(accountsReceivable)} is currently tied up in receivables.</p>
              )}
              {accountsPayable > 0 && (
                <p>• Supplier obligations total {formatCurrency(accountsPayable)}.</p>
              )}
              {isBalanced && (
                <p>• Overall financial position is balanced.</p>
              )}
            </div>
            {accountsReceivable > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  ⚠️ MANAGEMENT ATTENTION
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Monitor receivable collection and inventory turnover.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceSheetReport;