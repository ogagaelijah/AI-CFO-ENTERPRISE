// src/infrastructure/services/email/templates/receipt.js
// v1.0.0 — Payment receipt email HTML + plain-text fallback.

const GOLD = '#E5A823';
const DARK = '#0f172a';
const MUTED = '#64748b';

function formatNaira(amount) {
  if (typeof amount !== 'number') return '₦0';
  return '₦' + amount.toLocaleString('en-NG');
}

function buildReceiptEmail({
  fullName,
  amount,
  planName,
  paymentReference,
  paidAt,
  nextBillingDate,
  invoiceUrl,
}) {
  const firstName = (fullName || 'there').split(' ')[0];
  const subject = `Payment receipt — ${planName}`;
  const paidDate = paidAt
    ? new Date(paidAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:32px 32px 16px;">
              <div style="font-size:22px;font-weight:700;color:${DARK};letter-spacing:-0.02em;">
                AI CFO <span style="color:${GOLD};">ENTERPRISE</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${DARK};font-weight:600;">
                Payment received
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Thank you — your payment for AI CFO Enterprise ${planName} was successful.
              </p>

              <!-- Receipt box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:${MUTED};">Plan</td>
                        <td style="padding:6px 0;font-size:14px;color:${DARK};text-align:right;font-weight:600;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:${MUTED};">Amount</td>
                        <td style="padding:6px 0;font-size:14px;color:${DARK};text-align:right;font-weight:600;">${formatNaira(amount)}</td>
                      </tr>
                      ${
                        paidDate
                          ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:${MUTED};">Paid on</td>
                        <td style="padding:6px 0;font-size:14px;color:${DARK};text-align:right;">${paidDate}</td>
                      </tr>`
                          : ''
                      }
                      ${
                        paymentReference
                          ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:${MUTED};">Reference</td>
                        <td style="padding:6px 0;font-size:14px;color:${DARK};text-align:right;font-family:monospace;font-size:13px;">${paymentReference}</td>
                      </tr>`
                          : ''
                      }
                      ${
                        nextBillingDate
                          ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:${MUTED};border-top:1px solid #e2e8f0;">Next billing</td>
                        <td style="padding:6px 0;font-size:14px;color:${DARK};text-align:right;border-top:1px solid #e2e8f0;">${nextBillingDate}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              ${
                invoiceUrl
                  ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:${GOLD};">
                    <a href="${invoiceUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0f172a;text-decoration:none;border-radius:8px;">
                      View invoice
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px;">

              <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
                This is a transactional receipt for your records. You don't need to reply to this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
                AI CFO Enterprise &middot; Built for African SMEs
              </p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
                Questions? Email <a href="mailto:support@aicfotechnologies.com" style="color:${GOLD};text-decoration:none;">support@aicfotechnologies.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Payment received

Hi ${firstName},

Thank you — your payment for AI CFO Enterprise ${planName} was successful.

Plan: ${planName}
Amount: ${formatNaira(amount)}
${paidDate ? `Paid on: ${paidDate}` : ''}
${paymentReference ? `Reference: ${paymentReference}` : ''}
${nextBillingDate ? `Next billing: ${nextBillingDate}` : ''}

${invoiceUrl ? `View invoice: ${invoiceUrl}` : ''}

This is a transactional receipt for your records. You don't need to reply to this email.

---
AI CFO Enterprise — Built for African SMEs
Questions? support@aicfotechnologies.com`;

  return { subject, html, text };
}

module.exports = buildReceiptEmail;