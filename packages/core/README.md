# @sweet-player/core

A custom video player supporting HLS (hls.js) and MPEG-DASH (dashjs). Zero framework dependency, written in TypeScript. Supports vanilla JS / React / Vue.

**Live Demo: [player.sweetui.com](https://player.sweetui.com)**

> React wrapper: [@sweet-player/react](https://www.npmjs.com/package/@sweet-player/react). Vue wrapper: [@sweet-player/vue](https://www.npmjs.com/package/@sweet-player/vue).

## Install

```bash
npm install @sweet-player/core
```

`hls.js` and `dashjs` are loaded on demand: `.m3u8` sources pull in `hls.js`, `.mpd` sources pull in `dashjs`, any other source plays through the native `<video>`. Only the engine you actually use is downloaded.

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
  autoQuality: true,             // Default true: auto-populate quality menu from HLS/DASH levels (includes "Auto")
  persist: true,                 // Default true: remember volume/mute/playback rate in localStorage
  autoNext: 5,                   // Auto-play next after 5s countdown on ended (requires onNext)
  locale: 'en',                  // Built-in: 'zh-CN' / 'en'; extend with registerLocale
  hlsConfig: {},                 // Passed through to `new Hls(config)` for .m3u8 sources
  dashConfig: {},                // Passed through to dashjs `updateSettings` for .mpd sources
  onPrev: () => {},
  onNext: () => {},
  onQualityChange: (q) => {},
  onAudioTrackChange: (t) => {},
});

player.on('timeupdate', ({ currentTime, duration }) => {});
player.destroy();
```

## Features

- **Full UI controls**: Play/pause, seek, progress bar (drag + buffer), playback rate, quality, aspect ratio, audio track, volume, browser & web fullscreen, PiP
- **Keyboard shortcuts**: Space for play/pause, arrow keys for seeking (hold for accelerating seek 10→30→60 s/s), ↑↓ for volume, F for browser fullscreen, W for web fullscreen (works inside iframes without `allow="fullscreen"`), M for mute
- **Touch gestures**: Horizontal swipe to seek, right-half vertical swipe for volume, double-tap to seek/fullscreen, single tap to toggle controls
- **Auto quality**: HLS / DASH multi-level quality/audio tracks auto-populate menus; also supports custom lists
- **Persistence**: Volume/playback rate stored in localStorage; pass `id` for resume playback
- **Heatmap**: Optional "most replayed" curve above the progress bar (pass `heatmap`)
- **Poster & preview thumbnails**: Cover image before playback (`poster`), progress-bar hover preview from a WebVTT track (`thumbnails`)
- **State overlays**: Buffering spinner, error retry, ended replay + auto-next countdown
- **i18n**: Built-in zh-CN/en, custom languages supported
- **Plugin system**: `plugins` option or `player.use(plugin)` for runtime installation
- **Theming**: Override CSS variables like `--sp-accent`
- **Context menu**: Custom right-click menu with changelog (current version, links to npm), video info (YouTube-style stats panel), shortcuts panel, screenshot
- **Hide controls**: `hiddenControls: ['ratio', 'audioTrack', ...]` to hide specific features (UI only, API and shortcuts unaffected)

## Quality / Audio Tracks

- **Auto mode (default)**: HLS / DASH multi-level quality/audio tracks auto-populate menus. Selecting "Auto" lets the underlying engine's ABR decide.
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

### [sweet-player-gif](https://github.com/leuvi/sweet-player-gif) GIF Capture

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

Without the plugin, the context menu item won't appear and the core bundle size stays unchanged. See [sweet-player-gif docs](https://github.com/leuvi/sweet-player-gif) for options.

### [sweet-danmaku](https://github.com/leuvi/sweet-danmaku) Danmaku (Bullet Comments)

```bash
npm install sweet-danmaku
```

The built-in plugin factory adds a danmaku overlay synced with video playback, with toggle and opacity controls in the settings panel:

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

danmaku.send({ text: 'New comment', time: player.video.currentTime });
```

See [sweet-danmaku docs](https://github.com/leuvi/sweet-danmaku) for all options.

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
- `value` — replay/heat intensity, **any non-negative number** (normalized internally by the max)
- Denser samples produce a smoother curve

Fetch aggregated play counts from your backend, then create the player — the response is a plain JSON array where `value` can be the raw count per time bucket:

```ts
const heatmap = await fetch(`/api/videos/${id}/heatmap`).then((r) => r.json());
new SweetPlayer({ container: '#player', src, heatmap });
```

To disable it entirely (no curve logic initialized), add `'heatmap'` to `hiddenControls`.

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

## Instance API

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
| `toggleFullscreen()` | Enter / exit browser fullscreen (Fullscreen API). |
| `toggleWebFullscreen()` | Enter / exit **web fullscreen** — CSS-only, fills the browser viewport. Works inside iframes without `allow="fullscreen"`. |
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
| `fullscreenchange` | `boolean` (is fullscreen) | Browser fullscreen state changes. |
| `webfullscreenchange` | `boolean` (is web fullscreen) | Web fullscreen state changes. |
| `pipchange` | `boolean` (is in PiP) | Picture-in-Picture state changes. |
| `aspectratiochange` | `AspectRatio` | The forced aspect ratio changes. |
| `qualitychange` | `QualityLevel` | Quality is switched. |
| `audiotrackchange` | `AudioTrackInfo` | Audio track is switched. |
| `error` | `{ type, detail? }` | Playback or network error occurs. |
| `destroy` | — | `destroy()` is called. |

## License

MIT
