import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } }, // same-origin in dev => cookies just work
  test: { environment: 'jsdom', globals: true, setupFiles: ['src/test-setup.js'], css: false, coverage: { include: ['src/**'] } },
});
