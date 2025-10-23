import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/n8n': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
        configure: (proxy, options) => {
          console.log('Proxy configurado para:', options.target);
        }
      }
    }
  }
});
