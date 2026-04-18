import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../../frontend'),
  resolve: {
    alias: {
      '@sudoku-fighting/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  define: {
    // VITE_NATIVE=true is set when building for Capacitor (iOS/Android).
    // Native builds must use the production WS directly — localhost doesn't exist on device.
    __WS_URL__: JSON.stringify(
      process.env.VITE_WS_URL ??
      process.env.WS_URL ??
      (process.env.VITE_NATIVE === 'true' ? 'wss://sudoku-fighting-backend.fly.dev/ws' : null)
    ),
  },
});
