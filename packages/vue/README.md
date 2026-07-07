# @sweet-player/vue

[@sweet-player/core](https://www.npmjs.com/package/@sweet-player/core) 的 Vue 3 组件封装。

## 安装

```bash
npm install @sweet-player/vue
```

## 使用

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
    title="影片标题"
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

所有 `@sweet-player/core` 的选项（除 `container`）均可作为 props 传入：

| Prop | 类型 | 说明 |
|------|------|------|
| `src` | `string` | 视频地址（.m3u8 或普通视频） |
| `title` | `string` | 左上角标题 |
| `id` | `string` | 传入后自动断点续播 |
| `volume` | `number` | 音量 0-100 |
| `seekStep` | `number` | 快进快退秒数 |
| `autoNext` | `boolean \| number` | 播完自动下一个（数字为倒计时秒数） |
| `locale` | `string` | 语言（内置 zh-CN / en） |
| `plugins` | `SweetPlayerPlugin[]` | 插件列表 |
| ... | | [完整选项见 core 文档](https://www.npmjs.com/package/@sweet-player/core) |

## Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `@ready` | `SweetPlayerCore` | 播放器实例创建完成 |
| `@prev` | — | 点击上一个 |
| `@next` | — | 点击下一个 |
| `@qualityChange` | `QualityLevel` | 画质切换 |
| `@audioTrackChange` | `AudioTrackInfo` | 音轨切换 |

## 实例方法

通过 `@ready` 事件获取播放器实例后，可调用所有方法：

```ts
player.value?.play();
player.value?.seek(60);
player.value?.setVolume(50);
player.value?.toggleFullscreen();
player.value?.togglePip();
```

## License

MIT
