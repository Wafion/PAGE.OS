import { promises as fs } from 'fs';
import path from 'path';

export interface FeedbackNotificationPayload {
  id: string;
  category: string;
  categoryLabel: string;
  subject: string;
  message: string;
  email: string | null;
  submittedAt: string;
  ip?: string;
  userAgent?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; colorHex: string; colorInt: number }> = {
  suggestion: { label: 'Ideas & Features', emoji: '💡', colorHex: '#FBBF24', colorInt: 16500516 },
  bug_report: { label: 'Bug Report', emoji: '🐛', colorHex: '#EF4444', colorInt: 15680580 },
  feedback: { label: 'General Feedback', emoji: '💬', colorHex: '#3B82F6', colorInt: 3900150 },
  just_saying_hi: { label: 'Just Saying Hi', emoji: '👋', colorHex: '#A855F7', colorInt: 11032055 },
  other: { label: 'Other / Miscellaneous', emoji: '📁', colorHex: '#6B7280', colorInt: 7041664 },
};

export function getCategoryMeta(category: string) {
  return CATEGORY_LABELS[category] || {
    label: category.replace(/_/g, ' ').toUpperCase(),
    emoji: '✉️',
    colorHex: '#0052FF',
    colorInt: 21247,
  };
}

/**
 * Dispatch feedback notifications across all configured channels:
 * 1. Email (via Resend REST API)
 * 2. Discord Webhook
 * 3. Telegram Bot
 * 4. Generic Webhook (Zapier/Make/Formspree)
 * 5. Local inbox file (data/feedback-inbox.jsonl)
 */
export async function dispatchFeedbackNotifications(payload: FeedbackNotificationPayload): Promise<{
  channelsNotified: string[];
  errors: Record<string, string>;
}> {
  const meta = getCategoryMeta(payload.category);
  const channelsNotified: string[] = [];
  const errors: Record<string, string> = {};

  const promises: Promise<void>[] = [];

  // 1. Local persistent file inbox (data/feedback-inbox.jsonl)
  promises.push(
    (async () => {
      try {
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });
        const filePath = path.join(dataDir, 'feedback-inbox.jsonl');
        const line = JSON.stringify({ ...payload, meta }) + '\n';
        await fs.appendFile(filePath, line, 'utf-8');
        channelsNotified.push('local_file');
      } catch (err: any) {
        errors.local_file = err?.message || 'Failed to write to local inbox';
      }
    })()
  );

  const subjectTitle = payload.subject ? ` - ${payload.subject}` : '';
  const emailSubject = `[PAGE.OS] ${meta.emoji} ${meta.label}${subjectTitle}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0d0d0d; color: #ececec; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #161616; border: 1px solid #282828; border-radius: 8px; overflow: hidden; }
    .header { background: #0052FF; color: #ffffff; padding: 18px 24px; font-weight: bold; font-size: 16px; letter-spacing: 0.05em; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; background: ${meta.colorHex}22; color: ${meta.colorHex}; border: 1px solid ${meta.colorHex}55; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .content { padding: 24px; }
    .row { margin-bottom: 14px; font-size: 14px; }
    .label { color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
    .value { color: #f0f0f0; }
    .message-box { background: #0a0a0a; border: 1px solid #222222; border-radius: 6px; padding: 16px; white-space: pre-wrap; font-family: monospace; font-size: 13px; line-height: 1.5; color: #e5e5e5; margin-top: 8px; }
    .footer { padding: 16px 24px; border-top: 1px solid #222222; font-size: 11px; color: #666666; text-align: right; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">PAGE.OS / MESSAGE TO THE DEVELOPER</div>
    <div class="content">
      <div class="badge">${meta.emoji} ${meta.label}</div>
      ${payload.subject ? `<div class="row"><div class="label">Subject</div><div class="value" style="font-weight: 600; font-size: 16px;">${escapeHtml(payload.subject)}</div></div>` : ''}
      <div class="row">
        <div class="label">From</div>
        <div class="value">${payload.email ? `<a href="mailto:${escapeHtml(payload.email)}" style="color: #60a5fa; text-decoration: none;">${escapeHtml(payload.email)}</a>` : '<span style="color: #888;">Anonymous Reader</span>'}</div>
      </div>
      <div class="row">
        <div class="label">Message</div>
        <div class="message-box">${escapeHtml(payload.message)}</div>
      </div>
    </div>
    <div class="footer">Received on ${new Date(payload.submittedAt).toLocaleString()} UTC · ID: ${payload.id}</div>
  </div>
</body>
</html>
  `.trim();

  // 2. Email via Resend REST API (zero npm dependencies, pure fetch)
  const resendApiKey = process.env.RESEND_API_KEY;
  const recipientEmail = process.env.FEEDBACK_RECIPIENT_EMAIL || 'pageos.help@gmail.com';
  if (resendApiKey) {
    promises.push(
      (async () => {
        try {
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'PAGE.OS Feedback <onboarding@resend.dev>';
          let res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipientEmail],
              reply_to: payload.email || undefined,
              subject: emailSubject,
              html: htmlBody,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            let errJson: any = null;
            try {
              errJson = JSON.parse(errText);
            } catch {}

            // If Resend free tier restricts sandbox sending to the account owner's email
            const match = errJson?.message?.match(/only send testing emails to your own email address \(([^)]+)\)/);
            if (match && match[1] && match[1] !== recipientEmail) {
              const fallbackEmail = match[1];
              console.log(`[Resend] Sandbox mode: delivering to account owner ${fallbackEmail} (intended for ${recipientEmail})`);
              const retryRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: fromEmail,
                  to: [fallbackEmail],
                  reply_to: payload.email || undefined,
                  subject: `[FOR: ${recipientEmail}] ${emailSubject}`,
                  html: htmlBody,
                }),
              });

              if (retryRes.ok) {
                channelsNotified.push(`email_resend (routed to ${fallbackEmail})`);
                return;
              }
            }

            throw new Error(`Resend HTTP ${res.status}: ${errText}`);
          }
          channelsNotified.push('email_resend');
        } catch (err: any) {
          errors.email_resend = err?.message || 'Failed to send email via Resend';
        }
      })()
    );
  }

  // 3. Discord Webhook (instant push notifications to phone/desktop)
  const discordWebhookUrl = process.env.FEEDBACK_DISCORD_WEBHOOK_URL;
  if (discordWebhookUrl) {
    promises.push(
      (async () => {
        try {
          const embed = {
            title: `📬 New Message to the Developer`,
            color: meta.colorInt,
            fields: [
              { name: 'Category', value: `${meta.emoji} **${meta.label}**`, inline: true },
              { name: 'From', value: payload.email ? `\`${payload.email}\`` : '_Anonymous_', inline: true },
              ...(payload.subject ? [{ name: 'Subject', value: payload.subject, inline: false }] : []),
              {
                name: 'Message',
                value: payload.message.length > 1000 ? payload.message.slice(0, 997) + '...' : payload.message,
                inline: false,
              },
            ],
            footer: { text: `PAGE.OS Feedback · ID: ${payload.id}` },
            timestamp: payload.submittedAt,
          };

          const res = await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'PAGE.OS Dispatch',
              avatar_url: 'https://placehold.co/128x128/0052FF/FFFFFF.png?text=PAGE.OS',
              embeds: [embed],
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Discord HTTP ${res.status}: ${errBody}`);
          }
          channelsNotified.push('discord_webhook');
        } catch (err: any) {
          errors.discord_webhook = err?.message || 'Failed to post to Discord webhook';
        }
      })()
    );
  }

  // 4. Telegram Bot (optional instant push notification)
  const telegramBotToken = process.env.FEEDBACK_TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.FEEDBACK_TELEGRAM_CHAT_ID;
  if (telegramBotToken && telegramChatId) {
    promises.push(
      (async () => {
        try {
          const text = [
            `*📬 PAGE.OS — Message to the Developer*`,
            `*Category:* ${meta.emoji} ${meta.label}`,
            payload.subject ? `*Subject:* ${payload.subject}` : null,
            `*From:* ${payload.email ? `\`${payload.email}\`` : 'Anonymous'}`,
            ``,
            `*Message:*`,
            payload.message,
          ]
            .filter(Boolean)
            .join('\n');

          const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text,
              parse_mode: 'Markdown',
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Telegram HTTP ${res.status}: ${errBody}`);
          }
          channelsNotified.push('telegram_bot');
        } catch (err: any) {
          errors.telegram_bot = err?.message || 'Failed to send to Telegram bot';
        }
      })()
    );
  }

  // 5. Generic Webhook (Zapier, Make, Slack, or Formspree forwarder)
  const genericWebhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
  if (genericWebhookUrl) {
    promises.push(
      (async () => {
        try {
          const res = await fetch(genericWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'feedback.received',
              data: {
                ...payload,
                meta,
              },
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Generic Webhook HTTP ${res.status}: ${errBody}`);
          }
          channelsNotified.push('generic_webhook');
        } catch (err: any) {
          errors.generic_webhook = err?.message || 'Failed to post to generic webhook';
        }
      })()
    );
  }

  await Promise.allSettled(promises);

  // Terminal notification in development / server logs so developer sees it immediately
  console.log('\n' + '─'.repeat(60));
  console.log(`📬 [PAGE.OS] NEW MESSAGE TO THE DEVELOPER (${meta.emoji} ${meta.label})`);
  console.log(`From:    ${payload.email || 'Anonymous'}`);
  if (payload.subject) console.log(`Subject: ${payload.subject}`);
  console.log(`Message: ${payload.message}`);
  console.log(`Dispatched to: ${channelsNotified.join(', ') || 'none'}`);
  if (Object.keys(errors).length > 0) {
    console.warn(`Channel warnings:`, errors);
  }
  console.log('─'.repeat(60) + '\n');

  return { channelsNotified, errors };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
