// __SP_VERSION__ 由 tsup define 在构建时替换为 package.json 的 version；
// 直接跑源码（vitest）时未定义，回退为 dev
declare const __SP_VERSION__: string;

export const VERSION: string = typeof __SP_VERSION__ !== 'undefined' ? __SP_VERSION__ : 'dev';
