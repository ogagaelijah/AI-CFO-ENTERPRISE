// src/infrastructure/services/email/templates/teamInvite.js
// v1.0.0-prod — Team invitation email. Matches the visual style of
//               verifyEmail.js and resetPassword.js.

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  ACCOUNTANT: 'Accountant',
};

const buildTeamInviteEmail = ({ businessName, inviterName, role, acceptUrl, expiresAt }) => {
  const roleLabel = ROLE_LABELS[role] || role;
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subject = `${inviterName} invited you to join ${businessName} on AI CFO Enterprise`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a202c;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a365d;padding:32px 40px;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                AI CFO <span style="color:#dfa333;">ENTERPRISE</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1a202c;">
                You've been invited
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#2d3748;">
                <strong>${inviterName}</strong> has invited you to join
                <strong>${businessName}</strong> on AI CFO Enterprise as a
                <strong>${roleLabel}</strong>.
              </p>

              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#2d3748;">
                AI CFO Enterprise helps businesses track sales, inventory, debtors,
                and profits — with real CFO-level analysis built in.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 24px 0;">
                    <a href="${acceptUrl}"
                       style="display:inline-block;padding:14px 32px;background-color:#1a365d;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#4a5568;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:#4a5568;word-break:break-all;">
                <a href="${acceptUrl}" style="color:#1a365d;text-decoration:underline;">
                  ${acceptUrl}
                </a>
              </p>

              <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;" />

              <p style="margin:0;font-size:13px;line-height:1.6;color:#718096;">
                This invitation expires on <strong>${expiryDate}</strong>.
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f7fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#718096;text-align:center;">
                AI CFO Enterprise — Built for African SMEs<br />
                <a href="https://aicfotechnologies.com" style="color:#1a365d;text-decoration:none;">
                  aicfotechnologies.com
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
You've been invited to ${businessName} on AI CFO Enterprise

${inviterName} has invited you to join ${businessName} as a ${roleLabel}.

Accept the invitation:
${acceptUrl}

This invitation expires on ${expiryDate}.
If you didn't expect this invitation, you can safely ignore this email.

AI CFO Enterprise — Built for African SMEs
https://aicfotechnologies.com
  `.trim();

  return { subject, html, text };
};

module.exports = buildTeamInviteEmail;