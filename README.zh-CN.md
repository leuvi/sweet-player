[English](README.md) | 中文

# Sweet Player

[![npm version](https://img.shields.io/npm/v/@sweet-player/core?label=npm)](https://www.npmjs.com/package/@sweet-player/core)
[![npm downloads](https://img.shields.io/npm/dm/@sweet-player/core)](https://www.npmjs.com/package/@sweet-player/core)
[![GitHub stars](https://img.shields.io/github/stars/leuvi/sweet-player?style=flat)](https://github.com/leuvi/sweet-player)
[![license](https://img.shields.io/github/license/leuvi/sweet-player)](./LICENSE)
[![live demo](https://img.shields.io/badge/demo-player.sweetui.com-ff4d6d)](https://player.sweetui.com)

基于 hls.js 的自定义视频播放器，核心零框架依赖，支持 React / Vue / 原生 JS，TypeScript 编写。

**在线 Demo：[player.sweetui.com](https://player.sweetui.com)**

## 安装

```bash
npm install @sweet-player/core
```

| 包 | 说明 |
|---|---|
| `@sweet-player/core` | 核心播放器（含完整 UI），原生 JS 直接使用 |
| `@sweet-player/react` | React 组件封装 |
| `@sweet-player/vue` | Vue 组件封装 |

## 快速开始

### 原生 JS

```ts
import { SweetPlayer } from '@sweet-player/core';

const player = new SweetPlayer({
  container: '#player',
  src: 'https://example.com/video.m3u8',
});
```

### CDN / Script 标签

```html
<script src="https://unpkg.com/@sweet-player/core/dist/sweet-player.global.js"></script>
<script>
  const player = new SweetPlayer({ container: '#player', src: '...' });
</script>
```

### React

```bash
npm install @sweet-player/react
```

```tsx
import { SweetPlayer, type SweetPlayerCore } from '@sweet-player/react';

const ref = useRef<SweetPlayerCore | null>(null);
<SweetPlayer ref={ref} src="..." title="..." id="ep-01" onNext={() => {}} />;
ref.current?.seekBy(30);
```

### Vue

```bash
npm install @sweet-player/vue
```

```vue
<SweetPlayer :src="src" title="..." id="ep-01" @ready="p => (player = p)" @next="..." />
```

## 配置项

```ts
const player = new SweetPlayer({
  container: '#player',          // 元素或选择器
  src: 'https://example.com/video.m3u8',
  title: '影片标题',
  id: 'ep-01',                   // 传入后自动断点续播
  volume: 80,                    // 0-100（localStorage 偏好优先）
  seekStep: 10,                  // 快进快退秒数
  longSeek: { steps: [10, 30, 60], stepUpInterval: 2000 },
  playbackRates: [0.5, 1, 1.5, 2],
  autoQuality: true,             // 默认 true：自动读取 hls levels 填充画质菜单
  persist: true,                 // 默认 true：记忆音量/静音/倍速
  autoNext: 5,                   // 播完 5 秒倒计时自动下一个（需配合 onNext）
  locale: 'zh-CN',               // 内置 zh-CN / en，registerLocale 可扩展
  heatmap: [{ time: 5, value: 88 }], // 进度条上方热度曲线（最多重播），value 自动归一化
  poster: '/poster.webp',        // 播放开始前显示的封面图
  thumbnails: '/thumbs.vtt',     // 进度条悬停预览图的 WebVTT 地址
  hiddenControls: ['ratio'],     // 不显示的功能，默认全显示
  plugins: [],                   // 插件列表
  onPrev: () => {},
  onNext: () => {},
  onQualityChange: (q) => {},
  onAudioTrackChange: (t) => {},
});
```

## API

### 方法

`play()` `pause()` `toggle()` `seek(t)` `seekBy(±s)` `setRate(r)` `setVolume(0-100)` `setMuted(b)` `setAspectRatio('original'|'21:9'|'16:9'|'4:3')` `setQualities(list)` `setAudioTracks(list)` `toggleFullscreen()` `togglePip()` `screenshot()` `load(src)` `setTitle(s)` `use(plugin)` `addSettingsRow(section)` `addContextMenuItem(item, index?)` `on/off(event, fn)` `destroy()`

### 事件

`ready` `play` `pause` `ended` `timeupdate` `ratechange` `volumechange` `fullscreenchange` `pipchange` `aspectratiochange` `qualitychange` `audiotrackchange` `error` `destroy`

```ts
player.on('timeupdate', ({ currentTime, duration }) => {});
player.on('error', ({ type, detail }) => {});
```

## 画质 / 音轨

- **自动模式（默认）**：HLS 流有多档画质/音轨时自动填充菜单，选择"自动"由 hls.js ABR 决定。
- **业务模式**：传入 `qualities` / `audioTracks` 列表则以业务为准，切换通过 `onQualityChange` / `onAudioTrackChange` 回调；`QualityLevel.src` 传了地址会自动换源并保持进度。运行时可用 `setQualities()` / `setAudioTracks()` 更新。

## 交互

### 键盘

| 键 | 行为 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← / → | 快退 / 快进 `seekStep` 秒 |
| ← / → 长按 | 阶梯式累计快进快退（10→30→60 秒/秒，每 2 秒升档，松开执行） |
| ↑ / ↓ | 音量 ±5 |
| F | 全屏切换 |
| M | 静音切换 |

### 鼠标

单击画面播放/暂停 · 双击全屏 · 播放中 3 秒无操作控制栏自动隐藏 · 右键弹出自定义菜单（截图 / 视频信息 / 快捷键）

### 触屏

横滑拖动 seek · 右半屏竖滑调音量 · 双击左/右 1/3 区域快退/快进 · 双击中间全屏 · 单击切换控制栏显隐

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

### 扩展设置面板

插件可通过 `addSettingsRow()` 动态注册设置行：

```ts
// 开关行
const remove = player.addSettingsRow({
  key: 'danmaku',
  label: '弹幕',
  currentValue: '',
  items: [],
  onSelect: () => {},
  toggle: { checked: true, onToggle: () => toggleDanmaku() },
});

// 选择行
player.addSettingsRow({
  key: 'theme',
  label: '主题色',
  currentValue: '默认',
  items: [
    { label: '默认', value: '#ff4d6d' },
    { label: '蓝色', value: '#409eff' },
    { label: '绿色', value: '#67c23a' },
  ],
  activeValue: '#ff4d6d',
  onSelect: (item) => player.container.style.setProperty('--sp-accent', item.value),
});

remove(); // 需要时移除该行
```

### 扩展右键菜单

插件可通过 `addContextMenuItem()` 动态注册右键菜单项：

```ts
const remove = player.addContextMenuItem({
  label: '自定义操作',
  onClick: () => { /* ... */ },
}, 1); // index = 插入位置

remove(); // 需要时移除
```

### 接入 [sweet-subtitle](https://github.com/leuvi/sweet-subtitle) 字幕插件

```bash
npm install sweet-subtitle
```

```ts
import { SweetSubtitle } from 'sweet-subtitle';
import type { SweetPlayerPlugin } from '@sweet-player/core';

function createSubtitlePlugin(src?: string) {
  let sub: SweetSubtitle | null = null;
  const plugin: SweetPlayerPlugin = {
    name: 'sweet-subtitle',
    apply(player) {
      sub = new SweetSubtitle(player.video, src ? { src } : {});
      return () => { sub?.destroy(); sub = null; };
    },
  };
  return {
    plugin,
    load: (url: string) => sub?.loadFromUrl(url),
    show: () => sub?.show(),
    hide: () => sub?.hide(),
    setOffset: (s: number) => sub?.setOffset(s),
  };
}

const subtitle = createSubtitlePlugin('/subs/ep-01.ass');
const player = new SweetPlayer({ ..., plugins: [subtitle.plugin] });

await subtitle.load('/subs/ep-02.ass');
subtitle.hide();
```

### 接入 [sweet-player-gif](https://github.com/leuvi/sweet-player-gif) 动画截取插件

```bash
npm install sweet-player-gif
```

注册插件后右键菜单自动出现"截取动画 (GIF)"，点击截取最近 N 秒画面并下载：

```ts
import { SweetPlayerGif } from 'sweet-player-gif';
import type { SweetPlayerPlugin } from '@sweet-player/core';

function createGifPlugin(duration = 3): SweetPlayerPlugin {
  return {
    name: 'sweet-player-gif',
    apply(player) {
      const gif = new SweetPlayerGif(player.video, { duration, fps: 10, maxWidth: 480 });
      let started = false;

      const offPlay = player.on('play', () => {
        if (!started) { gif.start(); started = true; }
      });

      const removeMenu = player.addContextMenuItem({
        label: '截取动画 (GIF)',
        async onClick() {
          if (!started) { gif.start(); started = true; }
          const blob = await gif.capture();
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `capture-${Date.now()}.gif`;
          a.click();
          URL.revokeObjectURL(a.href);
        },
      }, 1);

      return () => { offPlay(); removeMenu(); gif.destroy(); };
    },
  };
}

const player = new SweetPlayer({ ..., plugins: [createGifPlugin(3)] });
```

不注册插件则右键菜单不会出现该选项。更多参数参见 [sweet-player-gif 文档](https://github.com/leuvi/sweet-player-gif)。

### 接入 [sweet-danmaku](https://github.com/leuvi/sweet-danmaku) 弹幕插件

```bash
npm install sweet-danmaku
```

为播放器添加实时弹幕覆盖层，与视频时间轴同步。内置插件工厂自动在设置面板注册开关和透明度滑条：

```ts
import { createDanmakuPlugin } from 'sweet-danmaku';

const danmaku = createDanmakuPlugin({
  speed: 1,
  area: 0.5,
  comments: [
    { text: '弹幕来了', time: 1 },
    { text: '精彩', time: 5, color: '#ff4d6d' },
  ],
});

const player = new SweetPlayer({ ..., plugins: [danmaku.plugin] });

// 运行时发送弹幕
danmaku.send({ text: '新弹幕', time: player.video.currentTime });
```

更多参数参见 [sweet-danmaku 文档](https://github.com/leuvi/sweet-danmaku)（speed / fontSize / area / filter 等）。

## 热度曲线（最多重播）

传入 `heatmap` 即在进度条上方显示「最多重播」热度曲线。hover 进度条时显示，可在设置面板中开关。

```ts
new SweetPlayer({
  container: '#player',
  src: '.../video.m3u8',
  heatmap: [
    { time: 0, value: 3201 },   // time 为秒，value 为任意非负数
    { time: 5, value: 8850 },
    { time: 10, value: 4120 },
  ],
});
```

- `time`：秒，内部按视频 `duration` 映射到进度条
- `value`：热度值，**任意非负数**（内部按最大值自动归一化，无需自己缩放到 0~1）
- 采样点越密，曲线越平滑连绵

通常做法是先从后端拉取聚合后的观看/重播次数，再创建播放器。服务端只需返回一个 JSON 数组，`value` 直接用每个时间桶的原始次数即可：

```ts
// GET /api/videos/:id/heatmap  ->  [{ "time": 0, "value": 3201 }, { "time": 5, "value": 8850 }]
const heatmap = await fetch(`/api/videos/${id}/heatmap`).then((r) => r.json());
new SweetPlayer({ container: '#player', src, heatmap });
```

若要彻底禁用（连曲线逻辑都不初始化），把 `'heatmap'` 加入 `hiddenControls`。

## 封面图与预览图

`poster` 设置播放开始前显示的封面图：

```ts
new SweetPlayer({ container: '#player', src, poster: '/poster.webp' });
```

`thumbnails` 在 hover 进度条时显示预览图。传入一个 WebVTT 文件地址，每个 cue 的内容是图片 URL，可选 `#xywh=x,y,w,h` 表示从雪碧图中截取的区域：

```ts
new SweetPlayer({ container: '#player', src, thumbnails: '/thumbs.vtt' });
```

```vtt
WEBVTT

00:00:00.000 --> 00:00:10.000
sprite.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
sprite.jpg#xywh=160,0,160,90
```

VTT 中的图片地址相对于 VTT 文件自身解析。若要彻底禁用，把 `'thumbnails'` 加入 `hiddenControls`。

## 隐藏功能

`hiddenControls` 收集不显示的功能（默认全显示，只影响 UI，不影响 API 与快捷键）：

```ts
new SweetPlayer({ ..., hiddenControls: ['ratio', 'audioTrack', 'pip'] });
```

可选值：`prev` `seekBack` `play` `seekForward` `next` `time` `rate` `quality` `ratio` `audioTrack` `volume` `pip` `heatmap` `thumbnails` `settings` `fullscreen` `title` `progress` `contextMenu`

## 定制

- **i18n**：`locale: 'en'` 切英文；`localeStrings` 覆盖个别文案；`registerLocale(name, strings)` 注册整套语言
- **主题**：覆盖 CSS 变量，如 `.sweet-player { --sp-accent: #00a1d6; }`

## License

MIT
