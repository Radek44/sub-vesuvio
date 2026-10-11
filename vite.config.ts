import { defineConfig } from 'vite';

// Ymir ships TypeScript source; Vite compiles it with the game.
// - Its .tsx files arrive in node_modules without Ymir's tsconfig, so JSX is set for every file here.
// - `base: './'` lets the build run from any folder.
// - Three.js is one large chunk by itself, so the size warning starts above it.
export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { esbuildOptions: { jsx: 'automatic' } },
  build: { chunkSizeWarningLimit: 1500 },
});
