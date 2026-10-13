import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({ jsxImportSource: 'emoji-jsx' })],
  resolve: { alias: { '@': path.resolve(__dirname, './src'), 'emoji-jsx': path.resolve(__dirname, './src/lib/emoji-jsx') } },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
