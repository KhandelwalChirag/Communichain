import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { details } from 'framer-motion/client';

export default defineConfig({
  plugins: [react()],
  root: 'src/ui',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        timeout: 5000,
        ws: true
      }
    },
    hmr: {
      overlay: true,
    }
  }
})