import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'user-script-utf8-header',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const cleanUrl = (req.url || '').split('?')[0];
            if (cleanUrl.endsWith('.user.js') || cleanUrl.includes('kyotei-teleboat-autofill')) {
              try {
                const filePath = path.resolve(__dirname, 'public/kyotei-teleboat-autofill.user.js');
                if (fs.existsSync(filePath)) {
                  const data = fs.readFileSync(filePath);
                  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('Content-Length', data.length);
                  res.end(data);
                  return;
                }
              } catch (e) {
                console.error(e);
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      cors: true,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

