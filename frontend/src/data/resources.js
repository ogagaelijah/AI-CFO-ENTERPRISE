// frontend/src/data/resources.js
// v1.5.0 — Updated titles to point to channel hubs (Blog, Guides, Video Library).
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

export const PLACEHOLDER_MODE = false;

export const RESOURCES = [
  {
    type: 'blog',
    title: 'AI CFO Blog',
    description: 'Practical financial advice, systems, and tips for African SME owners. Read all our latest articles on Substack.',
    url: 'https://aicfotechnologies.substack.com',
    thumbnail: null,
    date: '2026-10-13',
  },
  {
    type: 'guide',
    title: 'AI CFO Guides',
    description: 'Plain-English guides to Profit & Loss, Cash Flow, and more. Explore our full collection of documents.',
    url: 'https://drive.google.com/drive/folders/1_R-gkThoTaWf16h7i0SY27P9Dz6vbrtI?ths=true',
    thumbnail: null,
    date: '2026-10-13',
  },
  {
    type: 'video',
    title: 'AI CFO Video Library',
    description: 'Explore our full collection of tutorials, walkthroughs, and tips to get the most out of AI CFO Enterprise.',
    url: 'https://youtube.com/@CFOTECHNOLOGIES',
    thumbnail: null,
    duration: 'Channel',
    date: '2026-10-15',
  },
];