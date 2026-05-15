import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/daywa/', 
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Daywa',
          short_name: 'Daywa',
          description: 'Minimalist sonic landscape app',
          theme_color: '#ff4d6d',
          background_color: '#f9f9f9',
          display: 'standalone',
          icons: [
            {
              src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmR4aiGZQxkktkyUyr7u2w8EyJDBElUR8xLaXso2wDQlvnJRjDPLDTUP05_j2ReXThM3fTRCYMLqbzBXfVuLAWW_RpxLVhp6GB5N3wMJe2D_oqmfLqNnnDqnie_asPA9wgoTcmXTHRgdAlTZDrP_XtkXcqcmqaj77ftudRCUBxjMTkby3hdG892HZ1_a-bkLFbdFwodFXElR_ppH66QqWm9PZi9UpLx5E9qbEATVYZG130V5f9y_IjOVhxIqpbLaf-2_lM1PdZ5oc',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
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
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
