import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const cssAsText = { '.css': 'text' } as const;
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };
const define = { __SP_VERSION__: JSON.stringify(pkg.version) };

export default defineConfig([
  // ESM + CJS：hls.js 作为外部依赖
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    loader: cssAsText,
    external: ['hls.js'],
    define,
  },
  // IIFE 全局构建：内联 hls.js，供 <script> 直接引入，暴露 window.SweetPlayer
  {
    entry: { 'sweet-player': 'src/global.ts' },
    format: ['iife'],
    globalName: 'SweetPlayer',
    loader: cssAsText,
    minify: true,
    outExtension: () => ({ js: '.global.js' }),
    define,
  },
]);
