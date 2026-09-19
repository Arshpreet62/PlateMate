import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: './test/globalSetup.js',
    setupFiles: ['./test/setup.js'],
    fileParallelism: false,
  },
})
