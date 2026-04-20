import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',
  optimizeDeps: {
    include: ['plotly.js-dist-min'],
  },
  build: {
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Plotly (~3 MB) from app code so browsers can cache it
          plotly: ['plotly.js-dist-min'],
          vue:    ['vue'],
        },
      },
    },
  },
});
