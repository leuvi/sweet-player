# Sweet Player

[![npm version](https://img.shields.io/npm/v/@sweet-player/core?label=npm)](https://www.npmjs.com/package/@sweet-player/core)
[![npm downloads](https://img.shields.io/npm/dm/@sweet-player/core)](https://www.npmjs.com/package/@sweet-player/core)
[![GitHub stars](https://img.shields.io/github/stars/leuvi/sweet-player?style=flat)](https://github.com/leuvi/sweet-player)
[![license](https://img.shields.io/github/license/leuvi/sweet-player)](./LICENSE)

基于 hls.js 的自定义视频播放器，核心零框架依赖，支持 React 19 / Vue 3 / 原生 JS，TypeScript 编写。

## 包结构

| 包 | 说明 |
|---|---|
| `@sweet-player/core` | 核心播放器（含完整 UI），原生 JS 直接使用；另提供 IIFE 版 `dist/sweet-player.global.js` 供 `<script>` 引入 |
| `@sweet-player/react` | React 组件封装（React ≥ 18，含 React 19） |
| `@sweet-player/vue` | Vue 3 组件封装 |

## 快速开始

```bash
pnpm install
pnpm build            # 构建三个包（playground 依赖 dist 产物）
pnpm dev:vanilla      # 或 dev:react / dev:vue
pnpm --filter @sweet-player/core test   # 单元测试
```

### 原生 JS

```ts
import { SweetPlayer } from '@sweet-player/core';

const player = new SweetPlayer({
  container: '#player',          // 元素或选择器
  src: 'https://example.com/video.m3u8',
  title: '影片标题',
  id: 'ep-01',                   // 传入后自动断点续播
  volume: 80,                    // 0-100（localStorage 偏好优先）
  seekStep: 10,                  // 快进快退秒数
  longSeek: { steps: [10, 30, 60], stepUpInterval: 2000 },
  playbackRates: [0.5, 1, 1.5, 2],
  autoQuality: true,             // 默认 true：自动读取 hls levels 填充画质菜单（含"自动"档）
  persist: true,                 // 默认 true：记忆音量/静音/倍速
  autoNext: 5,                   // 播完 5 秒倒计时自动下一个（需配合 onNext）
  locale: 'zh-CN',               // 内置 zh-CN / en，registerLocale 可扩展
  hiddenControls: ['ratio', 'audioTrack'],  // 不显示的功能，默认全显示
  onPrev: () => {},
  onNext: () => {},
  onQualityChange: (q) => {},
  onAudioTrackChange: (t) => {},
});

player.on('timeupdate', ({ currentTime, duration }) => {});
player.destroy();
```

### React 19

```tsx
import { SweetPlayer, type SweetPlayerCore } from '@sweet-player/react';

const ref = useRef<SweetPlayerCore | null>(null);
<SweetPlayer ref={ref} src="..." title="..." id="ep-01" onNext={() => {}} />;
ref.current?.seekBy(30);
```

### Vue 3

```vue
<SweetPlayer :src="src" title="..." id="ep-01" @ready="p => (player = p)" @next="..." />
```

## 画质 / 音轨

- **自动模式（默认）**：HLS 流有多档画质/音轨时自动填充菜单，选择"自动"由 hls.js ABR 决定。
- **业务模式**：传入 `qualities` / `audioTracks` 列表则以业务为准，切换通过 `onQualityChange` / `onAudioTrackChange` 回调；`QualityLevel.src` 传了地址会自动换源并保持进度。运行时可用 `setQualities()` / `setAudioTracks()` 更新。

## 设置面板

控制栏右侧收敛为 **音量 · 设置齿轮 · 全屏** 三个入口。低频功能（倍速 / 画质 / 画面比例 / 音轨 / 画中画）统一收进设置齿轮，点开后主菜单每行显示当前值，点选进入子面板选择，选完自动返回并回写当前值。全屏下也能正常操作，点击面板外部关闭。

面板支持三种行类型：

- **选择行（select）**：点击进入子面板单选（倍速 / 画质 / 比例 / 音轨）
- **开关行（toggle）**：行内开关，不进子面板（画中画）
- **滑块行（slider）**：行内一条线 + 圆块拖动

插件可通过 `addSettingsRow(section)` 动态注册一行（返回移除函数，播放器 `destroy()` 时随控件整体清理）：

```ts
import type { SettingsSection } from '@sweet-player/core';

// 开关行示例
const remove = player.addSettingsRow({
  key: 'danmaku',
  label: '弹幕',
  currentValue: '',
  items: [],
  onSelect: () => {},
  toggle: { checked: true, onToggle: () => toggleDanmaku() },
});

// 选择行示例
player.addSettingsRow({
  key: 'subtitle',
  label: '字幕',
  currentValue: '关闭',
  items: [
    { label: '关闭', value: '' },
    { label: '简体中文', value: '/subs/zh.ass' },
  ],
  activeValue: '',
  onSelect: (item) => loadSubtitle(item.value),
});

remove(); // 需要时移除该行
```

## 插件机制

```ts
import type { SweetPlayerPlugin } from '@sweet-player/core';

const myPlugin: SweetPlayerPlugin = {
  name: 'my-plugin',
  apply(player) {
    // player.video / player.container / player.on 可用
    return () => { /* destroy 时清理 */ };
  },
};

new SweetPlayer({ ..., plugins: [myPlugin] });
// 或运行时安装：const uninstall = player.use(myPlugin);
```

### 接入 [sweet-subtitle](https://github.com/leuvi/sweet-subtitle) 字幕

```bash
npm install sweet-subtitle
```

插件工厂持有字幕实例并对外暴露切换 API，运行时换字幕无需重建播放器：

```ts
import { SweetSubtitle } from 'sweet-subtitle';
import type { SweetPlayerPlugin } from '@sweet-player/core';

function createSubtitlePlugin(src?: string) {
  let sub: SweetSubtitle | null = null;
  const plugin: SweetPlayerPlugin = {
    name: 'sweet-subtitle',
    apply(player) {
      sub = new SweetSubtitle(player.video, src ? { src } : {});
      return () => { sub?.destroy(); sub = null; };  // 播放器 destroy 时自动清理
    },
  };
  return {
    plugin,
    load: (url: string) => sub?.loadFromUrl(url),   // 切换字幕
    show: () => sub?.show(),
    hide: () => sub?.hide(),
    setOffset: (s: number) => sub?.setOffset(s),
  };
}

const subtitle = createSubtitlePlugin('/subs/ep-01.ass');
const player = new SweetPlayer({ ..., plugins: [subtitle.plugin] });

// 随时换字幕 / 关字幕，播放器不动
await subtitle.load('/subs/ep-02.ass');
subtitle.hide();
```

不想用插件的话也可以完全独立管理：`new SweetSubtitle(player.video, ...)` 拿到实例自己持有，只需在销毁播放器前调用 `sub.destroy()`。

## 实例 API

`play()` `pause()` `toggle()` `seek(t)` `seekBy(±s)` `setRate(r)` `setVolume(0-100)` `setMuted(b)` `setAspectRatio('original'|'21:9'|'16:9'|'4:3')` `setQualities(list)` `setAudioTracks(list)` `toggleFullscreen()` `togglePip()` `screenshot()` `load(src)` `setTitle(s)` `use(plugin)` `addSettingsRow(section)` `on/off(event, fn)` `destroy()`

事件：`ready` `play` `pause` `ended` `timeupdate` `ratechange` `volumechange` `fullscreenchange` `pipchange` `aspectratiochange` `qualitychange` `audiotrackchange` `error` `destroy`

## 交互

### 键盘（悬停或聚焦播放器时生效，输入框内自动忽略）

| 键 | 行为 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← / → | 快退 / 快进 `seekStep` 秒 |
| ← / → 长按 | 阶梯式累计快进快退（默认 10→30→60 秒/秒，每 2 秒升档，松开执行） |
| ↑ / ↓ | 音量 ±5 |
| F | 全屏切换 |
| M | 静音切换 |

### 鼠标

单击画面播放/暂停 · 双击全屏 · 播放中 3 秒无操作控制栏自动隐藏 · 右键弹出自定义菜单（截图 / 更新记录 / 视频信息 / 快捷键，原生菜单已屏蔽）

### 触屏

横滑拖动 seek（松手执行）· 右半屏竖滑调音量 · 双击左/右 1/3 区域快退/快进 · 双击中间全屏 · 单击切换控制栏显隐

## 状态与反馈

- **缓冲**：waiting/seek 未缓冲区时显示转圈（延迟 300ms 出现，避免闪烁）
- **错误**：加载失败显示"视频加载失败 + 重试"蒙层，重试保留播放位置
- **结束**：显示"重新播放"，有 `onNext` 时加"播放下一个"；`autoNext` 开启后倒计时自动连播（可取消）
- **统计信息**：右键菜单"视频信息"弹出类 YouTube 统计蒙层（分辨率、缓冲、丢帧、hls.js 带宽估算、当前 level 等）
- **更新记录**：右键菜单显示当前版本号，点击跳转 npm 页面；代码里也可读 `SweetPlayer.version`
- **快捷键说明**：右键菜单"快捷键"弹出全部键盘快捷键面板（seek 秒数随 `seekStep` 动态显示）
- **截图**：右键菜单"截图当前画面"或调用 `screenshot()`，抓取视频当前帧。优先复制到剪贴板（各浏览器剪贴板图片仅通用支持 PNG，故复制为 PNG），不支持时回退下载为 webp（体积更小）。跨域视频未带 CORS 授信时 canvas 会被污染，此时提示截图失败

## 持久化

- `persist`（默认开）：音量 / 静音 / 倍速记忆在 `localStorage`
- `id`：传入后每 5 秒保存播放进度，下次打开自动续播；播到结尾自动清除断点

## 隐藏功能

`hiddenControls` 收集不显示的功能，默认全部显示（只影响 UI，不影响 API 与快捷键）：

```ts
new SweetPlayer({ ..., hiddenControls: ['ratio', 'audioTrack', 'pip'] });
```

可选值：`prev` `seekBack` `play` `seekForward` `next` `time`（时间显示）`rate`（倍速）`quality`（画质）`ratio`（画面比例）`audioTrack`（音轨）`volume`（音量）`pip`（画中画）`settings`（设置面板齿轮）`fullscreen`（全屏）`title`（标题）`progress`（进度条）`contextMenu`（右键菜单，隐藏后恢复浏览器原生右键）

> 倍速 / 画质 / 画面比例 / 音轨 / 画中画收纳在设置面板内，其对应的 `hiddenControls` 值仍可单独隐藏面板中的某一行；隐藏 `settings` 则整个齿轮不显示。

## 其他

- **i18n**：`locale: 'en'` 切英文；`localeStrings` 覆盖个别文案；`registerLocale(name, strings)` 注册整套语言
- **主题定制**：覆盖 CSS 变量，如 `.sweet-player { --sp-accent: #00a1d6; }`
- **画中画**：设置面板内开关行（不支持的浏览器自动隐藏）/ `togglePip()`

## 发布

changesets 管理版本：`pnpm changeset` 记录变更 → 合并到 main 后 CI 自动开版本 PR → 合并版本 PR 自动发布 npm（需配置 `NPM_TOKEN` secret）。三个包版本联动（linked）。
