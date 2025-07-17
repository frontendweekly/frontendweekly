import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.js'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'temp-*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'dist/',
        '.idea/',
        '.git/',
        '.cache/',
        'temp-*',
        '**/*.config.js',
        '**/*.config.mjs',
        'vitest-setup.js',
        '**/*.spec.js',
        '**/*.test.js',
        '**/__tests__/**',
        '**/__snapshots__/**',
      ],
      include: [
        '11ty/**/*.js',
        '_task/**/*.js',
        'functions/**/*.js',
        '11ty/_include/**/*.js',
      ],
    },
  },
});
