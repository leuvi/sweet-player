# @sweet-player/core

基于 hls.js 的自定义视频播放器，核心零框架依赖，TypeScript 编写，支持原生 JS / React / Vue。

> React 封装见 [@sweet-player/react](https://www.npmjs.com/package/@sweet-player/react)，Vue 封装见 [@sweet-player/vue](https://www.npmjs.com/package/@sweet-player/vue)。

## 安装

```bash
npm install @sweet-player/core
```

或通过 `<script>` 标签引入 IIFE 版：

```html
<script src="https://unpkg.com/@sweet-player/core/dist/sweet-player.global.js"></script>
<script>
  const player = new SweetPlayer.SweetPlayer({ container: '#player', src: '...' });
</script>
```

## 使用

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
  onPrev: () => {},
  onNext: () => {},
  onQualityChange: (q) => {},
  onAudioTrackChange: (t) => {},
});

player.on('timeupdate', ({ currentTime, duration }) => {});
player.destroy();
```

## 功能

- **完整 UI 控件**：播放/暂停、快进退、进度条（拖拽+缓冲）、倍速、画质、画面比例、音轨、音量、全屏、画中画
- **键盘快捷键**：空格播放暂停、方向键 seek（长按阶梯加速 10→30→60 秒/秒）、↑↓ 音量、F 全屏、M 静音
- **触屏手势**：横滑 seek、右半屏竖滑音量、双击快进退/全屏、单击切换控制栏
- **画质自动接入**：HLS 多档画质/音轨自动填充菜单，也支持业务自定义列表
- **偏好持久化**：音量/倍速 localStorage 记忆；传 `id` 后断点续播
- **状态蒙层**：缓冲转圈、错误重试、结束重播+自动连播倒计时
- **i18n**：内置 zh-CN/en，支持自定义语言
- **插件机制**：`plugins` 选项或 `player.use(plugin)` 运行时安装
- **主题定制**：CSS 变量覆盖，如 `--sp-accent`
- **右键菜单**：屏蔽原生菜单，内置"更新记录（当前版本，跳转 npm）"、"视频信息（YouTube 风格统计面板）"、"快捷键（键位说明面板）"
- **按需隐藏**：`hiddenControls: ['ratio', 'audioTrack', ...]` 收集不显示的功能，默认全显示（只影响 UI，不影响 API 与快捷键）

## 画质 / 音轨

- **自动模式（默认）**：HLS 流有多档画质/音轨时自动填充菜单，选择"自动"由 hls.js ABR 决定。
- **业务模式**：传入 `qualities` / `audioTracks` 列表则以业务为准，切换通过回调通知；运行时可用 `setQualities()` / `setAudioTracks()` 更新。

## 插件

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
// 或运行时：player.use(myPlugin);
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

`play()` `pause()` `toggle()` `seek(t)` `seekBy(±s)` `setRate(r)` `setVolume(0-100)` `setMuted(b)` `setAspectRatio(r)` `setQualities(list)` `setAudioTracks(list)` `toggleFullscreen()` `togglePip()` `load(src)` `setTitle(s)` `use(plugin)` `on/off(event, fn)` `destroy()`

事件：`ready` `play` `pause` `ended` `timeupdate` `ratechange` `volumechange` `fullscreenchange` `pipchange` `aspectratiochange` `qualitychange` `audiotrackchange` `error` `destroy`

## License

MIT
