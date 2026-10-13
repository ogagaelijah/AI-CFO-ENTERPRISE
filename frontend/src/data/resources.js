// frontend/src/data/resources.js
// v1.2.0 — Adds first guide (Google Docs, P&L). First blog post already live.
//           PLACEHOLDER_MODE = false — hides "Subscribe on YouTube" footer.
// v1.1.0 — First real content added: Substack blog post.
// v1.0.0 — Static resource data for the landing page Resources section.
//
// To add a real resource:
//   1. Remove `isPlaceholder: true` (or just don't include it)
//   2. Fill in `url` (opens in new tab), `thumbnail` (image URL),
//      and optionally `duration` for videos
//   3. Set PLACEHOLDER_MODE = false once 2+ real items exist
//
// Blog: Substack (aicfotechnologies.substack.com)
// Videos: YouTube (@CFOTECHNOLOGIES) — when ready
// Guides: Google Docs (/preview URLs)

export const PLACEHOLDER_MODE = false;

export const RESOURCES = [
  {
    type: 'blog',
    title: 'How to Track Debtors Without Losing Your Mind',
    description: 'A practical system for Nigerian SME owners who are tired of chasing customers for money they already earned.',
    url: 'https://aicfotechnologies.substack.com/p/how-to-track-debtors-without-losing',
    thumbnail: null,
    date: '2026-10-13',
  },
  {
    type: 'guide',
    title: 'Reading Your P&L in 5 Minutes',
    description: 'A plain-English guide to the Profit & Loss statement — the 5 lines that matter, a worked example, and the 3 questions to ask every month.',
    url: 'https://docs.google.com/document/d/1Xn4dfMwaaestLsFFLuXc2mmokAzeja0t4SqJwCgRFN8/preview',
    thumbnail: null,
    date: '2026-10-13',
  },
  {
    type: 'video',
    title: 'Getting started with AI CFO Enterprise',
    description: 'A 3-minute walkthrough of setting up your business and recording your first transaction.',
    url: 'https://youtube.com/@CFOTECHNOLOGIES',
    thumbnail: null,
    duration: '3:24',
    date: '2026-10-15',
    isPlaceholder: true,
  },
];