// src/interfaces/http/routes/chatRoutes.js
// POST /api/chat — DeepSeek-backed FAQ assistant.
// Grounded strictly in the FAQ text below. No data access, no auth required.

const express = require('express');
const router = express.Router();

// ---- FAQ grounding text (single source of truth for the bot) ----
const FAQ_TEXT = `
AI CFO Enterprise — FAQ

WHAT IT DOES
AI CFO Enterprise helps African SMEs track sales, inventory, debtors, and profits in one place. It automatically builds P&L, Cash Flow, Balance Sheet, and executive summaries, forecasts future revenue, and gives AI-powered recommendations.

WHO IT IS FOR
Built for African SMEs. Live industries: Retail/Wholesale, Construction, Consultancy/Services, Education, NGO/Non-Profit. Coming soon: Manufacturing, Healthcare, Real Estate, Logistics.

DIFFERENCE FROM ACCOUNTING SOFTWARE
Traditional software assumes you know accounting. AI CFO assumes you know your business. You record sales, expenses, and payments in plain language; the system handles accounting logic and explains results in plain English. No accounting knowledge required.

FEATURES
Track: sales & income, inventory & stock, debtors, creditors, expenses, invoices, customer payments, projects, time entries, donations, pledges.
Reports: daily/weekly/monthly/yearly with profit margins; P&L, Cash Flow, Balance Sheet, executive summaries; printable and downloadable as PDF.
Forecasting & AI: projects revenue and cash position based on history, then gives plain-language recommendations.
Invoices and student fee receipts can be printed or downloaded as PDF.

INDUSTRIES
Live: Retail/Wholesale, Construction, Consultancy/Services, Education, NGO/Non-Profit.
Coming soon: Manufacturing, Healthcare, Real Estate, Logistics (total 9).

PRICING
Basic — NGN 2,500/month — for small businesses getting organized.
Pro — NGN 4,500/month — full intelligence for growing businesses (most popular).
Enterprise — NGN 10,500/month — everything, unlimited, with dedicated support.
All paid plans include a 14-day free trial with full Pro access. No card required. Cancel anytime.
Annual billing saves 17%.
All plans include: sales & income tracking, inventory management, debtors & creditors, daily/weekly/monthly reports, P&L, Cash Flow, Balance Sheet.
Pro adds: forecasting, AI recommendations, executive reports.
Enterprise adds: unlimited usage, dedicated support, everything in Pro.
You can switch plans anytime. Trial end does not delete data.

DATA & SECURITY
Stored on Supabase (managed Postgres) with encryption in transit and at rest. Data is not sold, rented, or monetised. Only you and explicitly invited team members can see your data. Regular backups. If you stop paying, data stays intact and exportable; paid features pause.

GETTING STARTED
Setup under 5 minutes. No need to import old records — you can start fresh or enter opening balances. Team members can be invited with role-based access. Available on web and Telegram bot today; dedicated mobile app coming after public launch.
Support email: support@aicfotechnologies.com

PAYMENTS
Processed by Paystack (PCI-DSS compliant). Card details are never stored on our servers.
`.trim();

const SYSTEM_PROMPT = `You are the AI CFO Enterprise assistant on the marketing site.

STRICT RULES:
1. Answer ONLY using the FAQ text provided below.
2. If the answer is not in the FAQ, reply exactly: "I don't have that information. Please email support@aicfotechnologies.com."
3. Never invent pricing, features, dates, or commitments.
4. Never give financial, tax, or legal advice.
5. Keep answers short (2–4 sentences), friendly, and plain-English.
6. Do not use markdown headers. Plain sentences only.

FAQ:
${FAQ_TEXT}`;

// ---- Simple in-memory rate limit (10 requests/min per IP) ----
const rateBuckets = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function rateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

router.post('/', async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute or email support@aicfotechnologies.com.',
      });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message is too long.' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[chat] DEEPSEEK_API_KEY is not set');
      return res.status(500).json({ error: 'Chat is not configured.' });
    }

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message.trim() },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text();
      console.error('[chat] DeepSeek error:', dsRes.status, errText);
      return res.status(502).json({
        error: 'Chat service is temporarily unavailable. Please email support@aicfotechnologies.com.',
      });
    }

    const data = await dsRes.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I don't have that information. Please email support@aicfotechnologies.com.";

    return res.json({ reply });
  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return res.status(500).json({
      error: 'Something went wrong. Please email support@aicfotechnologies.com.',
    });
  }
});

module.exports = router;