English | [中文](README.zh-CN.md)

# Sweet Player

[![npm version](https://img.shields.io/npm/v/@sweet-player/core?label=npm)](https://www.npmjs.com/package/@sweet-player/core)
[![npm downloads](https://img.shields.io/npm/dm/@sweet-player/core)](https://www.npmjs.com/package/@sweet-player/core)
[![GitHub stars](https://img.shields.io/github/stars/leuvi/sweet-player?style=flat)](https://github.com/leuvi/sweet-player)
[![license](https://img.shields.io/github/license/leuvi/sweet-player)](./LICENSE)
[![live demo](https://img.shields.io/badge/demo-player.sweetui.com-ff4d6d)](https://player.sweetui.com)

A custom video player supporting HLS (hls.js) and MPEG-DASH (dashjs). Zero framework dependency at its core, with React / Vue / vanilla JS support. Written in TypeScript.

**Live Demo: [player.sweetui.com](https://player.sweetui.com)**

## Install

```bash
npm install @sweet-player/core
```

| Package | Description |
|---|---|
| `@sweet-player/core` | Core player (full UI included), for vanilla JS or as the base for framework wrappers |
| `@sweet-player/react` | React component wrapper |
| `@sweet-player/vue` | Vue component wrapper |

`hls.js` and `dashjs` are peer/optional dependencies loaded on demand: `.m3u8` sources pull in `hls.js`, `.mpd` sources pull in `dashjs`; any other source plays through the native `<video>`. Only the engine you actually use is downloaded.

## Quick Start

### Vanilla JS

```ts
import { SweetPlayer } from '@sweet-player/core';

const player = new SweetPlayer({
  container: '#player',
  src: 'https://example.com/video.m3u8',
});
```

### CDN / Script Tag

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

## Options

```ts
const player = new SweetPlayer({
  container: '#player',          // Element or CSS selector
  src: 'https://example.com/video.m3u8',
  title: 'Video Title',
  id: 'ep-01',                   // Enables resume playback from last position
  volume: 80,                    // 0-100 (localStorage preference takes priority)
  seekStep: 10,                  // Seek step in seconds
  longSeek: { steps: [10, 30, 60], stepUpInterval: 2000 },
  playbackRates: [0.5, 1, 1.5, 2],
  autoQuality: true,             // Default true: auto-populate quality menu from HLS/DASH levels
  persist: true,                 // Default true: remember volume/mute/rate in localStorage
  autoNext: 5,                   // Auto-play next after 5s countdown on ended (requires onNext)
  locale: 'en',                  // Built-in: 'zh-CN' / 'en'; extend with registerLocale
  heatmap: [{ time: 5, value: 88 }], // Most-replayed curve above the progress bar (values auto-normalized)
  poster: '/poster.webp',        // Cover image shown before playback starts
  thumbnails: '/thumbs.vtt',     // WebVTT thumbnail track for progress-bar hover preview
  hlsConfig: {},                 // Passed through to `new Hls(config)` for .m3u8 sources
  dashConfig: {},                // Passed through to dashjs `updateSettings` for .mpd sources
  hiddenControls: ['ratio'],     // Hide specific UI controls, all shown by default
  plugins: [],                   // Plugin list
  onPrev: () => {},
  onNext: () => {},
  onQualityChange: (q) => {},
  onAudioTrackChange: (t) => {},
});
```

## API

### Methods

| Method | Description |
|---|---|
| `play()` | Start playback. Returns a `Promise`. |
| `pause()` | Pause playback. |
| `toggle()` | Toggle play / pause. |
| `seek(time)` | Jump to an absolute time in seconds. |
| `seekBy(delta)` | Seek by a relative offset in seconds (positive or negative). |
| `setRate(rate)` | Set playback rate, e.g. `1.5`. |
| `setVolume(volume)` | Set volume in the `0–100` range. |
| `setMuted(muted)` | Mute or unmute. |
| `setAspectRatio(ratio)` | `'original' \| '21:9' \| '16:9' \| '4:3'`. |
| `setQualities(list, active?)` | Replace the quality list; optionally set active. |
| `setAudioTracks(list, active?)` | Replace the audio-track list; optionally set active. |
| `toggleFullscreen()` | Enter / exit fullscreen. |
| `togglePip()` | Enter / exit Picture-in-Picture. |
| `screenshot()` | Copy the current frame to the clipboard, or download it. |
| `load(src)` | Load a new source without recreating the player. |
| `setTitle(title)` | Update the top-left title text. |
| `use(plugin)` | Install a plugin at runtime; returns an uninstall function. |
| `addSettingsRow(section)` | Register a settings-panel row; returns a remove function. |
| `addContextMenuItem(item, index?)` | Register a right-click menu item; returns a remove function. |
| `on(event, fn)` | Subscribe to an event; returns an unsubscribe function. |
| `off(event, fn)` | Remove an event listener. |
| `destroy()` | Tear down the player and release all resources. |

### Events

| Event | Payload | Fires when |
|---|---|---|
| `ready` | — | Metadata is loaded and the player is ready to play. |
| `play` | — | Playback starts or resumes. |
| `pause` | — | Playback pauses. |
| `ended` | — | Playback reaches the end of the video. |
| `timeupdate` | `{ currentTime, duration }` | The current playback position changes. |
| `ratechange` | `number` (new rate) | The playback rate changes. |
| `volumechange` | `{ volume, muted }` | Volume or mute state changes. |
| `fullscreenchange` | `boolean` (is fullscreen) | Fullscreen state changes. |
| `pipchange` | `boolean` (is in PiP) | Picture-in-Picture state changes. |
| `aspectratiochange` | `AspectRatio` | The forced aspect ratio changes. |
| `qualitychange` | `QualityLevel` | Quality is switched. |
| `audiotrackchange` | `AudioTrackInfo` | Audio track is switched. |
| `error` | `{ type, detail? }` | Playback or network error occurs. |
| `destroy` | — | `destroy()` is called. |

```ts
player.on('timeupdate', ({ currentTime, duration }) => {});
player.on('error', ({ type, detail }) => {});
```

## Quality / Audio Tracks

- **Auto mode (default)**: HLS / DASH multi-level quality/audio tracks auto-populate menus. Selecting "Auto" lets the underlying engine's ABR decide.
- **Manual mode**: Pass `qualities` / `audioTracks` for custom lists. Switching triggers `onQualityChange` / `onAudioTrackChange` callbacks. If `QualityLevel.src` is provided, the player auto-switches source while preserving playback position. Use `setQualities()` / `setAudioTracks()` to update at runtime.

## Controls

### Keyboard

| Key | Action |
|---|---|
| Space | Play / Pause |
| ← / → | Seek backward / forward by `seekStep` seconds |
| Hold ← / → | Accelerating seek (10→30→60 s/s, steps up every 2s, executes on release) |
| ↑ / ↓ | Volume ±5 |
| F | Toggle fullscreen |
| M | Toggle mute |

### Mouse

Click to play/pause · Double-click for fullscreen · Controls auto-hide after 3s during playback · Right-click opens custom context menu (screenshot / video info / shortcuts)

### Touch

Horizontal swipe to seek · Vertical swipe on right half adjusts volume · Double-tap left/right third to seek backward/forward · Double-tap center for fullscreen · Single tap toggles controls

## Plugin System

```ts
import type { SweetPlayerPlugin } from '@sweet-player/core';

const myPlugin: SweetPlayerPlugin = {
  name: 'my-plugin',
  apply(player) {
    // player.video / player.container / player.on available
    return () => { /* cleanup on destroy */ };
  },
};

new SweetPlayer({ ..., plugins: [myPlugin] });
// Or install at runtime: const uninstall = player.use(myPlugin);
```

### Extend Settings Panel

Plugins can add custom rows to the settings panel via `addSettingsRow()`:

```ts
// Toggle row
const remove = player.addSettingsRow({
  key: 'danmaku',
  label: 'Danmaku',
  currentValue: '',
  items: [],
  onSelect: () => {},
  toggle: { checked: true, onToggle: () => toggleDanmaku() },
});

// Select row
player.addSettingsRow({
  key: 'theme',
  label: 'Theme',
  currentValue: 'Default',
  items: [
    { label: 'Default', value: '#ff4d6d' },
    { label: 'Blue', value: '#409eff' },
    { label: 'Green', value: '#67c23a' },
  ],
  activeValue: '#ff4d6d',
  onSelect: (item) => player.container.style.setProperty('--sp-accent', item.value),
});

remove(); // Remove the row when needed
```

### Extend Context Menu

Plugins can add items to the right-click menu via `addContextMenuItem()`:

```ts
const remove = player.addContextMenuItem({
  label: 'My Action',
  onClick: () => { /* ... */ },
}, 1); // index = insertion position

remove(); // Remove when needed
```

### [sweet-subtitle](https://github.com/leuvi/sweet-subtitle) — Subtitle Plugin

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

### [sweet-player-gif](https://github.com/leuvi/sweet-player-gif) — GIF Capture Plugin

```bash
npm install sweet-player-gif
```

Adds a "Capture GIF" option to the context menu. Click to capture the last N seconds as a downloadable GIF:

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
        label: 'Capture GIF',
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

Without the plugin, the menu item won't appear. See [sweet-player-gif docs](https://github.com/leuvi/sweet-player-gif) for all options.

### [sweet-danmaku](https://github.com/leuvi/sweet-danmaku) — Danmaku (Bullet Comments) Plugin

```bash
npm install sweet-danmaku
```

Adds a real-time danmaku (bullet comments) overlay synced with video playback. The built-in plugin factory auto-registers a toggle switch and opacity slider in the settings panel:

```ts
import { createDanmakuPlugin } from 'sweet-danmaku';

const danmaku = createDanmakuPlugin({
  speed: 1,
  area: 0.5,
  comments: [
    { text: 'Hello!', time: 1 },
    { text: 'Great scene', time: 5, color: '#ff4d6d' },
  ],
});

const player = new SweetPlayer({ ..., plugins: [danmaku.plugin] });

// Send live danmaku at runtime
danmaku.send({ text: 'New comment', time: player.video.currentTime });
```

See [sweet-danmaku docs](https://github.com/leuvi/sweet-danmaku) for all options (speed, fontSize, area, filter, etc.).

## Heatmap (Most replayed)

Pass `heatmap` to show a "most replayed" curve above the progress bar. It appears when you hover the progress bar, and can be toggled from the settings panel.

```ts
new SweetPlayer({
  container: '#player',
  src: '.../video.m3u8',
  heatmap: [
    { time: 0, value: 3201 },   // time in seconds; value is any non-negative number
    { time: 5, value: 8850 },
    { time: 10, value: 4120 },
  ],
});
```

- `time` — seconds; mapped onto the progress bar using the video duration
- `value` — replay/heat intensity, **any non-negative number** (normalized internally by the max, no need to pre-scale)
- Denser samples produce a smoother, more continuous curve

Typically you fetch aggregated play counts from your backend, then create the player. The response is a plain JSON array where `value` can be the raw view/replay count per time bucket:

```ts
// GET /api/videos/:id/heatmap  ->  [{ "time": 0, "value": 3201 }, { "time": 5, "value": 8850 }]
const heatmap = await fetch(`/api/videos/${id}/heatmap`).then((r) => r.json());
new SweetPlayer({ container: '#player', src, heatmap });
```

To disable it entirely so none of the curve logic is initialized, add `'heatmap'` to `hiddenControls`.

## Poster & Preview Thumbnails

`poster` sets a cover image shown before playback starts:

```ts
new SweetPlayer({ container: '#player', src, poster: '/poster.webp' });
```

`thumbnails` shows a preview image when hovering the progress bar. Point it at a WebVTT file where each cue's payload is an image URL, optionally with a `#xywh=x,y,w,h` fragment to crop a region out of a sprite sheet:

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

Image URLs in the VTT are resolved relative to the VTT file's own URL. To disable it entirely, add `'thumbnails'` to `hiddenControls`.

## Hidden Controls

`hiddenControls` hides specific UI features (all shown by default; only affects UI, not API or shortcuts):

```ts
new SweetPlayer({ ..., hiddenControls: ['ratio', 'audioTrack', 'pip'] });
```

Available values:

| Value | Hides |
|---|---|
| `prev` | Previous button |
| `seekBack` | Rewind button |
| `play` | Play / pause button |
| `seekForward` | Forward button |
| `next` | Next button |
| `time` | Current-time / duration label |
| `rate` | Playback-speed row in the settings panel |
| `quality` | Quality row in the settings panel |
| `ratio` | Aspect-ratio row in the settings panel |
| `audioTrack` | Audio-track row in the settings panel |
| `volume` | Volume control |
| `pip` | Picture-in-Picture toggle in the settings panel |
| `heatmap` | Most-replayed curve above the progress bar |
| `thumbnails` | Progress-bar hover preview thumbnails |
| `poster` | Cover image before playback starts |
| `settings` | Entire settings-panel button |
| `fullscreen` | Fullscreen button |
| `title` | Top-left title |
| `progress` | Whole progress bar (also disables heatmap & thumbnails) |
| `contextMenu` | Custom right-click menu |

## Customization

- **i18n**: `locale: 'en'` for English; `localeStrings` to override specific strings; `registerLocale(name, strings)` to register a full language pack
- **Theming**: Override CSS variables, e.g. `.sweet-player { --sp-accent: #00a1d6; }`

## License

MIT
