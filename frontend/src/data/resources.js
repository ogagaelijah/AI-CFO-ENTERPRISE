
 // frontend/src/data/resources.js
// v1.6.0 — Improves resource descriptions for clarity, relevance and SEO.
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
    description:
      'Discover practical articles on financial management, business performance, cash flow, profitability and smarter decision-making for African SME owners.',
    url: 'https://aicfotechnologies.substack.com',
    thumbnail: null,
    date: '2026-10-13',
  },
  {
    type: 'guide',
    title: 'AI CFO Guides',
    description:
      'Explore practical, plain-English guides to financial reports, Profit and Loss, cash flow and other essential business management topics.',
    url: 'https://drive.google.com/drive/folders/1_R-gkThoTaWf16h7i0SY27P9Dz6vbrtI?ths=true',
    thumbnail: null,
    date: '2026-10-13',
  },
  {
    type: 'video',
    title: 'AI CFO Video Library',
    description:
      'Watch tutorials and product walkthroughs to learn how to use AI CFO Enterprise for sales tracking, inventory management, financial reporting and business insights.',
    url: 'https://youtube.com/@CFOTECHNOLOGIES',
    thumbnail: null,
    duration: 'Channel',
    date: '2026-10-15',
  },
];
