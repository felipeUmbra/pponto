import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  // Relative base so the built app works on GitHub Pages project sites
  // (served under /pponto/) and under a custom domain or root.
  base: './',
});