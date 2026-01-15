import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index-opentui.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist',
  banner: {
    js: '#!/usr/bin/env bun',
  },
});
