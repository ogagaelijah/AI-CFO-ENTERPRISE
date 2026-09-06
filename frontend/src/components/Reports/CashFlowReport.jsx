// frontend/src/components/Reports/CashFlowReport.jsx

const CashFlowReport = ({ data, formatCurrency }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this period.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different period.</p>
      </div>
    );
  }

  const { 
    period,
    operatingActivities,
    investingActivities,
    financingActivities,
    openingCash,
    closingCash,
    netChangeInCash,
  } = data;

  // Safeguards
  const safeOperating = operatingActivities || { 
    cashIn: { fromCustomers: 0, fromDebtors: 0, fromOtherIncome: 0, total: 0 },
    cashOut: { toSuppliers: 0, toCreditors: 0, operatingExpenses: 0, total: 0 },
    netOperatingCash: 0,
  };

  // ✅ FIX: Calculate totals if they're not provided
  const totalCashIn = safeOperating.cashIn?.total !== undefined 
    ? safeOperating.cashIn.total 
    : (safeOperating.cashIn?.fromCustomers || 0) + 
      (safeOperating.cashIn?.fromDebtors || 0) + 
      (safeOperating.cashIn?.fromOtherIncome || 0);

  const totalCashOut = safeOperating.cashOut?.total !== undefined 
    ? safeOperating.cashOut.total 
    : (safeOperating.cashOut?.toSuppliers || 0) + 
      (safeOperating.cashOut?.toCreditors || 0) + 
      (safeOperating.cashOut?.operatingExpenses || 0);

  const safeInvesting = investingActivities || { purchaseOfEquipment: 0, netInvestingCash: 0 };
  const safeFinancing = financingActivities || { loansReceived: 0, ownerContributions: 0, netFinancingCash: 0 };

  // Format dates
  const start = period?.startDate ? new Date(period.startDate) : new Date();
  const end = period?.endDate ? new Date(period.endDate) : new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cash Flow Statement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {start.toLocaleDateString()} - {end.toLocaleDateString()}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* =============================================
            OPERATING ACTIVITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Operating Activities</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Cash generated from core business operations</p>
          
          {/* CASH IN */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Cash In</p>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 ml-4">From Customers</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(safeOperating.cashIn?.fromCustomers || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 ml-4">From Debtors</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(safeOperating.cashIn?.fromDebtors || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 ml-4">From Other Income</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(safeOperating.cashIn?.fromOtherIncome || 0)}</span>
              </div>
              
              {/* ✅ TOTAL CASH IN - FIXED */}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300 dark:border-gray-600">
                <span className="text-gray-900 dark:text-white ml-4">Total Cash In</span>
                <span className="text-green-700 dark:text-green-300">{formatCurrency(totalCashIn)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">Money received from operations</p>
          </div>

          {/* CASH OUT */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Cash Out</p>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 ml-4">To Suppliers</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(safeOperating.cashOut?.toSuppliers || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 ml-4">To Creditors</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(safeOperating.cashOut?.toCreditors || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 ml-4">Operating Expenses</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(safeOperating.cashOut?.operatingExpenses || 0)}</span>
              </div>
              
              {/* ✅ TOTAL CASH OUT - FIXED */}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300 dark:border-gray-600">
                <span className="text-gray-900 dark:text-white ml-4">Total Cash Out</span>
                <span className="text-red-700 dark:text-red-300">{formatCurrency(totalCashOut)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">Money paid for operations</p>
          </div>

          {/* NET */}
          <div className="mt-3 pt-2 border-t-2 border-gray-400 dark:border-gray-500 flex justify-between font-bold text-base">
            <span className="text-gray-900 dark:text-white">NET Operating Cash Flow</span>
            <span className={`${safeOperating.netOperatingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(safeOperating.netOperatingCash || 0)}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Cash In – Cash Out</p>
        </div>

        {/* =============================================
            INVESTING ACTIVITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Investing Activities</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Cash used for asset purchases and investments</p>
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 ml-4">Purchase of Equipment</span>
              <span className="text-red-600 dark:text-red-400">{formatCurrency(safeInvesting.purchaseOfEquipment || 0)}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-semibold">
            <span className="text-gray-900 dark:text-white">Net Cash from Investing Activities</span>
            <span className={`${safeInvesting.netInvestingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(safeInvesting.netInvestingCash || 0)}
            </span>
          </div>
        </div>

        {/* =============================================
            FINANCING ACTIVITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Financing Activities</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Cash from loans, investments, and owner contributions</p>
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 ml-4">Loans Received</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(safeFinancing.loansReceived || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 ml-4">Owner Contributions</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(safeFinancing.ownerContributions || 0)}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-semibold">
            <span className="text-gray-900 dark:text-white">Net Cash from Financing Activities</span>
            <span className={`${safeFinancing.netFinancingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(safeFinancing.netFinancingCash || 0)}
            </span>
          </div>
        </div>

        {/* =============================================
            NET CHANGE
        ============================================= */}
        <div className="border-t-2 border-gray-400 dark:border-gray-500 pt-4 space-y-2">
          <div className="flex justify-between font-bold">
            <span className="text-gray-900 dark:text-white">Net Change in Cash</span>
            <span className={`${netChangeInCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(netChangeInCash || 0)}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Total cash movement during the period</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Opening Cash</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(openingCash || 0)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Cash at start of period</p>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Closing Cash</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(closingCash || 0)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Cash at end of period</p>
        </div>
      </div>
    </div>
  );
};

export default CashFlowReport;