# @sweet-player/vue

Vue component wrapper for [@sweet-player/core](https://www.npmjs.com/package/@sweet-player/core).

**Live Demo: [player.sweetui.com](https://player.sweetui.com)**

## Install

```bash
npm install @sweet-player/vue
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SweetPlayer } from '@sweet-player/vue';
import type { SweetPlayerCore } from '@sweet-player/vue';

const player = ref<SweetPlayerCore | null>(null);

function onReady(p: SweetPlayerCore) {
  player.value = p;
}
</script>

<template>
  <SweetPlayer
    src="https://example.com/video.m3u8"
    title="Video Title"
    id="ep-01"
    :volume="80"
    :seek-step="10"
    :auto-next="5"
    @ready="onReady"
    @next="() => console.log('next')"
  />
</template>
```

## Props

All `@sweet-player/core` options (except `container`) can be passed as props:

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | Video URL (.m3u8 or regular video) |
| `title` | `string` | Title displayed in the top-left corner |
| `id` | `string` | Enables resume playback from last position |
| `volume` | `number` | Volume 0-100 |
| `seekStep` | `number` | Seek step in seconds |
| `autoNext` | `boolean \| number` | Auto-play next on ended (number = countdown seconds) |
| `locale` | `string` | Language (built-in: zh-CN / en) |
| `plugins` | `SweetPlayerPlugin[]` | Plugin list |
| ... | | [Full options in core docs](https://www.npmjs.com/package/@sweet-player/core) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@ready` | `SweetPlayerCore` | Player instance created |
| `@prev` | — | Previous clicked |
| `@next` | — | Next clicked |
| `@qualityChange` | `QualityLevel` | Quality changed |
| `@audioTrackChange` | `AudioTrackInfo` | Audio track changed |

## Instance Methods

Access the player instance via `@ready` event, then call any method:

```ts
player.value?.play();
player.value?.seek(60);
player.value?.setVolume(50);
player.value?.toggleFullscreen();
player.value?.togglePip();
```

## License

MIT
