// frontend/src/components/Reports/CashFlowReport.jsx

const CashFlowReport = ({ data, formatCurrency }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { operatingActivities, investingActivities, financingActivities, openingCash, closingCash, netChangeInCash } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-3xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cash Flow Statement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(data.period?.startDate).toLocaleDateString()} - {new Date(data.period?.endDate).toLocaleDateString()}
        </p>
      </div>

      <div className="p-6 space-y-6 font-mono text-sm">
        {/* =============================================
            OPERATING ACTIVITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Operating Activities</h4>
          
          {/* CASH IN */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Cash In</p>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 ml-4">From Customers</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(operatingActivities?.cashIn?.fromCustomers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 ml-4">From Debtors</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(operatingActivities?.cashIn?.fromDebtors)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 ml-4">From Other Income</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(operatingActivities?.cashIn?.fromOtherIncome)}</span>
              </div>
            </div>
          </div>

          {/* CASH OUT */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Cash Out</p>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 ml-4">To Suppliers</span>
                <span className="text-red-600 dark:text-red-400">({formatCurrency(operatingActivities?.cashOut?.toSuppliers)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 ml-4">To Creditors</span>
                <span className="text-red-600 dark:text-red-400">({formatCurrency(operatingActivities?.cashOut?.toCreditors)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 ml-4">Operating Expenses</span>
                <span className="text-red-600 dark:text-red-400">({formatCurrency(operatingActivities?.cashOut?.operatingExpenses)})</span>
              </div>
            </div>
          </div>

          {/* NET */}
          <div className="mt-3 pt-2 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-semibold">
            <span className="text-gray-900 dark:text-white">NET Operating Cash Flow</span>
            <span className={`${operatingActivities?.netOperatingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(operatingActivities?.netOperatingCash)}
            </span>
          </div>
        </div>

        {/* =============================================
            INVESTING ACTIVITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Investing Activities</h4>
          <div className="space-y-1 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 ml-4">Purchase of equipment</span>
              <span className="text-red-600 dark:text-red-400">({formatCurrency(investingActivities?.purchaseOfEquipment)})</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-semibold">
            <span className="text-gray-900 dark:text-white">Net Cash from Investing Activities</span>
            <span className={`${investingActivities?.netInvestingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(investingActivities?.netInvestingCash)}
            </span>
          </div>
        </div>

        {/* =============================================
            FINANCING ACTIVITIES
        ============================================= */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Financing Activities</h4>
          <div className="space-y-1 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 ml-4">Loans received</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(financingActivities?.loansReceived)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 ml-4">Owner contributions</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(financingActivities?.ownerContributions)}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-semibold">
            <span className="text-gray-900 dark:text-white">Net Cash from Financing Activities</span>
            <span className={`${financingActivities?.netFinancingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(financingActivities?.netFinancingCash)}
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
              {formatCurrency(netChangeInCash)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Opening Cash</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(openingCash)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span className="text-gray-900 dark:text-white">Closing Cash</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(closingCash)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowReport;