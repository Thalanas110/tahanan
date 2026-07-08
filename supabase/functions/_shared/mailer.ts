// mailer.ts — Gmail SMTP helper for Tahanan Edge Functions
// Uses npm:nodemailer (Deno npm compat). Reads GMAIL_EMAIL and GMAIL_PASSWORD
// from Supabase Edge Function secrets (set via `supabase secrets set`).
import { createTransport } from 'npm:nodemailer@6';

export interface SosEmailOptions {
  partnerEmail: string;
  partnerName: string;
  triggerName: string;
  message?: string | null;
  locationNote?: string | null;
  triggeredAt: string;
}

function buildSosHtml(opts: SosEmailOptions): string {
  const time = new Date(opts.triggeredAt).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const messageBlock = opts.message
    ? `<div style="background:#fff3f3;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Message</p>
        <p style="margin:6px 0 0;font-size:16px;color:#111827;">"${opts.message}"</p>
       </div>`
    : '';

  const locationBlock = opts.locationNote
    ? `<div style="display:flex;align-items:flex-start;gap:8px;background:#fefce8;border:1px solid #fde68a;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <span style="font-size:18px;">📍</span>
        <p style="margin:0;font-size:15px;color:#374151;">${opts.locationNote}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#dc2626;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:36px;">🚨</p>
            <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:.01em;">SOS ALERT</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#fecaca;">${opts.triggerName} needs you right now</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0;font-size:15px;color:#374151;">Hey <strong>${opts.partnerName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.6;">
              <strong>${opts.triggerName}</strong> has triggered an SOS emergency alert on <strong>Tahanan</strong> at <strong>${time}</strong>.
              Open the app immediately to acknowledge and respond.
            </p>

            ${messageBlock}
            ${locationBlock}

            <!-- CTA -->
            <div style="text-align:center;margin:28px 0 8px;">
              <a href="https://rcdadlaqdvjgewbfittf.supabase.co" style="display:inline-block;background:#dc2626;color:#fff;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;letter-spacing:.01em;">
                Open Tahanan App →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">This alert was sent automatically by Tahanan 🏠</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">If this was a mistake, resolve the alert inside the app.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSosEmail(opts: SosEmailOptions): Promise<void> {
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailPass = Deno.env.get('GMAIL_PASSWORD');

  if (!gmailUser || !gmailPass) {
    throw new Error('GMAIL_USER or GMAIL_PASSWORD secret is not set');
  }

  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,        // SSL (not STARTTLS)
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  await transporter.sendMail({
    from: `"Tahanan 🏠" <${gmailUser}>`,
    to: opts.partnerEmail,
    subject: `🚨 SOS from ${opts.triggerName} — Tahanan`,
    html: buildSosHtml(opts),
  });
}
