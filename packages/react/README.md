# @sweet-player/react

React component wrapper for [@sweet-player/core](https://www.npmjs.com/package/@sweet-player/core).

**Live Demo: [player.sweetui.com](https://player.sweetui.com)**

## Install

```bash
npm install @sweet-player/react
```

## Usage

```tsx
import { useRef } from 'react';
import { SweetPlayer, type SweetPlayerCore } from '@sweet-player/react';

function App() {
  const ref = useRef<SweetPlayerCore | null>(null);

  return (
    <SweetPlayer
      ref={ref}
      src="https://example.com/video.m3u8"
      title="Video Title"
      id="ep-01"
      volume={80}
      seekStep={10}
      autoNext={5}
      onNext={() => console.log('next')}
    />
  );
}

// Access the player instance via ref
ref.current?.seekBy(30);
ref.current?.setRate(1.5);
ref.current?.toggleFullscreen();
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
| `onPrev` | `() => void` | Previous callback |
| `onNext` | `() => void` | Next callback |
| ... | | [Full options in core docs](https://www.npmjs.com/package/@sweet-player/core) |

## Ref

Access the `SweetPlayer` instance via `ref` to call any instance method:

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
