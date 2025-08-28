import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In dev, forward API + websocket calls to the backend
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, ws: true, changeOrigin: true },
    },
  },
});
