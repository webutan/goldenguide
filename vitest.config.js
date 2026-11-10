import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// Reuses the app's Vite config (incl. the Vue plugin). Tests run in Node by
// default; a DOM environment can be opted into per file later if needed.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['tests/**/*.test.js'],
    },
  }),
)
