import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const api = `http://127.0.0.1:${mode === 'browser-test' ? 3101 : 3001}`;
  return {
    plugins: [react()],
    server: {
      port: mode === 'browser-test' ? 5273 : 5173,
      strictPort: true,
      proxy: {
        '/api': api,
        '/auth': { target: api, changeOrigin: false },
        '/health': api,
        '/ws': { target: api.replace('http:', 'ws:'), ws: true },
      },
    },
  };
});
