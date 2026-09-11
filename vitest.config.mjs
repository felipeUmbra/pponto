import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    // Keep tests hermetic — force demo data mode (no Turso credentials)
    env: {
      VITE_TURSO_URL: '',
      VITE_TURSO_TOKEN: '',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
    },
  },
});
