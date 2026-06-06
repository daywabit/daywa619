import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/daywa619/',
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
