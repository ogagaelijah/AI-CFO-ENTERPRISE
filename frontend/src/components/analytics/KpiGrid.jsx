import KpiCard from './KpiCard';

export default function KpiGrid({ kpis = {} }) {
  const cards = [
    { key: 'revenue', title: 'Revenue', data: kpis.revenue },
    { key: 'grossProfit', title: 'Gross Profit', data: kpis.grossProfit },
    { key: 'grossMargin', title: 'Gross Margin', data: kpis.grossMargin, isPercent: true },
    { key: 'netProfit', title: 'Net Profit', data: kpis.netProfit },
    { key: 'netMargin', title: 'Net Margin', data: kpis.netMargin, isPercent: true },
    { key: 'totalExpenses', title: 'Total Expenses', data: kpis.totalExpenses },
    { key: 'netCashFlow', title: 'Net Cash Flow', data: kpis.netCashFlow },
    { key: 'inventoryValue', title: 'Inventory Value', data: kpis.inventoryValue },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Key Performance Indicators</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <KpiCard
            key={card.key}
            title={card.title}
            data={card.data}
            isPercent={card.isPercent}
          />
        ))}
      </div>
    </div>
  );
}