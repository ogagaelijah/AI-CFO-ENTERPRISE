// frontend/src/services/exportService.js
// v3.1.0-prod — Complete rewrite against the actual backend shapes.
//               Handles all 8 reports: executive, pl, cashflow,
//               balance-sheet, daily, weekly, monthly, yearly.
//               PDF uses NGN prefix (jsPDF Helvetica lacks ₦).
//               Watermark on every PDF page.
//               v3.0.1: Control Check label uses ASCII hyphen (jsPDF's
//                       Helvetica renders the Unicode minus as '"').
//               v3.1.0: Balance sheet PDF/Excel now render every section
//                       the UI shows (non-current assets/liabilities,
//                       other current assets/liabilities, short/long-term
//                       debt, other equity, drawings, TOTAL LIABILITIES +
//                       EQUITY).

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Constants ──────────────────────────────────────────────────────
const BRAND = {
  name: 'AI CFO ENTERPRISE',
  url: 'aicfotechnologies.com',
};
const BRAND_COLOR = [26, 54, 93];

// ── Formatting helpers ─────────────────────────────────────────────
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// PDF currency: use NGN prefix, no ₦ glyph issues.
const pdfMoney = (v) => `NGN ${Math.round(toNumber(v)).toLocaleString()}`;
// Excel currency: ₦ works fine in XLSX.
const xlsMoney = (v) => `₦${Math.round(toNumber(v)).toLocaleString()}`;

const pct = (v) => `${toNumber(v).toFixed(1)}%`;
const num = (v) => toNumber(v).toLocaleString();

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── PDF scaffolding ────────────────────────────────────────────────
function createPdf(reportType, subtitle = '') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(BRAND.name, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(`${reportType.toUpperCase()} REPORT`, pageWidth / 2, 28, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, pageWidth / 2, 34, { align: 'center' });
  }

  return doc;
}

function addFooterAndWatermark(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();
  const generatedOn = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.saveGraphicsState();
    try {
      // eslint-disable-next-line new-cap
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      doc.setTextColor(0);
    } catch {
      doc.setTextColor(230, 230, 230);
    }
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text(BRAND.name, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 30,
    });
    doc.restoreGraphicsState?.();
    doc.setTextColor(0);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140);
    doc.text(`POWERED BY ${BRAND.name}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.setTextColor(160);
    doc.text(BRAND.url, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.setTextColor(120);
    doc.text(`Generated ${generatedOn}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    doc.setTextColor(160);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, 10, { align: 'right' });
  }

  doc.setPage(1);
}

function addTable(doc, title, head, body, startY) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLOR);
  doc.text(title, 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY + 8;
}

function addKvBlock(doc, title, rows, startY) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (startY > pageHeight - 40) {
    doc.addPage();
    startY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLOR);
  doc.text(title, 14, startY);
  startY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  rows.forEach(([label, value]) => {
    if (startY > pageHeight - 20) {
      doc.addPage();
      startY = 20;
    }
    doc.text(String(label), 16, startY);
    doc.text(String(value), 90, startY);
    startY += 5;
  });

  return startY + 4;
}

function ensureRoom(doc, yPos, needed = 30) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - needed) {
    doc.addPage();
    return 20;
  }
  return yPos;
}

// ═══════════════════════════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════════════════════════
export const exportToPDF = (reportData, reportType) => {
  if (!reportData) {
    console.error('exportToPDF: no report data');
    return;
  }

  try {
    switch (reportType) {
      case 'daily':         return exportDailyPdf(reportData);
      case 'weekly':        return exportWeeklyPdf(reportData);
      case 'monthly':       return exportMonthlyPdf(reportData);
      case 'yearly':        return exportYearlyPdf(reportData);
      case 'pl':            return exportProfitLossPdf(reportData);
      case 'cashflow':      return exportCashFlowPdf(reportData);
      case 'balance-sheet': return exportBalanceSheetPdf(reportData);
      case 'executive':     return exportExecutivePdf(reportData);
      default:
        return exportGenericPdf(reportData, reportType);
    }
  } catch (err) {
    console.error('PDF Export Error:', err);
    alert('Failed to generate PDF. Please try again.');
  }
};

// ── Daily ──────────────────────────────────────────────────────────
function exportDailyPdf(d) {
  const doc = createPdf('daily', `For ${fmtDate(d.date)}`);
  let y = 46;

  const t = d.today || {};
  y = addKvBlock(doc, 'REVENUE', [
    ['Revenue',              pdfMoney(t.revenue)],
    ['Sales Count',          num(t.salesCount)],
    ['Cost of Goods Sold',   pdfMoney(t.cogs)],
    ['Gross Profit',         pdfMoney(t.grossProfit)],
    ['Gross Margin',         pct(t.grossMargin)],
    ['Other Income',         pdfMoney(t.income)],
  ], y);

  y = addKvBlock(doc, 'EXPENSES & PROFIT', [
    ['Expenses',             pdfMoney(t.expenses)],
    ['Net Profit',           pdfMoney(t.netProfit)],
    ['Net Margin',           pct(t.netMargin)],
    ['Purchases',            pdfMoney(t.purchases)],
  ], y);

  y = addKvBlock(doc, 'CASH FLOW', [
    ['Cash Received Today',  pdfMoney(t.cashReceivedToday)],
    ['Cash Paid Today',      pdfMoney(t.cashPaidToday)],
    ['Opening Cash',         pdfMoney(t.cash?.opening)],
    ['Closing Cash',         pdfMoney(t.cash?.closing)],
  ], y);

  y = addKvBlock(doc, 'RECEIVABLES & PAYABLES', [
    ['Debtors Outstanding',  pdfMoney(t.receivables?.outstanding)],
    ['Debtors Overdue',      pdfMoney(t.receivables?.overdue)],
    ['Creditors Outstanding',pdfMoney(t.payables?.outstanding)],
    ['Creditors Overdue',    pdfMoney(t.payables?.overdue)],
  ], y);

  y = addKvBlock(doc, 'INVENTORY', [
    ['Total Items',          num(t.inventory?.totalItems)],
    ['Total Value',          pdfMoney(t.inventory?.totalValue)],
    ['Low Stock Count',      num(t.inventory?.lowStockCount)],
  ], y);

  const prev = d.comparison?.previousDay;
  if (prev) {
    y = ensureRoom(doc, y, 40);
    y = addKvBlock(doc, 'COMPARISON VS PREVIOUS DAY', [
      ['Prev Day Revenue',     pdfMoney(prev.revenue)],
      ['Prev Day Gross Profit',pdfMoney(prev.grossProfit)],
      ['Prev Day Net Profit',  pdfMoney(prev.netProfit)],
      ['Prev Day Expenses',    pdfMoney(prev.expenses)],
    ], y);
  }

  if (Array.isArray(d.debtors?.top3) && d.debtors.top3.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP DEBTORS',
      ['Customer', 'Amount Owed'],
      d.debtors.top3.map((x) => [x.name || '—', pdfMoney(x.amount)]),
      y,
    );
  }

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP PRODUCTS',
      ['Product', 'Revenue', 'Units'],
      d.topProducts.map((p) => [p.name || '—', pdfMoney(p.revenue), num(p.quantity)]),
      y,
    );
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP CUSTOMERS',
      ['Customer', 'Total', 'Purchases'],
      d.topCustomers.map((c) => [c.name || '—', pdfMoney(c.total), num(c.count)]),
      y,
    );
  }

  addFooterAndWatermark(doc);
  savePdf(doc, 'daily');
}

// ── Weekly ─────────────────────────────────────────────────────────
function exportWeeklyPdf(d) {
  const range = d.period ? `${fmtDate(d.period.start)} — ${fmtDate(d.period.end)}` : '';
  const doc = createPdf('weekly', range);
  let y = 46;

  y = addKvBlock(doc, 'SUMMARY', [
    ['Revenue',           pdfMoney(d.revenue)],
    ['Other Revenue',     pdfMoney(d.otherRevenue)],
    ['COGS',              pdfMoney(d.cogs)],
    ['Gross Profit',      pdfMoney(d.grossProfit)],
    ['Gross Margin',      pct(d.grossMargin)],
    ['Expenses',          pdfMoney(d.expenses)],
    ['Net Profit',        pdfMoney(d.netProfit)],
    ['Net Margin',        pct(d.netMargin)],
  ], y);

  const prev = d.weekOverWeek?.previousWeek;
  if (prev) {
    y = addKvBlock(doc, 'COMPARISON VS PREVIOUS WEEK', [
      ['Prev Revenue',      pdfMoney(prev.revenue)],
      ['Prev Gross Profit', pdfMoney(prev.grossProfit)],
      ['Prev Net Profit',   pdfMoney(prev.netProfit)],
      ['Revenue Change',    pct(d.weekOverWeek?.revenueChange)],
      ['Profit Change',     pct(d.weekOverWeek?.profitChange)],
    ], y);
  }

  y = addKvBlock(doc, 'INVENTORY', [
    ['Total Items',       num(d.inventory?.totalItems)],
    ['Total Value',       pdfMoney(d.inventory?.totalValue)],
    ['Low Stock Count',   num(d.inventory?.lowStockCount)],
  ], y);

  if (Array.isArray(d.keyRisks) && d.keyRisks.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text('KEY RISKS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.keyRisks.forEach((r) => {
      y = ensureRoom(doc, y, 20);
      doc.text(`• ${r}`, 16, y);
      y += 5;
    });
    y += 4;
  }

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP PRODUCTS',
      ['Product', 'Revenue', 'Units'],
      d.topProducts.map((p) => [p.name || '—', pdfMoney(p.revenue), num(p.quantity)]),
      y,
    );
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP CUSTOMERS',
      ['Customer', 'Total', 'Purchases'],
      d.topCustomers.map((c) => [c.name || '—', pdfMoney(c.total), num(c.count)]),
      y,
    );
  }

  addFooterAndWatermark(doc);
  savePdf(doc, 'weekly');
}

// ── Monthly ────────────────────────────────────────────────────────
function exportMonthlyPdf(d) {
  const range = d.period ? `${fmtDate(d.period.start)} — ${fmtDate(d.period.end)}` : '';
  const subtitle = d.month ? `${d.month} ${d.year || ''} · ${range}` : range;
  const doc = createPdf('monthly', subtitle);
  let y = 46;

  y = addKvBlock(doc, 'PERFORMANCE SUMMARY', [
    ['Revenue',           pdfMoney(d.revenue)],
    ['Gross Profit',      pdfMoney(d.grossProfit)],
    ['Gross Margin',      pct(d.grossMargin)],
    ['Expenses',          pdfMoney(d.expenses)],
    ['Net Profit',        pdfMoney(d.netProfit)],
    ['Net Margin',        pct(d.netMargin)],
  ], y);

  const k = d.kpiDashboard || {};
  y = addKvBlock(doc, 'KPI DASHBOARD', [
    ['COGS',                pdfMoney(k.cogs)],
    ['YTD Revenue',         pdfMoney(k.ytdRevenue)],
    ['YTD Net Profit',      pdfMoney(k.ytdNetProfit)],
    ['Total Sales',         num(k.totalSales)],
    ['Unique Customers',    num(k.uniqueCustomers)],
  ], y);

  const mom = d.monthOverMonth;
  if (mom) {
    y = addKvBlock(doc, 'MONTH-OVER-MONTH', [
      ['Revenue Change',    mom.revenueChange == null ? '—' : pct(mom.revenueChange)],
      ['Profit Change',     mom.profitChange == null ? '—' : pct(mom.profitChange)],
      ['Prev Revenue',      pdfMoney(mom.previousMonth?.revenue)],
      ['Prev Gross Profit', pdfMoney(mom.previousMonth?.grossProfit)],
      ['Prev Net Profit',   pdfMoney(mom.previousMonth?.netProfit)],
    ], y);
  }

  if (d.yearToDate) {
    y = addKvBlock(doc, 'YEAR TO DATE', [
      ['Revenue',           pdfMoney(d.yearToDate.revenue)],
      ['Net Profit',        pdfMoney(d.yearToDate.netProfit)],
    ], y);
  }

  y = addKvBlock(doc, 'INVENTORY', [
    ['Total Items',       num(d.inventory?.totalItems)],
    ['Total Value',       pdfMoney(d.inventory?.totalValue)],
    ['Low Stock Count',   num(d.inventory?.lowStockCount)],
  ], y);

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP PRODUCTS',
      ['Product', 'Revenue', 'Units'],
      d.topProducts.map((p) => [p.name || '—', pdfMoney(p.revenue), num(p.quantity)]),
      y,
    );
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP CUSTOMERS',
      ['Customer', 'Total', 'Purchases'],
      d.topCustomers.map((c) => [c.name || '—', pdfMoney(c.total), num(c.count)]),
      y,
    );
  }

  if (Array.isArray(d.topExpenses) && d.topExpenses.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP EXPENSES',
      ['Category', 'Amount'],
      d.topExpenses.map((e) => [e.name || e.category || '—', pdfMoney(e.amount || e.total)]),
      y,
    );
  }

  if (Array.isArray(d.aiInsights) && d.aiInsights.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128, 90, 213);
    doc.text('AI INSIGHTS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.aiInsights.forEach((insight) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${insight}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text('RECOMMENDATIONS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.recommendations.forEach((r) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${r}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  addFooterAndWatermark(doc);
  savePdf(doc, 'monthly');
}

// ── Yearly ─────────────────────────────────────────────────────────
function exportYearlyPdf(d) {
  const range = d.period ? `${fmtDate(d.period.start)} — ${fmtDate(d.period.end)}` : '';
  const doc = createPdf('yearly', d.year ? `${d.year} · ${range}` : range);
  let y = 46;

  y = addKvBlock(doc, 'ANNUAL PERFORMANCE', [
    ['Revenue',           pdfMoney(d.revenue)],
    ['Gross Profit',      pdfMoney(d.grossProfit)],
    ['Gross Margin',      pct(d.grossMargin)],
    ['Expenses',          pdfMoney(d.expenses)],
    ['Net Profit',        pdfMoney(d.netProfit)],
    ['Net Margin',        pct(d.netMargin)],
  ], y);

  const k = d.annualKpiDashboard || {};
  y = addKvBlock(doc, 'ANNUAL KPIs', [
    ['COGS',              pdfMoney(k.cogs)],
    ['Gross Profit',      pdfMoney(k.grossProfit)],
    ['Gross Margin',      pct(k.grossMargin)],
    ['Net Margin',        pct(k.netMargin)],
    ['Expenses',          pdfMoney(k.expenses)],
  ], y);

  const yoy = d.yearOverYear;
  if (yoy) {
    y = addKvBlock(doc, 'YEAR-OVER-YEAR', [
      ['Revenue Change',    pct(yoy.revenueChange)],
      ['Profit Change',     pct(yoy.profitChange)],
      ['Prev Revenue',      pdfMoney(yoy.previousYear?.revenue)],
      ['Prev Net Profit',   pdfMoney(yoy.previousYear?.netProfit)],
      ['Has Prior Year',    yoy.hasPriorYearData ? 'Yes' : 'No'],
    ], y);
  }

  y = addKvBlock(doc, 'INVENTORY', [
    ['Total Items',       num(d.inventory?.totalItems)],
    ['Total Value',       pdfMoney(d.inventory?.totalValue)],
    ['Low Stock Count',   num(d.inventory?.lowStockCount)],
  ], y);

  if (Array.isArray(d.majorRisks) && d.majorRisks.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 100, 0);
    doc.text('MAJOR RISKS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.majorRisks.forEach((r) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${r}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  if (Array.isArray(d.majorOpportunities) && d.majorOpportunities.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 128, 0);
    doc.text('MAJOR OPPORTUNITIES', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.majorOpportunities.forEach((o) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${o}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  if (Array.isArray(d.strategicInsights) && d.strategicInsights.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128, 90, 213);
    doc.text('STRATEGIC INSIGHTS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.strategicInsights.forEach((s) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${s}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  addFooterAndWatermark(doc);
  savePdf(doc, 'yearly');
}

// ── Profit & Loss ──────────────────────────────────────────────────
function exportProfitLossPdf(d) {
  const range = `${fmtDate(d.startDate)} — ${fmtDate(d.endDate)}`;
  const doc = createPdf('profit & loss', `${d.period || ''} · ${range}`.trim());
  let y = 46;

  const rev = d.revenue || {};
  y = addTable(doc, 'REVENUE',
    ['Line', 'Amount'],
    [
      ['Product Sales',   pdfMoney(rev.productSales)],
      ['Other Revenue',   pdfMoney(rev.otherRevenue)],
      ['TOTAL REVENUE',   pdfMoney(rev.totalRevenue)],
    ],
    y,
  );

  y = addTable(doc, 'COST OF GOODS SOLD',
    ['Line', 'Amount'],
    [
      ['Cost of Goods Sold', pdfMoney(d.cogs?.total)],
    ],
    y,
  );

  y = addTable(doc, 'GROSS PROFIT',
    ['Line', 'Amount'],
    [
      ['Gross Profit', pdfMoney(d.grossProfit?.amount)],
      ['Gross Margin', pct(d.grossProfit?.margin)],
    ],
    y,
  );

  const oe = d.operatingExpenses || {};
  y = addTable(doc, 'OPERATING EXPENSES',
    ['Category', 'Amount'],
    [
      ['Salaries',       pdfMoney(oe.salaries)],
      ['Rent',           pdfMoney(oe.rent)],
      ['Advertising',    pdfMoney(oe.advertising)],
      ['Transportation', pdfMoney(oe.transportation)],
      ['Utilities',      pdfMoney(oe.utilities)],
      ['Other',          pdfMoney(oe.other)],
      ['TOTAL OPERATING EXPENSES', pdfMoney(oe.total)],
    ],
    y,
  );

  y = addTable(doc, 'OPERATING PROFIT',
    ['Line', 'Amount'],
    [
      ['Operating Profit', pdfMoney(d.operatingProfit?.amount)],
      ['Operating Margin', pct(d.operatingProfit?.margin)],
    ],
    y,
  );

  y = addTable(doc, 'OTHER ITEMS',
    ['Line', 'Amount'],
    [
      ['Other Income',    pdfMoney(d.otherIncome)],
      ['Other Expenses',  pdfMoney(d.otherExpenses)],
    ],
    y,
  );

  y = addTable(doc, 'NET PROFIT',
    ['Line', 'Amount'],
    [
      ['Net Profit',   pdfMoney(d.netProfit?.amount)],
      ['Net Margin',   pct(d.netProfit?.margin)],
    ],
    y,
  );

  const c = d.comparison;
  if (c) {
    y = ensureRoom(doc, y, 60);
    y = addTable(doc, 'COMPARISON VS PREVIOUS PERIOD',
      ['Metric', 'Value'],
      [
        ['Revenue Change',      c.revenueChange == null ? '—' : pct(c.revenueChange)],
        ['Profit Change',       c.profitChange == null ? '—' : pct(c.profitChange)],
        ['Margin Change',       c.marginChange == null ? '—' : pct(c.marginChange)],
        ['Prev Period Revenue', pdfMoney(c.previousPeriod?.revenue)],
        ['Prev Period Gross',   pdfMoney(c.previousPeriod?.grossProfit)],
        ['Prev Period Net',     pdfMoney(c.previousPeriod?.netProfit)],
      ],
      y,
    );
  }

  addFooterAndWatermark(doc);
  savePdf(doc, 'pl');
}

// ── Cash Flow ──────────────────────────────────────────────────────
function exportCashFlowPdf(d) {
  const range = `${fmtDate(d.period?.startDate)} — ${fmtDate(d.period?.endDate)}`;
  const doc = createPdf('cash flow', range);
  let y = 46;

  const oa = d.operatingActivities || {};
  y = addTable(doc, 'OPERATING ACTIVITIES - CASH IN',
    ['Source', 'Amount'],
    [
      ['From Customers',   pdfMoney(oa.cashIn?.fromCustomers)],
      ['From Debtors',     pdfMoney(oa.cashIn?.fromDebtors)],
      ['Other Income',     pdfMoney(oa.cashIn?.fromOtherIncome)],
      ['TOTAL CASH IN',    pdfMoney(oa.cashIn?.total)],
    ],
    y,
  );

  y = addTable(doc, 'OPERATING ACTIVITIES - CASH OUT',
    ['Source', 'Amount'],
    [
      ['To Suppliers',       pdfMoney(oa.cashOut?.toSuppliers)],
      ['To Creditors',       pdfMoney(oa.cashOut?.toCreditors)],
      ['Operating Expenses', pdfMoney(oa.cashOut?.operatingExpenses)],
      ['TOTAL CASH OUT',     pdfMoney(oa.cashOut?.total)],
    ],
    y,
  );

  y = addKvBlock(doc, 'NET OPERATING CASH FLOW', [
    ['Net Operating Cash', pdfMoney(oa.netOperatingCash)],
  ], y);

  const inv = d.investingActivities || {};
  y = addTable(doc, 'INVESTING ACTIVITIES',
    ['Line', 'Amount'],
    [
      ['Purchase of Equipment',       pdfMoney(inv.purchaseOfEquipment)],
      ['Purchase of Long-term Assets',pdfMoney(inv.purchaseOfLongTermAssets)],
      ['Proceeds from Asset Sales',   pdfMoney(inv.proceedsFromAssetSales)],
      ['Net Investing Cash Flow',     pdfMoney(inv.netInvestingCash)],
    ],
    y,
  );

  const fin = d.financingActivities || {};
  y = addTable(doc, 'FINANCING ACTIVITIES',
    ['Line', 'Amount'],
    [
      ['Loans Received',      pdfMoney(fin.loansReceived)],
      ['Loan Repayments',     pdfMoney(fin.loanRepayments)],
      ['Owner Contributions', pdfMoney(fin.ownerContributions)],
      ['Owner Withdrawals',   pdfMoney(fin.ownerWithdrawals)],
      ['Net Financing Cash Flow', pdfMoney(fin.netFinancingCash)],
    ],
    y,
  );

  y = addKvBlock(doc, 'CASH SUMMARY', [
    ['Opening Cash',      pdfMoney(d.openingCash ?? d.summary?.openingCash)],
    ['Net Change in Cash',pdfMoney(d.netChangeInCash ?? d.summary?.netChange)],
    ['Closing Cash',      pdfMoney(d.closingCash ?? d.summary?.closingCash)],
  ], y);

  addFooterAndWatermark(doc);
  savePdf(doc, 'cashflow');
}

// ── Balance Sheet ──────────────────────────────────────────────────
function exportBalanceSheetPdf(d) {
  const doc = createPdf('balance sheet', `As at ${fmtDate(d.asAtDate)}`);
  let y = 46;

  const ca = d.assets?.currentAssets || {};
  const nca = d.assets?.nonCurrentAssets || {};
  const cl = d.liabilities?.currentLiabilities || {};
  const ncl = d.liabilities?.nonCurrentLiabilities || {};
  const eq = d.equity || {};

  // ── ASSETS ──
  y = addTable(doc, 'ASSETS — CURRENT',
    ['Line', 'Amount'],
    [
      ['Cash & Cash Equivalents', pdfMoney(ca.cash)],
      ['Accounts Receivable',     pdfMoney(ca.accountsReceivable)],
      ['Inventory',               pdfMoney(ca.inventory)],
      ['Other Current Assets',    pdfMoney(ca.otherCurrentAssets)],
      ['TOTAL CURRENT ASSETS',    pdfMoney(ca.total)],
    ],
    y,
  );

  y = ensureRoom(doc, y, 60);
  y = addTable(doc, 'ASSETS — NON-CURRENT',
    ['Line', 'Amount'],
    [
      ['Property & Equipment',        pdfMoney(nca.propertyAndEquipment)],
      ['Other Non-Current Assets',    pdfMoney(nca.otherNonCurrentAssets)],
      ['TOTAL NON-CURRENT ASSETS',    pdfMoney(nca.total)],
    ],
    y,
  );

  y = addKvBlock(doc, 'TOTAL ASSETS', [
    ['Total Assets', pdfMoney(d.assets?.totalAssets)],
  ], y);

  // ── LIABILITIES ──
  y = ensureRoom(doc, y, 60);
  y = addTable(doc, 'LIABILITIES — CURRENT',
    ['Line', 'Amount'],
    [
      ['Accounts Payable',           pdfMoney(cl.accountsPayable)],
      ['Short-Term Debt',            pdfMoney(cl.shortTermDebt)],
      ['Other Current Liabilities',  pdfMoney(cl.otherCurrentLiabilities)],
      ['TOTAL CURRENT LIABILITIES',  pdfMoney(cl.total)],
    ],
    y,
  );

  y = ensureRoom(doc, y, 60);
  y = addTable(doc, 'LIABILITIES — NON-CURRENT',
    ['Line', 'Amount'],
    [
      ['Long-Term Debt',                 pdfMoney(ncl.longTermDebt)],
      ['Other Non-Current Liabilities',  pdfMoney(ncl.otherNonCurrentLiabilities)],
      ['TOTAL NON-CURRENT LIABILITIES',  pdfMoney(ncl.total)],
    ],
    y,
  );

  y = addKvBlock(doc, 'TOTAL LIABILITIES', [
    ['Total Liabilities', pdfMoney(d.liabilities?.totalLiabilities)],
  ], y);

  // ── EQUITY ──
  y = ensureRoom(doc, y, 60);
  y = addTable(doc, 'EQUITY',
    ['Line', 'Amount'],
    [
      ["Owner's Capital",   pdfMoney(eq.ownersCapital)],
      ['Retained Earnings', pdfMoney(eq.retainedEarnings)],
      ['Other Equity',      pdfMoney(eq.otherEquity)],
      ['Less: Drawings',    `(${pdfMoney(eq.lessDrawings)})`],
      ['TOTAL EQUITY',      pdfMoney(eq.totalEquity)],
    ],
    y,
  );

  // ── TOTAL LIABILITIES + EQUITY ──
  const liabPlusEquity = toNumber(d.liabilities?.totalLiabilities) + toNumber(eq.totalEquity);
  y = addKvBlock(doc, 'TOTAL LIABILITIES + EQUITY', [
    ['Liabilities + Equity', pdfMoney(liabPlusEquity)],
  ], y);

  // ── BALANCE CHECK ──
  const diff = toNumber(d.control?.difference);
  const isBalanced = d.control?.isBalanced === true || Math.abs(diff) < 0.01;

  y = addKvBlock(doc, 'BALANCE CHECK', [
    ['Total Assets',        pdfMoney(d.assets?.totalAssets)],
    ['Liabilities + Equity',pdfMoney(liabPlusEquity)],
    ['Difference',          pdfMoney(diff)],
    ['Status',              isBalanced ? 'BALANCED' : 'OUT OF BALANCE'],
  ], y);

  addFooterAndWatermark(doc);
  savePdf(doc, 'balance-sheet');
}

// ── Executive ──────────────────────────────────────────────────────
function exportExecutivePdf(d) {
  const range = d.period ? `${fmtDate(d.period.start)} — ${fmtDate(d.period.end)}` : '';
  const doc = createPdf('executive', range);
  let y = 46;

  const bo = d.businessOverview || {};
  y = addKvBlock(doc, 'BUSINESS OVERVIEW', [
    ['Revenue',         pdfMoney(bo.revenue)],
    ['Net Profit',      pdfMoney(bo.netProfit)],
    ['Business Health', bo.businessHealth || '—'],
    ['Business Score',  bo.businessScore != null ? `${bo.businessScore}/100` : '—'],
  ], y);

  const es = d.executiveSummary || {};
  y = addKvBlock(doc, 'EXECUTIVE SUMMARY', [
    ['Revenue',           pdfMoney(es.revenue)],
    ['Gross Profit',      pdfMoney(es.grossProfit)],
    ['Gross Margin',      pct(es.grossMargin)],
    ['Net Profit',        pdfMoney(es.netProfit)],
    ['Net Margin',        pct(es.netMargin)],
    ['Expenses',          pdfMoney(es.expenses)],
    ['Cash',              pdfMoney(es.cash)],
    ['Receivables',       pdfMoney(es.receivables)],
    ['Payables',          pdfMoney(es.payables)],
    ['Inventory Value',   pdfMoney(es.inventory)],
  ], y);

  const k = d.kpiDashboard || {};
  y = addKvBlock(doc, 'KPI DASHBOARD', [
    ['Revenue',           pdfMoney(k.revenue)],
    ['Gross Profit',      pdfMoney(k.grossProfit)],
    ['Net Profit',        pdfMoney(k.netProfit)],
    ['Total Sales',       num(k.totalSales)],
    ['Unique Customers',  num(k.uniqueCustomers)],
  ], y);

  y = addKvBlock(doc, 'BUSINESS TRENDS', [
    ['Today',       pdfMoney(d.businessTrends?.today)],
    ['This Week',   pdfMoney(d.businessTrends?.thisWeek)],
    ['This Month',  pdfMoney(d.businessTrends?.thisMonth)],
  ], y);

  const f = d.forecast || {};
  y = addKvBlock(doc, 'FORECAST', [
    ['Next 7 Days',   pdfMoney(f.next7Days)],
    ['Next 30 Days',  pdfMoney(f.next30Days)],
    ['Next 60 Days',  pdfMoney(f.next60Days)],
    ['Confidence',    pct(f.confidence)],
  ], y);

  const fr = d.financialRatios || {};
  y = addKvBlock(doc, 'FINANCIAL RATIOS', [
    ['Gross Margin',  pct(fr.grossMargin)],
    ['Net Margin',    pct(fr.netMargin)],
    ['Expense Ratio', pct(fr.expenseRatio)],
  ], y);

  const cf = d.cashFlow || {};
  y = addKvBlock(doc, 'CASH FLOW', [
    ['Opening',  pdfMoney(cf.opening)],
    ['Closing',  pdfMoney(cf.closing)],
  ], y);

  y = addKvBlock(doc, 'RECEIVABLES & PAYABLES', [
    ['Receivables Outstanding', pdfMoney(d.receivables?.totalOutstanding)],
    ['Payables Outstanding',    pdfMoney(d.payables?.totalOutstanding)],
  ], y);

  y = addKvBlock(doc, 'INVENTORY', [
    ['Total Items',  num(d.inventory?.totalItems)],
    ['Total Value',  pdfMoney(d.inventory?.totalValue)],
  ], y);

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP PRODUCTS',
      ['Product', 'Revenue', 'Units'],
      d.topProducts.map((p) => [p.name || '—', pdfMoney(p.revenue), num(p.quantity)]),
      y,
    );
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    y = ensureRoom(doc, y, 50);
    y = addTable(doc, 'TOP CUSTOMERS',
      ['Customer', 'Total', 'Purchases'],
      d.topCustomers.map((c) => [c.name || '—', pdfMoney(c.total), num(c.count)]),
      y,
    );
  }

  if (Array.isArray(d.insights) && d.insights.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128, 90, 213);
    doc.text('INSIGHTS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.insights.forEach((ins) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${ins}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    y = ensureRoom(doc, y, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text('RECOMMENDATIONS', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    d.recommendations.forEach((r) => {
      y = ensureRoom(doc, y, 20);
      const lines = doc.splitTextToSize(`• ${r}`, 180);
      doc.text(lines, 16, y);
      y += 5 * (Array.isArray(lines) ? lines.length : 1);
    });
    y += 4;
  }

  if (Array.isArray(d.managementActionPlan) && d.managementActionPlan.length > 0) {
    y = ensureRoom(doc, y, 60);
    y = addTable(doc, 'MANAGEMENT ACTION PLAN',
      ['Action', 'Priority', 'Timeline', 'Owner'],
      d.managementActionPlan.map((a) => [
        a.action || '—',
        a.priority || '—',
        a.timeline || '—',
        a.owner || '—',
      ]),
      y,
    );
  }

  addFooterAndWatermark(doc);
  savePdf(doc, 'executive');
}

// ── Generic fallback ───────────────────────────────────────────────
function exportGenericPdf(d, reportType) {
  const doc = createPdf(reportType, '');
  let y = 46;

  const rows = [];
  Object.entries(d || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'object') {
      rows.push([key, JSON.stringify(value)]);
    } else {
      rows.push([key, String(value)]);
    }
  });

  y = addTable(doc, 'DATA', ['Field', 'Value'], rows, y);
  addFooterAndWatermark(doc);
  savePdf(doc, reportType);
}

function savePdf(doc, reportType) {
  const date = new Date().toISOString().split('T')[0];
  doc.save(`report-${reportType}-${date}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════════
export const exportToExcel = (reportData, reportType) => {
  if (!reportData) {
    console.error('exportToExcel: no report data');
    return;
  }

  try {
    switch (reportType) {
      case 'daily':         return exportDailyXls(reportData);
      case 'weekly':        return exportWeeklyXls(reportData);
      case 'monthly':       return exportMonthlyXls(reportData);
      case 'yearly':        return exportYearlyXls(reportData);
      case 'pl':            return exportProfitLossXls(reportData);
      case 'cashflow':      return exportCashFlowXls(reportData);
      case 'balance-sheet': return exportBalanceSheetXls(reportData);
      case 'executive':     return exportExecutiveXls(reportData);
      default:              return exportGenericXls(reportData, reportType);
    }
  } catch (err) {
    console.error('Excel Export Error:', err);
    alert('Failed to generate Excel file. Please try again.');
  }
};

function buildSheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

function saveXls(wb, reportType) {
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `report-${reportType}-${date}.xlsx`);
}

// ── Daily XLS ──
function exportDailyXls(d) {
  const wb = XLSX.utils.book_new();
  const t = d.today || {};

  const summary = [
    ['AI CFO ENTERPRISE', 'DAILY REPORT'],
    ['Date', d.date || ''],
    ['Previous Date', d.previousDate || ''],
    [],
    ['REVENUE'],
    ['Revenue', xlsMoney(t.revenue)],
    ['Sales Count', num(t.salesCount)],
    ['COGS', xlsMoney(t.cogs)],
    ['Gross Profit', xlsMoney(t.grossProfit)],
    ['Gross Margin', pct(t.grossMargin)],
    ['Other Income', xlsMoney(t.income)],
    [],
    ['EXPENSES & PROFIT'],
    ['Expenses', xlsMoney(t.expenses)],
    ['Net Profit', xlsMoney(t.netProfit)],
    ['Net Margin', pct(t.netMargin)],
    ['Purchases', xlsMoney(t.purchases)],
    [],
    ['CASH FLOW'],
    ['Cash Received', xlsMoney(t.cashReceivedToday)],
    ['Cash Paid', xlsMoney(t.cashPaidToday)],
    ['Opening Cash', xlsMoney(t.cash?.opening)],
    ['Closing Cash', xlsMoney(t.cash?.closing)],
    [],
    ['RECEIVABLES & PAYABLES'],
    ['Debtors Outstanding', xlsMoney(t.receivables?.outstanding)],
    ['Debtors Overdue', xlsMoney(t.receivables?.overdue)],
    ['Creditors Outstanding', xlsMoney(t.payables?.outstanding)],
    ['Creditors Overdue', xlsMoney(t.payables?.overdue)],
    [],
    ['INVENTORY'],
    ['Total Items', num(t.inventory?.totalItems)],
    ['Total Value', xlsMoney(t.inventory?.totalValue)],
    ['Low Stock Count', num(t.inventory?.lowStockCount)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summary), 'Summary');

  if (Array.isArray(d.transactions) && d.transactions.length > 0) {
    const tx = [
      ['Type', 'Amount', 'Description', 'Date'],
      ...d.transactions.map((x) => [
        x.type || '',
        xlsMoney(x.amount),
        x.description || '',
        x.date ? fmtDate(x.date) : '',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(tx), 'Transactions');
  }

  if (Array.isArray(d.debtors?.top3) && d.debtors.top3.length > 0) {
    const dd = [
      ['Debtor', 'Amount Owed'],
      ...d.debtors.top3.map((x) => [x.name || '—', xlsMoney(x.amount)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(dd), 'Top Debtors');
  }

  saveXls(wb, 'daily');
}

// ── Weekly XLS ──
function exportWeeklyXls(d) {
  const wb = XLSX.utils.book_new();
  const range = `${fmtDate(d.period?.start)} — ${fmtDate(d.period?.end)}`;

  const summary = [
    ['AI CFO ENTERPRISE', 'WEEKLY REPORT'],
    ['Period', range],
    [],
    ['SUMMARY'],
    ['Revenue', xlsMoney(d.revenue)],
    ['Other Revenue', xlsMoney(d.otherRevenue)],
    ['COGS', xlsMoney(d.cogs)],
    ['Gross Profit', xlsMoney(d.grossProfit)],
    ['Gross Margin', pct(d.grossMargin)],
    ['Expenses', xlsMoney(d.expenses)],
    ['Net Profit', xlsMoney(d.netProfit)],
    ['Net Margin', pct(d.netMargin)],
    [],
    ['COMPARISON'],
    ['Revenue Change', pct(d.weekOverWeek?.revenueChange)],
    ['Profit Change', pct(d.weekOverWeek?.profitChange)],
    ['Prev Revenue', xlsMoney(d.weekOverWeek?.previousWeek?.revenue)],
    ['Prev Gross Profit', xlsMoney(d.weekOverWeek?.previousWeek?.grossProfit)],
    ['Prev Net Profit', xlsMoney(d.weekOverWeek?.previousWeek?.netProfit)],
    [],
    ['INVENTORY'],
    ['Total Items', num(d.inventory?.totalItems)],
    ['Total Value', xlsMoney(d.inventory?.totalValue)],
    ['Low Stock Count', num(d.inventory?.lowStockCount)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summary), 'Summary');

  if (Array.isArray(d.keyRisks) && d.keyRisks.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Key Risks'], ...d.keyRisks.map((r) => [r])]),
      'Key Risks',
    );
  }

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    const rows = [
      ['Product', 'Revenue', 'Units'],
      ...d.topProducts.map((p) => [p.name || '—', xlsMoney(p.revenue), num(p.quantity)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Top Products');
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    const rows = [
      ['Customer', 'Total', 'Purchases'],
      ...d.topCustomers.map((c) => [c.name || '—', xlsMoney(c.total), num(c.count)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Top Customers');
  }

  saveXls(wb, 'weekly');
}

// ── Monthly XLS ──
function exportMonthlyXls(d) {
  const wb = XLSX.utils.book_new();
  const range = `${fmtDate(d.period?.start)} — ${fmtDate(d.period?.end)}`;

  const summary = [
    ['AI CFO ENTERPRISE', 'MONTHLY REPORT'],
    ['Period', d.month ? `${d.month} ${d.year}` : range],
    [],
    ['PERFORMANCE'],
    ['Revenue', xlsMoney(d.revenue)],
    ['Gross Profit', xlsMoney(d.grossProfit)],
    ['Gross Margin', pct(d.grossMargin)],
    ['Expenses', xlsMoney(d.expenses)],
    ['Net Profit', xlsMoney(d.netProfit)],
    ['Net Margin', pct(d.netMargin)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summary), 'Summary');

  const k = d.kpiDashboard || {};
  const kpi = [
    ['KPI', 'Value'],
    ['COGS', xlsMoney(k.cogs)],
    ['Gross Profit', xlsMoney(k.grossProfit)],
    ['Gross Margin', pct(k.grossMargin)],
    ['Net Margin', pct(k.netMargin)],
    ['YTD Revenue', xlsMoney(k.ytdRevenue)],
    ['YTD Net Profit', xlsMoney(k.ytdNetProfit)],
    ['Total Sales', num(k.totalSales)],
    ['Unique Customers', num(k.uniqueCustomers)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(kpi), 'KPI Dashboard');

  if (d.monthOverMonth) {
    const mom = [
      ['Month-over-Month', 'Value'],
      ['Revenue Change', d.monthOverMonth.revenueChange == null ? '—' : pct(d.monthOverMonth.revenueChange)],
      ['Profit Change', d.monthOverMonth.profitChange == null ? '—' : pct(d.monthOverMonth.profitChange)],
      ['Prev Revenue', xlsMoney(d.monthOverMonth.previousMonth?.revenue)],
      ['Prev Gross Profit', xlsMoney(d.monthOverMonth.previousMonth?.grossProfit)],
      ['Prev Net Profit', xlsMoney(d.monthOverMonth.previousMonth?.netProfit)],
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(mom), 'MoM Comparison');
  }

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    const rows = [
      ['Product', 'Revenue', 'Units'],
      ...d.topProducts.map((p) => [p.name || '—', xlsMoney(p.revenue), num(p.quantity)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Top Products');
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    const rows = [
      ['Customer', 'Total', 'Purchases'],
      ...d.topCustomers.map((c) => [c.name || '—', xlsMoney(c.total), num(c.count)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Top Customers');
  }

  if (Array.isArray(d.aiInsights) && d.aiInsights.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['AI Insights'], ...d.aiInsights.map((i) => [i])]),
      'AI Insights',
    );
  }

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Recommendations'], ...d.recommendations.map((r) => [r])]),
      'Recommendations',
    );
  }

  saveXls(wb, 'monthly');
}

// ── Yearly XLS ──
function exportYearlyXls(d) {
  const wb = XLSX.utils.book_new();
  const range = `${fmtDate(d.period?.start)} — ${fmtDate(d.period?.end)}`;

  const summary = [
    ['AI CFO ENTERPRISE', 'YEARLY REPORT'],
    ['Year', d.year || ''],
    ['Period', range],
    [],
    ['ANNUAL PERFORMANCE'],
    ['Revenue', xlsMoney(d.revenue)],
    ['Gross Profit', xlsMoney(d.grossProfit)],
    ['Gross Margin', pct(d.grossMargin)],
    ['Expenses', xlsMoney(d.expenses)],
    ['Net Profit', xlsMoney(d.netProfit)],
    ['Net Margin', pct(d.netMargin)],
    [],
    ['YEAR-OVER-YEAR'],
    ['Revenue Change', pct(d.yearOverYear?.revenueChange)],
    ['Profit Change', pct(d.yearOverYear?.profitChange)],
    ['Prev Revenue', xlsMoney(d.yearOverYear?.previousYear?.revenue)],
    ['Prev Net Profit', xlsMoney(d.yearOverYear?.previousYear?.netProfit)],
    ['Has Prior Year Data', d.yearOverYear?.hasPriorYearData ? 'Yes' : 'No'],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summary), 'Summary');

  if (Array.isArray(d.majorRisks) && d.majorRisks.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Major Risks'], ...d.majorRisks.map((r) => [r])]),
      'Major Risks',
    );
  }

  if (Array.isArray(d.majorOpportunities) && d.majorOpportunities.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Major Opportunities'], ...d.majorOpportunities.map((o) => [o])]),
      'Opportunities',
    );
  }

  if (Array.isArray(d.strategicInsights) && d.strategicInsights.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Strategic Insights'], ...d.strategicInsights.map((s) => [s])]),
      'Strategic Insights',
    );
  }

  saveXls(wb, 'yearly');
}

// ── P&L XLS ──
function exportProfitLossXls(d) {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['AI CFO ENTERPRISE', 'PROFIT & LOSS'],
    ['Period', `${d.startDate} — ${d.endDate}`],
    [],
    ['REVENUE'],
    ['Product Sales', xlsMoney(d.revenue?.productSales)],
    ['Other Revenue', xlsMoney(d.revenue?.otherRevenue)],
    ['TOTAL REVENUE', xlsMoney(d.revenue?.totalRevenue)],
    [],
    ['COGS'],
    ['Cost of Goods Sold', xlsMoney(d.cogs?.total)],
    [],
    ['GROSS PROFIT'],
    ['Amount', xlsMoney(d.grossProfit?.amount)],
    ['Margin', pct(d.grossProfit?.margin)],
    [],
    ['OPERATING EXPENSES'],
    ['Salaries', xlsMoney(d.operatingExpenses?.salaries)],
    ['Rent', xlsMoney(d.operatingExpenses?.rent)],
    ['Advertising', xlsMoney(d.operatingExpenses?.advertising)],
    ['Transportation', xlsMoney(d.operatingExpenses?.transportation)],
    ['Utilities', xlsMoney(d.operatingExpenses?.utilities)],
    ['Other', xlsMoney(d.operatingExpenses?.other)],
    ['TOTAL OPERATING EXPENSES', xlsMoney(d.operatingExpenses?.total)],
    [],
    ['OPERATING PROFIT'],
    ['Amount', xlsMoney(d.operatingProfit?.amount)],
    ['Margin', pct(d.operatingProfit?.margin)],
    [],
    ['OTHER ITEMS'],
    ['Other Income', xlsMoney(d.otherIncome)],
    ['Other Expenses', xlsMoney(d.otherExpenses)],
    [],
    ['NET PROFIT'],
    ['Amount', xlsMoney(d.netProfit?.amount)],
    ['Margin', pct(d.netProfit?.margin)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'P&L');

  if (d.comparison) {
    const cmp = [
      ['Comparison', 'Value'],
      ['Revenue Change', d.comparison.revenueChange == null ? '—' : pct(d.comparison.revenueChange)],
      ['Profit Change', d.comparison.profitChange == null ? '—' : pct(d.comparison.profitChange)],
      ['Margin Change', d.comparison.marginChange == null ? '—' : pct(d.comparison.marginChange)],
      ['Prev Revenue', xlsMoney(d.comparison.previousPeriod?.revenue)],
      ['Prev Gross Profit', xlsMoney(d.comparison.previousPeriod?.grossProfit)],
      ['Prev Net Profit', xlsMoney(d.comparison.previousPeriod?.netProfit)],
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(cmp), 'Comparison');
  }

  saveXls(wb, 'pl');
}

// ── Cash Flow XLS ──
function exportCashFlowXls(d) {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['AI CFO ENTERPRISE', 'CASH FLOW STATEMENT'],
    ['Period', `${d.period?.startDate} — ${d.period?.endDate}`],
    [],
    ['OPERATING ACTIVITIES'],
    ['Cash from Customers', xlsMoney(d.operatingActivities?.cashIn?.fromCustomers)],
    ['Cash from Debtors', xlsMoney(d.operatingActivities?.cashIn?.fromDebtors)],
    ['Cash from Other Income', xlsMoney(d.operatingActivities?.cashIn?.fromOtherIncome)],
    ['TOTAL CASH IN', xlsMoney(d.operatingActivities?.cashIn?.total)],
    ['Cash to Suppliers', xlsMoney(d.operatingActivities?.cashOut?.toSuppliers)],
    ['Cash to Creditors', xlsMoney(d.operatingActivities?.cashOut?.toCreditors)],
    ['Operating Expenses', xlsMoney(d.operatingActivities?.cashOut?.operatingExpenses)],
    ['TOTAL CASH OUT', xlsMoney(d.operatingActivities?.cashOut?.total)],
    ['NET OPERATING CASH FLOW', xlsMoney(d.operatingActivities?.netOperatingCash)],
    [],
    ['INVESTING ACTIVITIES'],
    ['Purchase of Equipment', xlsMoney(d.investingActivities?.purchaseOfEquipment)],
    ['Purchase of Long-term Assets', xlsMoney(d.investingActivities?.purchaseOfLongTermAssets)],
    ['Proceeds from Asset Sales', xlsMoney(d.investingActivities?.proceedsFromAssetSales)],
    ['Net Investing Cash Flow', xlsMoney(d.investingActivities?.netInvestingCash)],
    [],
    ['FINANCING ACTIVITIES'],
    ['Loans Received', xlsMoney(d.financingActivities?.loansReceived)],
    ['Loan Repayments', xlsMoney(d.financingActivities?.loanRepayments)],
    ['Owner Contributions', xlsMoney(d.financingActivities?.ownerContributions)],
    ['Owner Withdrawals', xlsMoney(d.financingActivities?.ownerWithdrawals)],
    ['Net Financing Cash Flow', xlsMoney(d.financingActivities?.netFinancingCash)],
    [],
    ['CASH SUMMARY'],
    ['Opening Cash', xlsMoney(d.openingCash ?? d.summary?.openingCash)],
    ['Net Change in Cash', xlsMoney(d.netChangeInCash ?? d.summary?.netChange)],
    ['Closing Cash', xlsMoney(d.closingCash ?? d.summary?.closingCash)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Cash Flow');

  saveXls(wb, 'cashflow');
}

// ── Balance Sheet XLS ──
function exportBalanceSheetXls(d) {
  const wb = XLSX.utils.book_new();

  const ca = d.assets?.currentAssets || {};
  const nca = d.assets?.nonCurrentAssets || {};
  const cl = d.liabilities?.currentLiabilities || {};
  const ncl = d.liabilities?.nonCurrentLiabilities || {};
  const eq = d.equity || {};

  const liabPlusEquity = toNumber(d.liabilities?.totalLiabilities) + toNumber(eq.totalEquity);

  const rows = [
    ['AI CFO ENTERPRISE', 'BALANCE SHEET'],
    ['As at', d.asAtDate || ''],
    ['Currency', 'NGN'],
    [],
    ['ASSETS'],
    ['CURRENT ASSETS'],
    ['Cash & Cash Equivalents', xlsMoney(ca.cash)],
    ['Accounts Receivable', xlsMoney(ca.accountsReceivable)],
    ['Inventory', xlsMoney(ca.inventory)],
    ['Other Current Assets', xlsMoney(ca.otherCurrentAssets)],
    ['TOTAL CURRENT ASSETS', xlsMoney(ca.total)],
    [],
    ['NON-CURRENT ASSETS'],
    ['Property & Equipment', xlsMoney(nca.propertyAndEquipment)],
    ['Other Non-Current Assets', xlsMoney(nca.otherNonCurrentAssets)],
    ['TOTAL NON-CURRENT ASSETS', xlsMoney(nca.total)],
    [],
    ['TOTAL ASSETS', xlsMoney(d.assets?.totalAssets)],
    [],
    ['LIABILITIES'],
    ['CURRENT LIABILITIES'],
    ['Accounts Payable', xlsMoney(cl.accountsPayable)],
    ['Short-Term Debt', xlsMoney(cl.shortTermDebt)],
    ['Other Current Liabilities', xlsMoney(cl.otherCurrentLiabilities)],
    ['TOTAL CURRENT LIABILITIES', xlsMoney(cl.total)],
    [],
    ['NON-CURRENT LIABILITIES'],
    ['Long-Term Debt', xlsMoney(ncl.longTermDebt)],
    ['Other Non-Current Liabilities', xlsMoney(ncl.otherNonCurrentLiabilities)],
    ['TOTAL NON-CURRENT LIABILITIES', xlsMoney(ncl.total)],
    [],
    ['TOTAL LIABILITIES', xlsMoney(d.liabilities?.totalLiabilities)],
    [],
    ['EQUITY'],
    ["Owner's Capital", xlsMoney(eq.ownersCapital)],
    ['Retained Earnings', xlsMoney(eq.retainedEarnings)],
    ['Other Equity', xlsMoney(eq.otherEquity)],
    ['Less: Drawings', `(${xlsMoney(eq.lessDrawings)})`],
    ['TOTAL EQUITY', xlsMoney(eq.totalEquity)],
    [],
    ['TOTAL LIABILITIES + EQUITY', xlsMoney(liabPlusEquity)],
    [],
    ['BALANCE CHECK'],
    ['Total Assets', xlsMoney(d.assets?.totalAssets)],
    ['Liabilities + Equity', xlsMoney(liabPlusEquity)],
    ['Difference', xlsMoney(d.control?.difference)],
    ['Status', (d.control?.isBalanced || Math.abs(toNumber(d.control?.difference)) < 0.01) ? 'BALANCED' : 'OUT OF BALANCE'],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Balance Sheet');

  saveXls(wb, 'balance-sheet');
}

// ── Executive XLS ──
function exportExecutiveXls(d) {
  const wb = XLSX.utils.book_new();

  const summary = [
    ['AI CFO ENTERPRISE', 'EXECUTIVE REPORT'],
    ['Period', `${fmtDate(d.period?.start)} — ${fmtDate(d.period?.end)}`],
    ['Generated', d.generatedAt ? fmtDate(d.generatedAt) : ''],
    [],
    ['BUSINESS OVERVIEW'],
    ['Revenue', xlsMoney(d.businessOverview?.revenue)],
    ['Net Profit', xlsMoney(d.businessOverview?.netProfit)],
    ['Business Health', d.businessOverview?.businessHealth || '—'],
    ['Business Score', d.businessOverview?.businessScore ?? '—'],
    [],
    ['EXECUTIVE SUMMARY'],
    ['Revenue', xlsMoney(d.executiveSummary?.revenue)],
    ['Gross Profit', xlsMoney(d.executiveSummary?.grossProfit)],
    ['Gross Margin', pct(d.executiveSummary?.grossMargin)],
    ['Net Profit', xlsMoney(d.executiveSummary?.netProfit)],
    ['Net Margin', pct(d.executiveSummary?.netMargin)],
    ['Expenses', xlsMoney(d.executiveSummary?.expenses)],
    ['Cash', xlsMoney(d.executiveSummary?.cash)],
    ['Receivables', xlsMoney(d.executiveSummary?.receivables)],
    ['Payables', xlsMoney(d.executiveSummary?.payables)],
    ['Inventory', xlsMoney(d.executiveSummary?.inventory)],
    [],
    ['KPI DASHBOARD'],
    ['Revenue', xlsMoney(d.kpiDashboard?.revenue)],
    ['Gross Profit', xlsMoney(d.kpiDashboard?.grossProfit)],
    ['Net Profit', xlsMoney(d.kpiDashboard?.netProfit)],
    ['Total Sales', num(d.kpiDashboard?.totalSales)],
    ['Unique Customers', num(d.kpiDashboard?.uniqueCustomers)],
    [],
    ['BUSINESS TRENDS'],
    ['Today', xlsMoney(d.businessTrends?.today)],
    ['This Week', xlsMoney(d.businessTrends?.thisWeek)],
    ['This Month', xlsMoney(d.businessTrends?.thisMonth)],
    [],
    ['FORECAST'],
    ['Next 7 Days', xlsMoney(d.forecast?.next7Days)],
    ['Next 30 Days', xlsMoney(d.forecast?.next30Days)],
    ['Next 60 Days', xlsMoney(d.forecast?.next60Days)],
    ['Confidence', pct(d.forecast?.confidence)],
    [],
    ['FINANCIAL RATIOS'],
    ['Gross Margin', pct(d.financialRatios?.grossMargin)],
    ['Net Margin', pct(d.financialRatios?.netMargin)],
    ['Expense Ratio', pct(d.financialRatios?.expenseRatio)],
    [],
    ['CASH FLOW'],
    ['Opening', xlsMoney(d.cashFlow?.opening)],
    ['Closing', xlsMoney(d.cashFlow?.closing)],
    [],
    ['RECEIVABLES & PAYABLES'],
    ['Receivables Outstanding', xlsMoney(d.receivables?.totalOutstanding)],
    ['Payables Outstanding', xlsMoney(d.payables?.totalOutstanding)],
    [],
    ['INVENTORY'],
    ['Total Items', num(d.inventory?.totalItems)],
    ['Total Value', xlsMoney(d.inventory?.totalValue)],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summary), 'Summary');

  if (Array.isArray(d.topProducts) && d.topProducts.length > 0) {
    const rows = [
      ['Product', 'Revenue', 'Units'],
      ...d.topProducts.map((p) => [p.name || '—', xlsMoney(p.revenue), num(p.quantity)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Top Products');
  }

  if (Array.isArray(d.topCustomers) && d.topCustomers.length > 0) {
    const rows = [
      ['Customer', 'Total', 'Purchases'],
      ...d.topCustomers.map((c) => [c.name || '—', xlsMoney(c.total), num(c.count)]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Top Customers');
  }

  if (Array.isArray(d.insights) && d.insights.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Insights'], ...d.insights.map((i) => [i])]),
      'Insights',
    );
  }

  if (Array.isArray(d.recommendations) && d.recommendations.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet([['Recommendations'], ...d.recommendations.map((r) => [r])]),
      'Recommendations',
    );
  }

  if (Array.isArray(d.managementActionPlan) && d.managementActionPlan.length > 0) {
    const rows = [
      ['Action', 'Priority', 'Timeline', 'Owner'],
      ...d.managementActionPlan.map((a) => [
        a.action || '—',
        a.priority || '—',
        a.timeline || '—',
        a.owner || '—',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Action Plan');
  }

  saveXls(wb, 'executive');
}

// ── Generic fallback ──
function exportGenericXls(d, reportType) {
  const wb = XLSX.utils.book_new();
  const rows = [];
  Object.entries(d || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'object') {
      rows.push([key, JSON.stringify(value)]);
    } else {
      rows.push([key, String(value)]);
    }
  });
  XLSX.utils.book_append_sheet(wb, buildSheet([['Field', 'Value'], ...rows]), 'Data');
  saveXls(wb, reportType);
}