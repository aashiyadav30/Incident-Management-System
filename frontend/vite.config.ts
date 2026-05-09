import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(new URL('.', import.meta.url).pathname, './src') },
  },
  server: {
    port: 5173,
    // Proxy /api calls to backend — avoids CORS issues in dev
    proxy: {
      '/api':    { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});