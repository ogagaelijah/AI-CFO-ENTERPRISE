// frontend/src/components/Reports/BalanceSheetReport.jsx

const BalanceSheetReport = ({ data, formatCurrency }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { assets, liabilities, equity, control } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Balance Sheet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          As at {new Date(data.asAtDate).toLocaleDateString()}
        </p>
        {control?.isBalanced ? (
          <span className="text-xs text-green-600 dark:text-green-400">✅ Balanced</span>
        ) : (
          <span className="text-xs text-red-600 dark:text-red-400">⚠️ Out of Balance</span>
        )}
      </div>

      <div className="p-6 space-y-6 font-mono text-sm">
        {/* =============================================
            ASSETS
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">ASSETS</h4>
          
          {/* Current Assets */}
          <div className="ml-4">
            <p className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Current Assets</p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cash</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Accounts Receivable</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.accountsReceivable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Inventory</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.inventory)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Current Assets</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.currentAssets?.otherCurrentAssets)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">Total Current Assets</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(assets?.currentAssets?.total)}</span>
              </div>
            </div>
          </div>

          {/* Non-Current Assets */}
          <div className="ml-4 mt-3">
            <p className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Non-Current Assets</p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Property & Equipment</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.nonCurrentAssets?.propertyAndEquipment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Non-Current Assets</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(assets?.nonCurrentAssets?.otherNonCurrentAssets)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">Total Non-Current Assets</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(assets?.nonCurrentAssets?.total)}</span>
              </div>
            </div>
          </div>

          {/* TOTAL ASSETS */}
          <div className="mt-3 pt-2 border-t-2 border-gray-400 dark:border-gray-500 flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">TOTAL ASSETS</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(assets?.totalAssets)}</span>
          </div>
        </div>

        {/* =============================================
            LIABILITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">LIABILITIES</h4>
          
          {/* Current Liabilities */}
          <div className="ml-4">
            <p className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Current Liabilities</p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Accounts Payable</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.accountsPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Short-Term Debt</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.shortTermDebt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Current Liabilities</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.otherCurrentLiabilities)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">Total Current Liabilities</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.currentLiabilities?.total)}</span>
              </div>
            </div>
          </div>

          {/* Non-Current Liabilities */}
          <div className="ml-4 mt-3">
            <p className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Non-Current Liabilities</p>
            <div className="space-y-1 pt-1 ml-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Long-Term Debt</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.nonCurrentLiabilities?.longTermDebt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Other Non-Current Liabilities</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.nonCurrentLiabilities?.otherNonCurrentLiabilities)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-semibold">
                <span className="text-gray-900 dark:text-white">Total Non-Current Liabilities</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.nonCurrentLiabilities?.total)}</span>
              </div>
            </div>
          </div>

          {/* TOTAL LIABILITIES */}
          <div className="mt-3 pt-2 border-t-2 border-gray-400 dark:border-gray-500 flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">TOTAL LIABILITIES</span>
            <span className="text-red-600 dark:text-red-400">{formatCurrency(liabilities?.totalLiabilities)}</span>
          </div>
        </div>

        {/* =============================================
            EQUITY
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">EQUITY</h4>
          <div className="ml-4 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Owner's Capital / Share Capital</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(equity?.ownersCapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Retained Earnings</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(equity?.retainedEarnings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Other Equity</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(equity?.otherEquity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Less Drawings / Dividends</span>
              <span className="text-red-600 dark:text-red-400">({formatCurrency(equity?.lessDrawings)})</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-600 pt-1 font-bold text-lg">
              <span className="text-gray-900 dark:text-white">TOTAL EQUITY</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(equity?.totalEquity)}</span>
            </div>
          </div>
        </div>

        {/* =============================================
            FUNDAMENTAL CONTROL
        ============================================= */}
        <div className="mt-4 pt-4 border-t-2 border-gray-400 dark:border-gray-500">
          <div className="flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">TOTAL LIABILITIES + EQUITY</span>
            <span className="text-purple-600 dark:text-purple-400">{formatCurrency(control?.liabilitiesAndEquity)}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-gray-600 dark:text-gray-400">Difference (Assets - Liabilities - Equity)</span>
            <span className={`font-bold ${Math.abs(control?.difference || 0) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(control?.difference)}
            </span>
          </div>
          <div className="mt-2 text-center">
            {control?.isBalanced ? (
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">✅ Assets = Liabilities + Equity</span>
            ) : (
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ Assets ≠ Liabilities + Equity</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetReport;