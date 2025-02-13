import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
  minify: false,
  outDir: './dist',
  sourcemap: false,
  target: 'esnext',
  platform: 'node',
  treeshake: true,
});
