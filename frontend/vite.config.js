// frontend/vite.config.js
// v1.2.0 — Adds explicit chunks for @sentry, @supabase, date-fns.
//           Breaks up the oversized vendor catch-all.
// v1.1.0 — Adds manual chunk configuration for route-level code splitting.
// v1.0.0 — Initial.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Allow chunks up to 800 KB before warning. We've manually split the
    // heavy libs, so remaining warnings are genuine signals.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React runtime + router — changes rarely, cache aggressively
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Charts — only used on Analytics, Forecast
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          // PDF generation — only used on export
          if (id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/jspdf')) {
            return 'vendor-pdf';
          }
          // Sentry — error tracking, own chunk for cacheability
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }
          // Supabase client — medium, stable
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-dates';
          }
          // Icons — used everywhere, stable
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          // Everything else in node_modules
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          // App code splits automatically per route via React.lazy
        },
      },
    },
  },
});