import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts'],
  format: ['esm'],
  dts: true,
  platform: 'neutral',
  target: 'es2022',
  // Keeps one output file per source file, so each 'use client' directive stays at the top of its own module.
  unbundle: true,
});
