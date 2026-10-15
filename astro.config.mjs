// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['gsap', 'gsap/ScrollTrigger', 'lenis', 'canvas-confetti'],
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      minify: true,
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/gsap')) return 'vendor-gsap';
            if (id.includes('node_modules/lenis')) return 'vendor-lenis';
          },
        },
      },
    },
  },
});