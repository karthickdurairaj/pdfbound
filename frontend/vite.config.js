import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server on :3000 proxies /api to the Vert.x backend on :8080,
// so the frontend code can just call fetch('/api/...') in dev and
// in Docker (where nginx does the same proxying).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  preview: { port: 3000 },
});
