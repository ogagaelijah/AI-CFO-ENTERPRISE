// frontend/vite.config.js
// v1.4.0 — Removes catch-all vendor rule to allow Vite to naturally split chunks by route.
// v1.3.0 — Removes manual vendor-pdf chunk to allow proper lazy-loading.
// v1.2.0 — Adds explicit chunks for @sentry, @supabase, date-fns.
// v1.1.0 — Adds manual chunk configuration for route-level code splitting.
// v1.0.0 — Initial.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep the generated preload helper out of application vendor chunks.
          if (id.includes('vite/preload-helper')) {
            return 'vendor-runtime';
          }

          // React runtime + router
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }

          // Charts
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }

          // Sentry
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }

          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }

          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-dates';
          }

          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
});