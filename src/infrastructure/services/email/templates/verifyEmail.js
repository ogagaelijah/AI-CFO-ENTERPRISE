// src/infrastructure/services/email/templates/verifyEmail.js
// v1.0.0 — Verification email HTML + plain-text fallback.

const GOLD = '#E5A823';
const DARK = '#0f172a';
const MUTED = '#64748b';

function buildVerificationEmail({ fullName, verifyUrl, expiresInHours = 24 }) {
  const firstName = (fullName || 'there').split(' ')[0];
  const subject = 'Verify your email for AI CFO Enterprise';

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
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 16px;">
              <div style="font-size:22px;font-weight:700;color:${DARK};letter-spacing:-0.02em;">
                AI CFO <span style="color:${GOLD};">ENTERPRISE</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 32px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${DARK};font-weight:600;">
                Confirm your email address
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Thanks for signing up for AI CFO Enterprise. Please confirm this is your email address by clicking the button below.
              </p>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius:8px;background:${GOLD};">
                    <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0f172a;text-decoration:none;border-radius:8px;">
                      Verify email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
                This link expires in ${expiresInHours} hours.
              </p>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${verifyUrl}" style="color:${GOLD};text-decoration:underline;">${verifyUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px;">

              <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
                If you didn't create an account with AI CFO Enterprise, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
                AI CFO Enterprise &middot; Built for African SMEs
              </p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
                Need help? Email <a href="mailto:support@aicfotechnologies.com" style="color:${GOLD};text-decoration:none;">support@aicfotechnologies.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Confirm your email address

Hi ${firstName},

Thanks for signing up for AI CFO Enterprise. Please confirm this is your email address by opening the link below:

${verifyUrl}

This link expires in ${expiresInHours} hours.

If you didn't create an account with AI CFO Enterprise, you can safely ignore this email.

---
AI CFO Enterprise — Built for African SMEs
Need help? support@aicfotechnologies.com`;

  return { subject, html, text };
}

module.exports = buildVerificationEmail;