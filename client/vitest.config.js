import { defineConfig } from 'vitest/config'

// Deliberately separate from vite.config.js: the tests exercise src/db/* only
// and have no use for React or the PWA plugin.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
  },
})
