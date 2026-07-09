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
    // global.ts 是 default 导出，IIFE 下全局会被包成 { default: SweetPlayer }；
    // 这里把它拍平，让 window.SweetPlayer 直接是类本身，支持 new SweetPlayer(...)
    footer: { js: 'SweetPlayer=SweetPlayer.default;' },
    loader: cssAsText,
    minify: true,
    outExtension: () => ({ js: '.global.js' }),
    define,
  },
]);
