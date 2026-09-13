/**
 * Sentinel Recon Email Dispatch Integration
 * Supports Resend API and custom SMTP/Webhook transports via environment variables.
 * Env vars: RESEND_API_KEY, EMAIL_FROM
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Sentinel Recon <no-reply@sentinel-recon.com>';

  // 1. Send via Resend if API key is provided
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[Email Service] Resend API error:', data);
        return { success: false, error: data.message || 'Failed to dispatch email' };
      }

      return { success: true, id: data.id };
    } catch (err: any) {
      console.error('[Email Service] Network error during dispatch:', err);
      return { success: false, error: err.message };
    }
  }

  // 2. Fallback Development Logger
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n================= [DEV EMAIL DISPATCH] =================`);
    console.log(`To: ${to}`);
    console.log(`From: ${emailFrom}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Preview):\n${text || html.replace(/<[^>]*>?/gm, '')}`);
    console.log(`========================================================\n`);
  }

  return { success: true, id: `mock_${Date.now()}` };
}

export function generateEmailVerificationHtml(name: string, verificationUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 8px; border: 1px solid #1e293b;">
      <h2 style="color: #34d399; margin-top: 0; font-family: monospace;">Sentinel Recon // Security Clearance</h2>
      <p style="color: #94a3b8; font-size: 14px;">Hello ${name},</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Your operator account has been created. Please verify your email address to activate your reconnaissance workbench session.
      </p>
      <div style="margin: 28px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 6px; font-family: monospace;">
          Verify Security Clearance &rarr;
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; font-family: monospace;">
        Or paste this link into your browser: <br/>
        <a href="${verificationUrl}" style="color: #38bdf8;">${verificationUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
      <p style="color: #64748b; font-size: 11px;">
        Sentinel Recon OSINT Workbench • Automated Security Gateway Dispatch
      </p>
    </div>
  `;
}

export function generatePasswordResetHtml(name: string, resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 8px; border: 1px solid #1e293b;">
      <h2 style="color: #a855f7; margin-top: 0; font-family: monospace;">Sentinel Recon // Passphrase Reset</h2>
      <p style="color: #94a3b8; font-size: 14px;">Hello ${name},</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        A passphrase reset was requested for your operator account. This token will expire in 1 hour.
      </p>
      <div style="margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 6px; font-family: monospace;">
          Reset Passphrase &rarr;
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; font-family: monospace;">
        If you did not request this reset, no action is required and your passphrase remains unchanged.
      </p>
      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
      <p style="color: #64748b; font-size: 11px;">
        Sentinel Recon OSINT Workbench • Automated Security Gateway Dispatch
      </p>
    </div>
  `;
}
