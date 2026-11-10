import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // The only chunk over Vite's 500 kB default is GaiChanStage (three.js),
    // which GaiChanModel already loads on demand, so it never blocks first
    // paint. Keep the warning for anything else that grows past this.
    chunkSizeWarningLimit: 650,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
