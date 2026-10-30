// mobile/src/utils/shareReceipt.js
// v1.4.1-prod — Fixes pack name rendering on shared receipts.

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
  
  let displayName = item.name;
  
  // If a pack name exists and isn't the default, show "0.5 Half of Milo"
  if (item.soldUnit && item.soldUnit !== 'Piece' && item.soldUnit !== 'None') {
    displayName = `${qty} ${item.soldUnit} of ${item.name}`;
  } else {
    displayName = `${qty} ${item.name}`;
  }
  
  // Truncate name if too long to keep alignment
  if (displayName.length > 20) displayName = displayName.substring(0, 17) + '...';
  
  // Align columns using spaces
  const leftCol = `${displayName}`.padEnd(22, ' '); 
  const totalCol = formatMoney(total).padStart(11, ' ');
  
  return `${leftCol}${totalCol}`;
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