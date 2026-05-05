import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'FrotaCheck',
          short_name: 'FrotaCheck',
          theme_color: '#f59e0b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDE4VjZhMiAyIDAgMCAwLTItMkg0YTIgMiAwIDAgMC0yIDJ2MTFhMSAxIDAgMCAwIDEgMWgyIi8+PHBhdGggZD0iTTE1IDE4SDkiLz48cGF0aCBkPSJNMTkgMThoMmExIDEgMCAwIDAgMS0xdi0zLjY1YTEgMSAwIDAgMC0uMjItLjYyNGwtMy40OC00LjM1QTEgMSAwIDAgMCAxNy41MiA4SDE0Ii8+PGNpcmNsZSBjeD0iMTciIGN5PSIxOCIgcj0iMiIvPjxjaXJjbGUgY3g9IjciIGN5PSIxOCIgcj0iMiIvPjwvc3ZnPg==',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDE4VjZhMiAyIDAgMCAwLTItMkg0YTIgMiAwIDAgMC0yIDJ2MTFhMSAxIDAgMCAwIDEgMWgyIi8+PHBhdGggZD0iTTE1IDE4SDkiLz48cGF0aCBkPSJNMTkgMThoMmExIDEgMCAwIDAgMS0xdi0zLjY1YTEgMSAwIDAgMC0uMjItLjYyNGwtMy40OC00LjM1QTEgMSAwIDAgMCAxNy41MiA4SDE0Ii8+PGNpcmNsZSBjeD0iMTciIGN5PSIxOCIgcj0iMiIvPjxjaXJjbGUgY3g9IjciIGN5PSIxOCIgcj0iMiIvPjwvc3ZnPg==',
              sizes: '512x512',
              type: 'image/svg+xml',
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            utils: ['date-fns', 'lucide-react', 'localforage'],
            pdf: ['jspdf', 'html2canvas']
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
