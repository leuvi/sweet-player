# @sweet-player/react

[@sweet-player/core](https://www.npmjs.com/package/@sweet-player/core) 的 React 组件封装，支持 React 18 / 19。

## 安装

```bash
npm install @sweet-player/react
```

## 使用

```tsx
import { useRef } from 'react';
import { SweetPlayer, type SweetPlayerCore } from '@sweet-player/react';

function App() {
  const ref = useRef<SweetPlayerCore | null>(null);

  return (
    <SweetPlayer
      ref={ref}
      src="https://example.com/video.m3u8"
      title="影片标题"
      id="ep-01"
      volume={80}
      seekStep={10}
      autoNext={5}
      onNext={() => console.log('next')}
    />
  );
}

// 通过 ref 访问播放器实例
ref.current?.seekBy(30);
ref.current?.setRate(1.5);
ref.current?.toggleFullscreen();
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
| `onPrev` | `() => void` | 上一个回调 |
| `onNext` | `() => void` | 下一个回调 |
| ... | | [完整选项见 core 文档](https://www.npmjs.com/package/@sweet-player/core) |

## Ref

通过 `ref` 获取 `SweetPlayer` 实例，可调用所有实例方法：

```ts
ref.current?.play();
ref.current?.pause();
ref.current?.seek(60);
ref.current?.setVolume(50);
ref.current?.togglePip();
ref.current?.destroy();
```

## License

MIT
