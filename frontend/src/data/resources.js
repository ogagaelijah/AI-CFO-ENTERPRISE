// frontend/src/data/resources.js
// v1.0.0 — Static resource data for the landing page Resources section.
//           Placeholder mode until real content exists.
//
// To add a real resource:
//   1. Set `isPlaceholder: false` on the item (or remove the flag entirely)
//   2. Fill in `url` (opens in new tab), `thumbnail` (image URL),
//      and optionally `duration` for videos
//   3. Set `PLACEHOLDER_MODE = false` below once 3+ real items exist
//
// Blog posts live on Hashnode. When a post is published, add its URL here.
// Videos will live on YouTube (@CFOTECHNOLOGIES).

export const PLACEHOLDER_MODE = true;

export const RESOURCES = [
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
  {
    type: 'blog',
    title: 'How to track debtors without losing your mind',
    description: 'A practical guide for Nigerian SME owners on managing who owes you and when to follow up.',
    url: '#',
    thumbnail: null,
    date: '2026-10-20',
    isPlaceholder: true,
  },
  {
    type: 'guide',
    title: 'Reading your P&L in 5 minutes',
    description: 'What the numbers mean, what to look for, and the three metrics every business owner should watch.',
    url: '#',
    thumbnail: null,
    date: '2026-10-25',
    isPlaceholder: true,
  },
];