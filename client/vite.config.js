import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'client',
  plugins: [react(), {
    name: 'okoc-dev-route',
    configureServer(server) {
      return () => server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (pathname === '/dev' || pathname === '/dev/') req.url = '/dev.html';
        next();
      });
    }
  }],
  server: {
    fs: {allow: [path.resolve(process.cwd())]},
    proxy: {
      '/api/rooms': {target: 'http://localhost:10000', changeOrigin: true},
      '/api/dev-standalone': {target: 'http://localhost:10000', changeOrigin: true},
      '/api': {target: 'http://localhost:10000', changeOrigin: true},
      '/ws': {target: 'ws://localhost:10000', ws: true}
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'client/index.html'),
        dev: path.resolve(process.cwd(), 'client/dev.html')
      }
    }
  },
  resolve: {alias: {'@shared': path.resolve(process.cwd(), 'shared')}}
});
