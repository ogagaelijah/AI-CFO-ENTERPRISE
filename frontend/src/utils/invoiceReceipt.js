// frontend/src/utils/invoiceReceipt.js
// v1.0.0-prod — Print + PDF generator for a single invoice.
//               Mirrors saleReceipt.js patterns:
//                 - print uses browser dialog with ₦ glyph
//                 - PDF uses "NGN" prefix (jsPDF Helvetica lacks ₦)
//                 - watermark + branded footer
//
// Two outputs:
//   printInvoice(invoice, options)       → browser print dialog
//   downloadInvoicePDF(invoice, options) → jsPDF download

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
    case 'DRAFT': return 'Draft';
    case 'SENT': return 'Sent';
    case 'PAID': return 'Paid';
    case 'OVERDUE': return 'Overdue';
    case 'CANCELLED': return 'Cancelled';
    default: return status || '—';
  }
};

const computeTotals = (invoice) => {
  const subtotal = Number(invoice?.subtotal) || 0;
  const tax = Number(invoice?.tax) || 0;
  const total = Number(invoice?.total) || subtotal + tax;
  const paid = Number(invoice?.amount_paid ?? invoice?.amountPaid) || 0;
  const balance = Number(invoice?.balance) || Math.max(0, total - paid);
  return { subtotal, tax, total, paid, balance };
};

// ─── Browser print ────────────────────────────────────────────────
export const printInvoice = (invoice, options = {}) => {
  if (!invoice) return;

  const businessName = options.businessName || 'AI CFO ENTERPRISE';
  const businessAddress = options.businessAddress || '';
  const businessPhone = options.businessPhone || '';
  const currency = options.currency || '₦';

  const totals = computeTotals(invoice);
  const customerName = invoice.customer_name || invoice.customerName || '—';
  const projectName = invoice.project_name || invoice.projectName || null;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.invoice_number || invoice.invoiceNumber || invoice.id}</title>
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

          .bill-to {
            margin-bottom: 20px;
            padding: 12px 14px;
            background: #f9fafb;
            border-left: 3px solid #6b7280;
            border-radius: 2px;
          }
          .bill-to .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 3px;
          }
          .bill-to .name { font-weight: 600; font-size: 14px; color: #111; }

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
          .status.PAID      { background: #d1fae5; color: #065f46; }
          .status.SENT      { background: #dbeafe; color: #1e40af; }
          .status.DRAFT     { background: #f3f4f6; color: #374151; }
          .status.OVERDUE   { background: #fee2e2; color: #991b1b; }
          .status.CANCELLED { background: #f3f4f6; color: #6b7280; }

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
          footer .url { margin-top: 2px; }

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

          <h1>Invoice</h1>

          <div class="meta-grid">
            <div><span class="label">Invoice #:</span> <span class="value">${escapeHtml(invoice.invoice_number || invoice.invoiceNumber || `#${invoice.id}`)}</span></div>
            <div><span class="label">Issue Date:</span> <span class="value">${formatDate(invoice.issue_date || invoice.issueDate)}</span></div>
            <div><span class="label">Due Date:</span> <span class="value">${formatDate(invoice.due_date || invoice.dueDate)}</span></div>
            <div><span class="label">Status:</span> <span class="status ${escapeHtml(invoice.status || 'DRAFT')}">${statusLabel(invoice.status)}</span></div>
          </div>

          <div class="bill-to">
            <div class="label">Bill To</div>
            <div class="name">${escapeHtml(customerName)}</div>
            ${projectName ? `<div style="font-size:12px;color:#555;margin-top:3px;">Project: ${escapeHtml(projectName)}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Services rendered</td>
                <td class="right">${currency}${totals.subtotal.toLocaleString()}</td>
              </tr>
              ${totals.tax > 0 ? `
                <tr>
                  <td>Tax</td>
                  <td class="right">${currency}${totals.tax.toLocaleString()}</td>
                </tr>
              ` : ''}
            </tbody>
            <tfoot>
              <tr class="sub">
                <td class="right">Total:</td>
                <td class="right">${currency}${totals.total.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="right">Amount Paid:</td>
                <td class="right">${currency}${totals.paid.toLocaleString()}</td>
              </tr>
              ${totals.balance > 0 ? `
                <tr>
                  <td class="right">Balance Due:</td>
                  <td class="right" style="color:#b91c1c;">${currency}${totals.balance.toLocaleString()}</td>
                </tr>
              ` : ''}
            </tfoot>
          </table>

          ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ''}

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

// ─── PDF download ────────────────────────────────────────────────
export const downloadInvoicePDF = (invoice, options = {}) => {
  if (!invoice) return;

  const businessName = options.businessName || 'AI CFO ENTERPRISE';
  const businessAddress = options.businessAddress || '';
  const businessPhone = options.businessPhone || '';

  const totals = computeTotals(invoice);
  const customerName = invoice.customer_name || invoice.customerName || '—';
  const projectName = invoice.project_name || invoice.projectName || null;

  const money = (n) => `NGN ${Number(n || 0).toLocaleString()}`;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  const resetSpacing = () => {
    if (typeof doc.setCharSpace === 'function') {
      doc.setCharSpace(0);
    }
  };

  const drawWatermark = () => {
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
  };

  // Header
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

  // Title
  doc.setTextColor(60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, y + 4, { align: 'center' });
  y += 16;

  // Meta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  const leftX = 15;
  const rightX = pageWidth - 15;

  doc.text(`Invoice #: ${invoice.invoice_number || invoice.invoiceNumber || `#${invoice.id}`}`, leftX, y);
  doc.text(`Issue Date: ${formatDate(invoice.issue_date || invoice.issueDate)}`, rightX, y, { align: 'right' });
  y += 6;

  doc.text(`Due Date: ${formatDate(invoice.due_date || invoice.dueDate)}`, leftX, y);
  doc.text(`Status: ${statusLabel(invoice.status)}`, rightX, y, { align: 'right' });
  y += 10;

  // Bill To
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('BILL TO', leftX, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(customerName, leftX, y);
  y += 6;
  if (projectName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${projectName}`, leftX, y);
    y += 6;
  }
  y += 4;

  // Table header
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(leftX, y, rightX, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', leftX, y);
  doc.text('AMOUNT', rightX, y, { align: 'right' });
  y += 3;
  doc.line(leftX, y, rightX, y);
  y += 5;

  // Table body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  resetSpacing();

  doc.text('Services rendered', leftX, y);
  doc.text(money(totals.subtotal), rightX, y, { align: 'right' });
  y += 6;

  if (totals.tax > 0) {
    doc.text('Tax', leftX, y);
    doc.text(money(totals.tax), rightX, y, { align: 'right' });
    y += 6;
  }

  // Totals
  y += 3;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(leftX, y, rightX, y);
  y += 6;

  const moneyColX = pageWidth - 55;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', moneyColX, y, { align: 'right' });
  doc.text(money(totals.total), rightX, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', moneyColX, y, { align: 'right' });
  doc.text(money(totals.paid), rightX, y, { align: 'right' });
  y += 6;

  if (totals.balance > 0) {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', moneyColX, y, { align: 'right' });
    doc.text(money(totals.balance), rightX, y, { align: 'right' });
    doc.setTextColor(0);
    y += 6;
  }

  // Notes
  if (invoice.notes) {
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Notes: ${invoice.notes}`, leftX, y, { maxWidth: rightX - leftX });
    doc.setTextColor(0);
  }

  // Closing
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

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`POWERED BY ${BRAND.shortName}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
  doc.setTextColor(160);
  doc.text(BRAND.url, pageWidth / 2, pageHeight - 13, { align: 'center' });

  // Watermark on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawWatermark();
  }

  const filename = `invoice-${(invoice.invoice_number || invoice.invoiceNumber || invoice.id || 'invoice').toString().replace(/[^\w-]/g, '_')}.pdf`;
  doc.save(filename);
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}