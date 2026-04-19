import { defineConfig } from 'vite';

export default defineConfig({
  base: '/FocusApp/',
  publicDir: 'public',
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
