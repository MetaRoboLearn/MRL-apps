import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    // Suppress expected "client disconnected mid-stream" noise from the
    // WebSocket proxy (camera feed, hot-reload, navigation, etc.).
    {
      name: 'suppress-ws-proxy-noise',
      configureServer(server) {
        const NOISE = /ECONNABORTED|ECONNRESET|EPIPE|ETIMEDOUT/;
        const orig = server.config.logger.error.bind(server.config.logger);
        server.config.logger.error = (msg, opts) => {
          if (typeof msg === 'string' && msg.includes('ws proxy') && NOISE.test(msg)) return;
          orig(msg, opts);
        };
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
      '/static': 'http://localhost:5000',
    }
  },
  preview: {
    port: 3000,
    host: true,
  }
})

