import { useEffect, useRef, type CSSProperties, type Ref } from 'react';
import { SweetPlayer as CorePlayer, type SweetPlayerOptions } from '@sweet-player/core';

export interface SweetPlayerProps extends Omit<SweetPlayerOptions, 'container'> {
  className?: string;
  style?: CSSProperties;
  /** 拿到底层 SweetPlayer 实例（React 19 直接用 ref prop） */
  ref?: Ref<CorePlayer | null>;
  onReady?: (player: CorePlayer) => void;
}

function assignRef(ref: Ref<CorePlayer | null> | undefined, value: CorePlayer | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export function SweetPlayer({ className, style, ref, onReady, src, ...options }: SweetPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<CorePlayer | null>(null);
  const optionsRef = useRef({ ...options, src, onReady });
  optionsRef.current = { ...options, src, onReady };

  useEffect(() => {
    if (!containerRef.current) return;
    const { onReady: ready, ...opts } = optionsRef.current;
    const player = new CorePlayer({ ...opts, container: containerRef.current });
    playerRef.current = player;
    assignRef(ref, player);
    ready?.(player);
    return () => {
      assignRef(ref, null);
      playerRef.current = null;
      player.destroy();
    };
    // 仅在挂载时创建；src/title 变化通过下方 effect 增量更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (player && src && player.video.currentSrc !== src) player.load(src);
  }, [src]);

  useEffect(() => {
    playerRef.current?.setTitle(options.title ?? '');
  }, [options.title]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
}
