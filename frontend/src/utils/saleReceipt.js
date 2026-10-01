// frontend/src/utils/saleReceipt.js
// v1.2.0-prod — Receipt/invoice generator for a single sale.
//               v1.1.0: watermark + footer branding + better closing line.
//               v1.2.0: PDF currency uses "NGN" prefix (jsPDF's built-in
//                       Helvetica lacks the ₦ glyph); print keeps ₦.
//                       PDF currency renders with zero character spacing
//                       so digits are not visually separated.
//
// Two outputs:
//   printSaleReceipt(sale, options)       → browser print dialog (uses ₦)
//   downloadSaleReceiptPDF(sale, options) → jsPDF download (uses NGN)

import jsPDF from 'jspdf';

const BRAND = {
  name: 'AI CFO ENTERPRISE',
  shortName: 'AI CFO ENTERPRISE',
  url: 'aicfotechnologies.com',
};

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusLabel = (status) => {
  switch (status) {
    case 'PAID': return 'Paid';
    case 'PARTIAL': return 'Partial';
    case 'UNPAID': return 'Unpaid';
    default: return status || '—';
  }
};

const resolveLineItems = (sale) => {
  const items = sale?.items || [];
  return items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const sell = Number(item.sellingPrice ?? item.unitPrice ?? 0);
    const total = Number(item.total) || qty * sell;
    return {
      name: item.name || '—',
      quantity: qty,
      sellingPrice: sell,
      total,
    };
  });
};

const computeTotals = (sale, items) => {
  const total = Number(sale?.total_price) || items.reduce((sum, i) => sum + i.total, 0);
  const paid = Number(sale?.amount_paid) || 0;
  const balance = Number(sale?.balance_remaining) || Math.max(0, total - paid);
  return { total, paid, balance };
};

// ── Browser print ───────────────────────────────────────────────────
export const printSaleReceipt = (sale, options = {}) => {
  if (!sale) return;

  const businessName = options.businessName || 'AI CFO ENTERPRISE';
  const businessAddress = options.businessAddress || '';
  const businessPhone = options.businessPhone || '';
  const currency = options.currency || '₦';

  const items = resolveLineItems(sale);
  const totals = computeTotals(sale, items);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${sale.invoice_no || sale.id}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #111;
            padding: 24px;
            max-width: 720px;
            margin: 0 auto;
            font-size: 13px;
            line-height: 1.45;
            position: relative;
          }

          /* ── Watermark ── */
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 72px;
            font-weight: 800;
            color: #000;
            opacity: 0.06;
            letter-spacing: 6px;
            white-space: nowrap;
            pointer-events: none;
            user-select: none;
            z-index: 0;
          }
          .content { position: relative; z-index: 1; }

          header { text-align: center; margin-bottom: 20px; }
          .biz-name {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 6px;
            color: #000;
            letter-spacing: 0.3px;
          }
          .biz-meta { font-size: 12px; color: #555; line-height: 1.5; }

          h1 {
            font-size: 15px;
            font-weight: 600;
            text-align: center;
            margin: 18px 0 22px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #333;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 24px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .meta-grid .label { color: #666; }
          .meta-grid .value { font-weight: 500; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
          }
          th {
            background: #f9fafb;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
          }
          td.right, th.right { text-align: right; }
          tfoot td {
            border-bottom: none;
            font-weight: 600;
          }
          tfoot tr.sub td {
            border-top: 2px solid #111;
            padding-top: 12px;
          }

          .status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }
          .status.PAID    { background: #d1fae5; color: #065f46; }
          .status.PARTIAL { background: #fef3c7; color: #92400e; }
          .status.UNPAID  { background: #fee2e2; color: #991b1b; }

          .notes {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #555;
          }

          .closing {
            margin-top: 32px;
            text-align: center;
            font-size: 12px;
            font-style: italic;
            color: #444;
            letter-spacing: 0.2px;
          }

          footer {
            margin-top: 36px;
            padding-top: 14px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            letter-spacing: 0.3px;
          }
          footer .brand-line {
            font-weight: 600;
            color: #6b7280;
            letter-spacing: 0.5px;
          }
          footer .url {
            margin-top: 2px;
          }

          @media print {
            body { padding: 0; }
            @page { margin: 16mm; }
            .watermark { font-size: 64px; }
          }
        </style>
      </head>
      <body>
        <div class="watermark">${BRAND.name}</div>

        <div class="content">
          <header>
            <div class="biz-name">${escapeHtml(businessName)}</div>
            ${businessAddress || businessPhone ? `
              <div class="biz-meta">
                ${businessAddress ? escapeHtml(businessAddress) + '<br/>' : ''}
                ${businessPhone ? escapeHtml(businessPhone) : ''}
              </div>
            ` : ''}
          </header>

          <h1>Receipt / Invoice</h1>

          <div class="meta-grid">
            <div><span class="label">Invoice #:</span> <span class="value">${escapeHtml(sale.invoice_no || `#${sale.id}`)}</span></div>
            <div><span class="label">Date:</span> <span class="value">${formatDate(sale.sale_date)}</span></div>
            <div><span class="label">Customer:</span> <span class="value">${escapeHtml(sale.customer_name || 'Walk-in')}</span></div>
            <div><span class="label">Status:</span> <span class="status ${escapeHtml(sale.payment_status || 'UNPAID')}">${statusLabel(sale.payment_status)}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Unit Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((i) => `
                <tr>
                  <td>${escapeHtml(i.name)}</td>
                  <td class="right">${i.quantity}</td>
                  <td class="right">${currency}${i.sellingPrice.toLocaleString()}</td>
                  <td class="right">${currency}${i.total.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="sub">
                <td colspan="3" class="right">Total:</td>
                <td class="right">${currency}${totals.total.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="right">Amount Paid:</td>
                <td class="right">${currency}${totals.paid.toLocaleString()}</td>
              </tr>
              ${totals.balance > 0 ? `
                <tr>
                  <td colspan="3" class="right">Balance Due:</td>
                  <td class="right" style="color:#b91c1c;">${currency}${totals.balance.toLocaleString()}</td>
                </tr>
              ` : ''}
            </tfoot>
          </table>

          ${sale.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(sale.notes)}</div>` : ''}

          <p class="closing">
            Thank you for your business. We look forward to serving you again.
          </p>

          <footer>
            <div class="brand-line">POWERED BY ${BRAND.shortName}</div>
            <div class="url">${BRAND.url}</div>
          </footer>
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  };
};

// ── PDF download ────────────────────────────────────────────────────
export const downloadSaleReceiptPDF = (sale, options = {}) => {
  if (!sale) return;

  const businessName = options.businessName || 'AI CFO ENTERPRISE';
  const businessAddress = options.businessAddress || '';
  const businessPhone = options.businessPhone || '';

  const items = resolveLineItems(sale);
  const totals = computeTotals(sale, items);

  // jsPDF's built-in Helvetica has no ₦ glyph → use "NGN " prefix.
  const money = (n) => `NGN ${Number(n || 0).toLocaleString()}`;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // Reset character spacing so digits don't render spread out.
  const resetSpacing = () => {
    if (typeof doc.setCharSpace === 'function') {
      doc.setCharSpace(0);
    }
  };

  // ── Watermark (drawn after content, on every page) ──
  const drawWatermark = () => {
    doc.saveGraphicsState();
    try {
      // jsPDF v2 GState API — may not exist in older builds
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
  };

  // ── Header ──
  resetSpacing();
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(businessName, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  if (businessAddress) {
    doc.text(businessAddress, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  if (businessPhone) {
    doc.text(businessPhone, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  // ── Title ──
  doc.setTextColor(60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT / INVOICE', pageWidth / 2, y + 4, { align: 'center' });
  y += 16;

  // ── Meta block ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  const leftX = 15;
  const rightX = pageWidth - 15;

  doc.text(`Invoice #: ${sale.invoice_no || `#${sale.id}`}`, leftX, y);
  doc.text(`Date: ${formatDate(sale.sale_date)}`, rightX, y, { align: 'right' });
  y += 6;

  doc.text(`Customer: ${sale.customer_name || 'Walk-in'}`, leftX, y);
  doc.text(`Status: ${statusLabel(sale.payment_status)}`, rightX, y, { align: 'right' });
  y += 10;

  // ── Line items table ──
  const colX = {
    item: leftX,
    qty: pageWidth - 90,
    price: pageWidth - 55,
    total: rightX,
  };

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(leftX, y, rightX, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ITEM', colX.item, y);
  doc.text('QTY', colX.qty, y, { align: 'right' });
  doc.text('UNIT PRICE', colX.price, y, { align: 'right' });
  doc.text('TOTAL', colX.total, y, { align: 'right' });
  y += 3;
  doc.line(leftX, y, rightX, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  resetSpacing();
  for (const it of items) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    const itemText = doc.splitTextToSize(it.name, colX.qty - colX.item - 10);
    doc.text(itemText, colX.item, y);
    doc.text(String(it.quantity), colX.qty, y, { align: 'right' });
    doc.text(money(it.sellingPrice), colX.price, y, { align: 'right' });
    doc.text(money(it.total), colX.total, y, { align: 'right' });
    y += 6 * (Array.isArray(itemText) ? itemText.length : 1) + 2;
  }

  // ── Totals ──
  y += 3;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(leftX, y, rightX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', colX.price, y, { align: 'right' });
  doc.text(money(totals.total), colX.total, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', colX.price, y, { align: 'right' });
  doc.text(money(totals.paid), colX.total, y, { align: 'right' });
  y += 6;

  if (totals.balance > 0) {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', colX.price, y, { align: 'right' });
    doc.text(money(totals.balance), colX.total, y, { align: 'right' });
    doc.setTextColor(0);
    y += 6;
  }

  // ── Notes ──
  if (sale.notes) {
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Notes: ${sale.notes}`, leftX, y, { maxWidth: rightX - leftX });
    doc.setTextColor(0);
  }

  // ── Closing ──
  y += 14;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    'Thank you for your business. We look forward to serving you again.',
    pageWidth / 2,
    y,
    { align: 'center', maxWidth: rightX - leftX }
  );

  // ── Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`POWERED BY ${BRAND.shortName}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
  doc.setTextColor(160);
  doc.text(BRAND.url, pageWidth / 2, pageHeight - 13, { align: 'center' });

  // ── Watermark on every page ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawWatermark();
  }

  const filename = `receipt-${(sale.invoice_no || sale.id || 'sale').toString().replace(/[^\w-]/g, '_')}.pdf`;
  doc.save(filename);
};

// ── helpers ────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}