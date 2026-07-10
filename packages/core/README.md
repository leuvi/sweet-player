# @sweet-player/core

A custom video player built on hls.js. Zero framework dependency, written in TypeScript. Supports vanilla JS / React / Vue.

**Live Demo: [player.sweetui.com](https://player.sweetui.com)**

> React wrapper: [@sweet-player/react](https://www.npmjs.com/package/@sweet-player/react). Vue wrapper: [@sweet-player/vue](https://www.npmjs.com/package/@sweet-player/vue).

## Install

```bash
npm install @sweet-player/core
```

Or include via `<script>` tag (IIFE build):

```html
<script src="https://unpkg.com/@sweet-player/core/dist/sweet-player.global.js"></script>
<script>
  const player = new SweetPlayer({ container: '#player', src: '...' });
</script>
```

## Usage

```ts
import { SweetPlayer } from '@sweet-player/core';

const player = new SweetPlayer({
  container: '#player',          // Element or CSS selector
  src: 'https://example.com/video.m3u8',
  title: 'Video Title',
  id: 'ep-01',                   // Enables resume playback from last position
  volume: 80,                    // 0-100 (localStorage preference takes priority)
  seekStep: 10,                  // Seek step in seconds
  longSeek: { steps: [10, 30, 60], stepUpInterval: 2000 },
  playbackRates: [0.5, 1, 1.5, 2],
  autoQuality: true,             // Default true: auto-populate quality menu from HLS levels (includes "Auto")
  persist: true,                 // Default true: remember volume/mute/playback rate in localStorage
  autoNext: 5,                   // Auto-play next after 5s countdown on ended (requires onNext)
  locale: 'en',                  // Built-in: 'zh-CN' / 'en'; extend with registerLocale
  onPrev: () => {},
  onNext: () => {},
  onQualityChange: (q) => {},
  onAudioTrackChange: (t) => {},
});

player.on('timeupdate', ({ currentTime, duration }) => {});
player.destroy();
```

## Features

- **Full UI controls**: Play/pause, seek, progress bar (drag + buffer), playback rate, quality, aspect ratio, audio track, volume, fullscreen, PiP
- **Keyboard shortcuts**: Space for play/pause, arrow keys for seeking (hold for accelerating seek 10→30→60 s/s), ↑↓ for volume, F for fullscreen, M for mute
- **Touch gestures**: Horizontal swipe to seek, right-half vertical swipe for volume, double-tap to seek/fullscreen, single tap to toggle controls
- **Auto quality**: HLS multi-level quality/audio tracks auto-populate menus; also supports custom lists
- **Persistence**: Volume/playback rate stored in localStorage; pass `id` for resume playback
- **State overlays**: Buffering spinner, error retry, ended replay + auto-next countdown
- **i18n**: Built-in zh-CN/en, custom languages supported
- **Plugin system**: `plugins` option or `player.use(plugin)` for runtime installation
- **Theming**: Override CSS variables like `--sp-accent`
- **Context menu**: Custom right-click menu with changelog (current version, links to npm), video info (YouTube-style stats panel), shortcuts panel, screenshot
- **Hide controls**: `hiddenControls: ['ratio', 'audioTrack', ...]` to hide specific features (UI only, API and shortcuts unaffected)

## Quality / Audio Tracks

- **Auto mode (default)**: HLS multi-level quality/audio tracks auto-populate menus. Selecting "Auto" lets hls.js ABR decide.
- **Manual mode**: Pass `qualities` / `audioTracks` for custom lists; switching triggers callbacks. Use `setQualities()` / `setAudioTracks()` to update at runtime.

## Plugins

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
// Or at runtime: player.use(myPlugin);
```

### [sweet-subtitle](https://github.com/leuvi/sweet-subtitle) Integration

```bash
npm install sweet-subtitle
```

A plugin factory holds the subtitle instance and exposes a switching API. Swap subtitles at runtime without rebuilding the player:

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

You can also manage it independently: `new SweetSubtitle(player.video, ...)` — just call `sub.destroy()` before destroying the player.

### [sweet-player-gif](https://www.npmjs.com/package/sweet-player-gif) GIF Capture

```bash
npm install sweet-player-gif
```

Once the plugin is registered, a "Capture GIF" option appears in the context menu. Click to capture the last N seconds as a GIF download:

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

Without the plugin, the context menu item won't appear and the core bundle size stays unchanged. See [sweet-player-gif docs](https://www.npmjs.com/package/sweet-player-gif) for options.

## Instance API

`play()` `pause()` `toggle()` `seek(t)` `seekBy(±s)` `setRate(r)` `setVolume(0-100)` `setMuted(b)` `setAspectRatio(r)` `setQualities(list)` `setAudioTracks(list)` `toggleFullscreen()` `togglePip()` `screenshot()` `load(src)` `setTitle(s)` `use(plugin)` `addSettingsRow(section)` `addContextMenuItem(item, index?)` `on/off(event, fn)` `destroy()`

Events: `ready` `play` `pause` `ended` `timeupdate` `ratechange` `volumechange` `fullscreenchange` `pipchange` `aspectratiochange` `qualitychange` `audiotrackchange` `error` `destroy`

## License

MIT
