import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep relative AudioWorklet URLs relative to the actual upstream package in development.
  optimizeDeps: { exclude: ['@waveform-playlist/worklets'] },
  server: {
    port: 5173,
    watch: { ignored: ['**/upstream/**', '**/brag-output/**', '**/design/**', '**/verification/**'] },
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
