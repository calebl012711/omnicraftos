import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  preview: {
    port: 4173
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true
  },
  test: {
    include: ['src/__tests__/**/*.test.ts']
  }
});
