// mobile/src/utils/shareReceipt.js
// v1.3.0-prod — Fixes WhatsApp text wrapping. Ensures prices stay on the same line.
//              Makes "Thank you" bold.

import { Share, Alert } from 'react-native';

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const buildItemLine = (item) => {
  const qty = Number(item.quantity) || 0;
  const sell = Number(item.sellingPrice ?? item.unitPrice ?? 0);
  const total = qty * sell;
  const multiplier = Number(item.unitMultiplier) || 1;
  
  // Format: Item Name (Qty x) ....... Price
  let name = item.name;
  if (multiplier > 1) {
    name += ` (${item.soldUnit || `${multiplier} units`})`;
  }
  
  // Truncate name if too long to keep alignment
  if (name.length > 22) name = name.substring(0, 19) + '...';
  
  // Align columns using spaces (adjusted widths for mobile)
  const leftCol = `${name}`.padEnd(20, ' '); // Shorter width
  const qtyCol = `${qty}x`.padStart(4, ' ');
  const totalCol = formatMoney(total).padStart(11, ' ');
  
  return `${leftCol}${qtyCol}${totalCol}`;
};

export const buildReceiptText = (sale, options = {}) => {
  if (!sale) return '';

  const businessName = options.businessName || 'AI CFO ENTERPRISE';
  const items = sale.items || [];
  
  const total = Number(sale.total_price) || 0;
  const paid = Number(sale.amount_paid) || 0;
  const balance = Number(sale.balance_remaining) || Math.max(0, total - paid);
  
  const lineItems = items.map(buildItemLine).join('\n');
  
  const lines = [
    `*${businessName.toUpperCase()}*`,
    `--------------------------------`,
    `Receipt No: ${sale.invoice_no || `#${sale.id}`}`,
    `Date: ${formatDate(sale.sale_date)}`,
    `Customer: ${sale.customer_name || 'Walk-in'}`,
    `Status: ${sale.payment_status || '—'}`,
    `--------------------------------`,
    `*ITEMS PURCHASED*`,
    lineItems || '(no items)',
    `--------------------------------`,
    `*Total:*          ${formatMoney(total).padStart(10, ' ')}`,
    `*Paid:*           ${formatMoney(paid).padStart(10, ' ')}`,
  ];

  if (balance > 0) {
    lines.push(`*Balance Due:*    ${formatMoney(balance).padStart(10, ' ')}`);
  } else {
    lines.push(`*Fully Paid* ✓`);
  }

  if (sale.notes) {
    lines.push(`--------------------------------`);
    lines.push(`Notes: ${sale.notes}`);
  }

  lines.push(`--------------------------------`);
  lines.push(`*Thank you for your patronage!*`);
  lines.push(`*We appreciate your business.*`);
  
  return lines.join('\n');
};

export const shareReceipt = async (sale, options = {}) => {
  try {
    const text = buildReceiptText(sale, options);
    if (!text) {
      Alert.alert('Error', 'Could not build receipt');
      return;
    }

    await Share.share({
      message: text,
      title: `Receipt ${sale.invoice_no || sale.id}`,
    });
  } catch (error) {
    console.error('Share receipt failed:', error.message);
    Alert.alert('Error', 'Could not share receipt. Please try again.');
  }
};