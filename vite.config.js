import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// We deploy to universefocuses.com at root, so base stays '/'. Override
// with VITE_BASE=/some-subpath/ only if you ever host under a subfolder.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
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
