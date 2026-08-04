import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react';
import { SweetPlayer as CorePlayer, type SweetPlayerOptions } from '@sweet-player/core';

export interface SweetPlayerProps extends Omit<SweetPlayerOptions, 'container'> {
  className?: string;
  style?: CSSProperties;
  onReady?: (player: CorePlayer) => void;
}

// forwardRef 兼容 React 18/19：React 18 中 ref 不作为普通 prop 传入，
// 使用 forwardRef + useImperativeHandle 才能让外部拿到底层 SweetPlayer 实例。
export const SweetPlayer = forwardRef<CorePlayer | null, SweetPlayerProps>(function SweetPlayer(
  { className, style, onReady, src, ...options },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<CorePlayer | null>(null);
  const optionsRef = useRef({ ...options, src, onReady });
  optionsRef.current = { ...options, src, onReady };

  // useImperativeHandle 的 factory 在 commit 阶段执行，早于创建 player 的 useEffect。
  // 因此直接返回 ref.current——它会在 effect 中被赋值，父组件通过 ref.current 拿到实例。
  useImperativeHandle(ref, () => playerRef.current as CorePlayer);

  useEffect(() => {
    if (!containerRef.current) return;
    const { onReady: ready, ...opts } = optionsRef.current;
    const player = new CorePlayer({ ...opts, container: containerRef.current });
    playerRef.current = player;
    ready?.(player);
    return () => {
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

  useEffect(() => {
    if (options.id) playerRef.current?.setId(options.id);
  }, [options.id]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
});
