import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
  const wsTarget = env.VITE_WS_URL || apiTarget.replace(/^http/, 'ws')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: Number(env.VITE_PORT) || 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: wsTarget,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code)) {
                return;
              }
              console.warn('[vite proxy error]', err?.message || err);
            });
            proxy.on('proxyReqWs', (_proxyReq: any, _req: any, socket: any) => {
              socket.on('error', (err: any) => {
                if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code)) {
                  return;
                }
                console.warn('[vite ws socket error]', err?.message || err);
              });
            });
          }
        }
      }
    }
  }
})

