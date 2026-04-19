import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// When you hook up a custom domain, set VITE_BASE=/ (or add a repo Variable
// named VITE_BASE with value "/" at Settings → Secrets and variables → Actions).
// For the default GitHub Pages URL, base stays /FocusApp/.
export default defineConfig({
  base: process.env.VITE_BASE || '/FocusApp/',
  publicDir: 'public',
  // Cloudflare's Vite integration — wires up `wrangler deploy` and `wrangler
  // dev` to the Vite pipeline, and quiets wrangler's auto-detect/auto-setup
  // flow that was failing in CI because there was no plugins array.
  plugins: [cloudflare()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssMinify: 'esbuild',
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5173,
  },
});
