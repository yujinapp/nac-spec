import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  /* When deployed under yujin.app/nac-spec/demos/react/, all
     assets need relative paths. Vite's './' base produces
     `<script src="./assets/..."></script>` which works at any
     mount point. */
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    /* Proxy the chat backend through Vite's dev server so the
       browser does not have to deal with CORS while developing
       locally. In production, host this app on the same origin
       as the chat endpoint or configure CORS server-side. */
    proxy: {
      '/crm': {
        target: 'https://yujin.app',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
