import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    // Offline mode (G03). The worker is src/sw.js; the page registers it from
    // src/composables/usePwa.js in production builds only (no worker in
    // `npm run dev`). The manifest is the static public/manifest.webmanifest.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        // Precache = what the map, the directory, a bar card and the taskbar
        // need. Left out on purpose and cached on first use instead (see
        // sw.js): the 3D Gai-chan chunk and its model, Gai-chan's walkthrough
        // art (/gaichan/), and the admin-only chunks.
        globPatterns: [
          'index.html',
          'manifest.webmanifest',
          'favicon.ico',
          'static-off.webp',
          'assets/*.{js,css,woff2,svg}',
          'icons/**/*.{png,ico}',
          'cursors/*',
          'signs/*',
          'gaichan/gaichanicon.png',
        ],
        globIgnores: [
          'assets/GaiChanStage-*.js',
          'assets/AdminPanel-*',
          'assets/DatabaseTable-*',
        ],
      },
    }),
  ],
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
