// frontend/src/services/exportService.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Format currency for export
 */
const formatCurrency = (amount) => {
  return `₦${Number(amount || 0).toLocaleString()}`;
};

/**
 * Check if data is executive summary
 */
const isExecutiveSummary = (data) => {
  return data && data.executiveSummary !== undefined;
};

/**
 * Export report data to PDF
 */
export const exportToPDF = (reportData, reportType) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(26, 54, 93);
    doc.text('AI CFO ENTERPRISE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(14);
    doc.text(`${reportType.toUpperCase()} REPORT`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Check if executive summary
    if (isExecutiveSummary(reportData)) {
      // =============================================
      // EXECUTIVE SUMMARY PDF
      // =============================================
      const data = reportData;
      const { metadata, executiveSummary, kpiDashboard, revenueSales, profitability, expenses, cashFlow, receivables, payables, inventory, financialRatios, trends, forecast, risks, aiInsights, recommendations, actionPlan } = data;

      // Period
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${metadata.period} — Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      const addTable = (title, headers, tableData) => {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setTextColor(26, 54, 93);
        doc.text(title, 14, yPos);
        yPos += 5;
        const body = tableData.map(row => headers.map(h => row[h.key] !== undefined ? row[h.key] : ''));
        autoTable(doc, {
          startY: yPos,
          head: [headers.map(h => h.label)],
          body: body,
          theme: 'striped',
          headStyles: { fillColor: [26, 54, 93], textColor: [255, 255, 255], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });
        yPos = doc.lastAutoTable.finalY + 8;
      };

      // 1. Executive Summary
      addTable('EXECUTIVE SUMMARY', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Business Health', value: executiveSummary.businessHealth },
        { label: 'Top Achievement', value: executiveSummary.topAchievement },
        { label: 'Top Risk', value: executiveSummary.topRisk },
      ]);

      // 2. KPI Dashboard
      addTable('KPI DASHBOARD', [
        { key: 'label', label: 'Metric' },
        { key: 'current', label: 'Current' },
        { key: 'change', label: 'Change (%)' },
      ], [
        { label: 'Revenue', current: formatCurrency(kpiDashboard.revenue.current), change: kpiDashboard.revenue.change.toFixed(1) },
        { label: 'Gross Profit', current: formatCurrency(kpiDashboard.grossProfit.current), change: kpiDashboard.grossProfit.change.toFixed(1) },
        { label: 'Net Profit', current: formatCurrency(kpiDashboard.netProfit.current), change: kpiDashboard.netProfit.change.toFixed(1) },
        { label: 'Gross Margin', current: `${kpiDashboard.grossMargin}%`, change: '-' },
      ]);

      // 3. Revenue & Sales
      addTable('REVENUE & SALES', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Total Revenue', value: formatCurrency(revenueSales.total) },
        { label: 'Sales', value: formatCurrency(revenueSales.sales) },
        { label: 'Other Income', value: formatCurrency(revenueSales.income) },
        { label: 'Growth', value: `${revenueSales.growth.toFixed(1)}%` },
      ]);

      // 4. Profitability
      addTable('PROFITABILITY', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Gross Profit', value: formatCurrency(profitability.grossProfit) },
        { label: 'Gross Margin', value: `${profitability.grossMargin}%` },
        { label: 'Operating Profit', value: formatCurrency(profitability.operatingProfit) },
        { label: 'Operating Margin', value: `${profitability.operatingMargin}%` },
        { label: 'Net Profit', value: formatCurrency(profitability.netProfit) },
        { label: 'Net Margin', value: `${profitability.netMargin}%` },
      ]);

      // 5. Expenses
      addTable('EXPENSES', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Total Expenses', value: formatCurrency(expenses.total) },
        { label: 'vs Previous', value: `${expenses.comparison.toFixed(1)}%` },
      ]);

      // 6. Cash Flow
      addTable('CASH FLOW', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Inflows', value: formatCurrency(cashFlow.inflows) },
        { label: 'Outflows', value: formatCurrency(cashFlow.outflows) },
        { label: 'Net', value: formatCurrency(cashFlow.net) },
      ]);

      // 7-8. Receivables & Payables
      addTable('RECEIVABLES & PAYABLES', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Total Debtors', value: formatCurrency(receivables.total) },
        { label: 'Active Debtors', value: receivables.count },
        { label: 'Overdue Debtors', value: formatCurrency(receivables.overdue) },
        { label: 'Total Creditors', value: formatCurrency(payables.total) },
        { label: 'Active Creditors', value: payables.count },
        { label: 'Overdue Creditors', value: formatCurrency(payables.overdue) },
      ]);

      // 9. Inventory
      addTable('INVENTORY', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Total Value', value: formatCurrency(inventory.totalValue) },
        { label: 'Total Items', value: inventory.totalItems },
        { label: 'Total Units', value: inventory.totalUnits },
        { label: 'Low Stock', value: inventory.lowStock },
        { label: 'Turnover', value: `${inventory.turnover.toFixed(2)}x` },
      ]);

      // 10. Financial Ratios
      addTable('FINANCIAL RATIOS', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Gross Margin', value: `${financialRatios.grossMargin}%` },
        { label: 'Net Margin', value: `${financialRatios.netMargin}%` },
        { label: 'Current Ratio', value: financialRatios.currentRatio },
        { label: 'Quick Ratio', value: financialRatios.quickRatio },
      ]);

      // 11. Forecast
      addTable('FORECAST', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Next Month Revenue', value: formatCurrency(forecast.nextMonthRevenue) },
        { label: 'Confidence', value: forecast.confidence },
      ]);

      // 14. AI Insights
      if (aiInsights && aiInsights.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setTextColor(128, 90, 213);
        doc.text('AI INSIGHTS', 14, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(80);
        aiInsights.forEach((insight, i) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          doc.text(`• ${insight}`, 16, yPos);
          yPos += 6;
        });
        yPos += 4;
      }

      // 15. Recommendations
      if (recommendations && recommendations.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setTextColor(26, 54, 93);
        doc.text('RECOMMENDATIONS', 14, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(80);
        recommendations.forEach((rec, i) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          doc.text(`• ${rec}`, 16, yPos);
          yPos += 6;
        });
        yPos += 4;
      }

      // 16. Action Plan
      if (actionPlan && actionPlan.length > 0) {
        addTable('ACTION PLAN', [
          { key: 'action', label: 'Action' },
          { key: 'priority', label: 'Priority' },
          { key: 'timeline', label: 'Timeline' },
          { key: 'owner', label: 'Owner' },
        ], actionPlan);
      }

    } else {
      // =============================================
      // REGULAR REPORT PDF (Daily/Weekly/Monthly/Yearly)
      // =============================================
      const { period, revenue, costs, profitability, transactions, topProducts, topCustomers, inventory, alerts } = reportData;

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${period.startDate} — ${period.endDate}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      const addTable = (title, headers, tableData) => {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setTextColor(26, 54, 93);
        doc.text(title, 14, yPos);
        yPos += 5;
        const body = tableData.map(row => headers.map(h => row[h.key] !== undefined ? row[h.key] : ''));
        autoTable(doc, {
          startY: yPos,
          head: [headers.map(h => h.label)],
          body: body,
          theme: 'striped',
          headStyles: { fillColor: [26, 54, 93], textColor: [255, 255, 255], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });
        yPos = doc.lastAutoTable.finalY + 8;
      };

      // Revenue
      addTable('REVENUE', [
        { key: 'label', label: 'Description' },
        { key: 'value', label: 'Amount (₦)' },
      ], [
        { label: 'Sales', value: formatCurrency(revenue.sales) },
        { label: 'Other Income', value: formatCurrency(revenue.income) },
        { label: 'Total Revenue', value: formatCurrency(revenue.total) },
      ]);

      // Costs
      addTable('COSTS', [
        { key: 'label', label: 'Description' },
        { key: 'value', label: 'Amount (₦)' },
      ], [
        { label: 'Purchases', value: formatCurrency(costs.purchases) },
        { label: 'Expenses', value: formatCurrency(costs.expenses) },
        { label: 'Total Costs', value: formatCurrency(costs.total) },
      ]);

      // Profitability
      addTable('PROFITABILITY', [
        { key: 'label', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ], [
        { label: 'Gross Profit', value: formatCurrency(profitability.grossProfit) },
        { label: 'Gross Margin', value: `${profitability.grossMargin}%` },
        { label: 'Operating Profit', value: formatCurrency(profitability.operatingProfit) },
        { label: 'Operating Margin', value: `${profitability.operatingMargin}%` },
        { label: 'Net Profit', value: formatCurrency(profitability.netProfit) },
        { label: 'Net Margin', value: `${profitability.netMargin}%` },
      ]);

      // Transactions
      addTable('TRANSACTIONS', [
        { key: 'label', label: 'Type' },
        { key: 'value', label: 'Count' },
      ], [
        { label: 'Sales', value: transactions.sales },
        { label: 'Incomes', value: transactions.incomes },
        { label: 'Expenses', value: transactions.expenses },
        { label: 'Purchases', value: transactions.purchases },
      ]);

      // Top Products
      if (topProducts && topProducts.length > 0) {
        addTable('TOP PRODUCTS', [
          { key: 'name', label: 'Product' },
          { key: 'revenue', label: 'Revenue (₦)' },
          { key: 'quantity', label: 'Units' },
        ], topProducts.map(p => ({
          name: p.name,
          revenue: formatCurrency(p.revenue),
          quantity: p.quantity,
        })));
      }

      // Top Customers
      if (topCustomers && topCustomers.length > 0) {
        addTable('TOP CUSTOMERS', [
          { key: 'name', label: 'Customer' },
          { key: 'total', label: 'Total (₦)' },
          { key: 'count', label: 'Purchases' },
        ], topCustomers.map(c => ({
          name: c.name,
          total: formatCurrency(c.total),
          count: c.count,
        })));
      }

      // Inventory
      if (inventory) {
        addTable('INVENTORY', [
          { key: 'label', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ], [
          { label: 'Total Items', value: inventory.totalItems },
          { label: 'Total Units', value: inventory.totalUnits },
          { label: 'Total Value', value: formatCurrency(inventory.totalValue) },
          { label: 'Potential Profit', value: formatCurrency(inventory.potentialProfit) },
          { label: 'Low Stock Items', value: inventory.lowStockCount },
        ]);
      }

      // Alerts
      if (alerts && alerts.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setTextColor(200, 150, 0);
        doc.text('ALERTS', 14, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(80);
        alerts.forEach((alert, i) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          doc.text(`• ${alert.message}`, 16, yPos);
          yPos += 6;
        });
      }
    }

    // Footer
    const date = new Date().toISOString().split('T')[0];
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated by AI CFO ENTERPRISE on ${date}`, pageWidth / 2, 285, { align: 'center' });
    doc.text(`© 2026 AI CFO ENTERPRISE. All rights reserved.`, pageWidth / 2, 290, { align: 'center' });

    doc.save(`report-${reportType}-${date}.pdf`);

  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

/**
 * Export report data to Excel
 */
export const exportToExcel = (reportData, reportType) => {
  try {
    const wb = XLSX.utils.book_new();

    // Check if executive summary
    if (isExecutiveSummary(reportData)) {
      const data = reportData;
      const { metadata, executiveSummary, kpiDashboard, revenueSales, profitability, expenses, cashFlow, receivables, payables, inventory, financialRatios, trends, forecast, risks, aiInsights, recommendations, actionPlan } = data;

      // Summary Sheet
      const summaryData = [
        ['AI CFO ENTERPRISE', `${reportType.toUpperCase()} REPORT`],
        ['Period', metadata.period],
        ['Generated', new Date(metadata.generatedAt).toLocaleDateString()],
        [''],
        ['EXECUTIVE SUMMARY'],
        ['Business Health', executiveSummary.businessHealth],
        ['Top Achievement', executiveSummary.topAchievement],
        ['Top Risk', executiveSummary.topRisk],
        [''],
        ['KPI DASHBOARD'],
        ['Revenue', kpiDashboard.revenue.current, `${kpiDashboard.revenue.change.toFixed(1)}%`],
        ['Gross Profit', kpiDashboard.grossProfit.current, `${kpiDashboard.grossProfit.change.toFixed(1)}%`],
        ['Net Profit', kpiDashboard.netProfit.current, `${kpiDashboard.netProfit.change.toFixed(1)}%`],
        ['Gross Margin', `${kpiDashboard.grossMargin}%`, ''],
        [''],
        ['REVENUE & SALES'],
        ['Total Revenue', revenueSales.total],
        ['Sales', revenueSales.sales],
        ['Other Income', revenueSales.income],
        ['Growth', `${revenueSales.growth.toFixed(1)}%`],
        [''],
        ['PROFITABILITY'],
        ['Gross Profit', profitability.grossProfit, `${profitability.grossMargin}%`],
        ['Operating Profit', profitability.operatingProfit, `${profitability.operatingMargin}%`],
        ['Net Profit', profitability.netProfit, `${profitability.netMargin}%`],
        [''],
        ['EXPENSES'],
        ['Total Expenses', expenses.total, `${expenses.comparison.toFixed(1)}%`],
        [''],
        ['CASH FLOW'],
        ['Inflows', cashFlow.inflows],
        ['Outflows', cashFlow.outflows],
        ['Net', cashFlow.net],
        [''],
        ['RECEIVABLES'],
        ['Total Debtors', receivables.total],
        ['Active Debtors', receivables.count],
        ['Overdue', receivables.overdue],
        [''],
        ['PAYABLES'],
        ['Total Creditors', payables.total],
        ['Active Creditors', payables.count],
        ['Overdue', payables.overdue],
        [''],
        ['INVENTORY'],
        ['Total Value', inventory.totalValue],
        ['Total Items', inventory.totalItems],
        ['Total Units', inventory.totalUnits],
        ['Low Stock', inventory.lowStock],
        ['Turnover', `${inventory.turnover.toFixed(2)}x`],
        [''],
        ['FINANCIAL RATIOS'],
        ['Gross Margin', `${financialRatios.grossMargin}%`],
        ['Net Margin', `${financialRatios.netMargin}%`],
        ['Current Ratio', financialRatios.currentRatio],
        ['Quick Ratio', financialRatios.quickRatio],
        [''],
        ['FORECAST'],
        ['Next Month Revenue', forecast.nextMonthRevenue],
        ['Confidence', forecast.confidence],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Executive Summary');

      // Products Sheet
      if (revenueSales.topProducts && revenueSales.topProducts.length > 0) {
        const productsData = [
          ['Product', 'Revenue (₦)', 'Units Sold'],
          ...revenueSales.topProducts.map(p => [p.name, p.revenue, p.quantity]),
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Top Products');
      }

      // Recommendations Sheet
      if (recommendations && recommendations.length > 0) {
        const recData = [
          ['Recommendation'],
          ...recommendations.map(r => [r]),
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(recData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Recommendations');
      }

      // Action Plan Sheet
      if (actionPlan && actionPlan.length > 0) {
        const actionData = [
          ['Action', 'Priority', 'Timeline', 'Owner'],
          ...actionPlan.map(a => [a.action, a.priority, a.timeline, a.owner]),
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(actionData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Action Plan');
      }

    } else {
      // =============================================
      // REGULAR REPORT EXCEL
      // =============================================
      const { period, revenue, costs, profitability, transactions, topProducts, topCustomers, inventory, alerts } = reportData;

      // Summary Sheet
      const summaryData = [
        ['AI CFO ENTERPRISE', `${reportType.toUpperCase()} REPORT`],
        ['Period', `${period.startDate} — ${period.endDate}`],
        [''],
        ['REVENUE'],
        ['Sales', revenue.sales],
        ['Other Income', revenue.income],
        ['Total Revenue', revenue.total],
        [''],
        ['COSTS'],
        ['Purchases', costs.purchases],
        ['Expenses', costs.expenses],
        ['Total Costs', costs.total],
        [''],
        ['PROFITABILITY'],
        ['Gross Profit', profitability.grossProfit],
        ['Gross Margin (%)', profitability.grossMargin],
        ['Operating Profit', profitability.operatingProfit],
        ['Operating Margin (%)', profitability.operatingMargin],
        ['Net Profit', profitability.netProfit],
        ['Net Margin (%)', profitability.netMargin],
        [''],
        ['TRANSACTIONS'],
        ['Sales', transactions.sales],
        ['Incomes', transactions.incomes],
        ['Expenses', transactions.expenses],
        ['Purchases', transactions.purchases],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Products Sheet
      if (topProducts && topProducts.length > 0) {
        const productsData = [
          ['Product', 'Revenue (₦)', 'Units Sold'],
          ...topProducts.map(p => [p.name, p.revenue, p.quantity]),
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Top Products');
      }

      // Customers Sheet
      if (topCustomers && topCustomers.length > 0) {
        const customersData = [
          ['Customer', 'Total Spend (₦)', 'Purchases'],
          ...topCustomers.map(c => [c.name, c.total, c.count]),
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(customersData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Top Customers');
      }

      // Inventory Sheet
      if (inventory) {
        const inventoryData = [
          ['Metric', 'Value'],
          ['Total Items', inventory.totalItems],
          ['Total Units', inventory.totalUnits],
          ['Total Value (₦)', inventory.totalValue],
          ['Potential Profit (₦)', inventory.potentialProfit],
          ['Low Stock Items', inventory.lowStockCount],
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(inventoryData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Inventory');
      }

      // Alerts Sheet
      if (alerts && alerts.length > 0) {
        const alertsData = [
          ['Alert Type', 'Message'],
          ...alerts.map(a => [a.type || 'General', a.message]),
        ];
        const ws5 = XLSX.utils.aoa_to_sheet(alertsData);
        XLSX.utils.book_append_sheet(wb, ws5, 'Alerts');
      }
    }

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `report-${reportType}-${date}.xlsx`);

  } catch (error) {
    console.error('Excel Export Error:', error);
    alert('Failed to generate Excel file. Please try again.');
  }
};