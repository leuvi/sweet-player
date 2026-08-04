import { forwardRef, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { SweetPlayer as CorePlayer, type SweetPlayerOptions } from '@sweet-player/core';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface SweetPlayerProps extends Omit<SweetPlayerOptions, 'container'> {
  className?: string;
  style?: CSSProperties;
  onReady?: (player: CorePlayer) => void;
}

// forwardRef 兼容 React 18/19：React 18 中 ref 不作为普通 prop 传入。
// 不用 useImperativeHandle——它的 factory 在 commit 阶段执行，早于创建 player 的
// useEffect，且 effect 赋值 playerRef.current 不触发 render，导致首次挂载 ref 恒为 null。
// forwarded ref 由单独的 [ref] layout effect 维护，支持运行时更换 ref（如 inline callback ref）。
export const SweetPlayer = forwardRef<CorePlayer | null, SweetPlayerProps>(function SweetPlayer(
  { className, style, onReady, src, ...options },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<CorePlayer | null>(null);
  const optionsRef = useRef({ ...options, src, onReady });
  optionsRef.current = { ...options, src, onReady };
  const hasOnNext = options.onNext !== undefined;
  const hasOnPrev = options.onPrev !== undefined;
  const hasOnQualityChange = options.onQualityChange !== undefined;
  const hasOnAudioTrackChange = options.onAudioTrackChange !== undefined;
  const hasOnSavePrefs = options.onSavePrefs !== undefined;
  const hasOnSaveProgress = options.onSaveProgress !== undefined;

  // 稳定回调代理：CorePlayer 构造时捕获这些函数引用，代理内部转发到最新 props，
  // 避免 onNext/onPrev/onSavePrefs 等运行时更新后仍调用旧闭包。
  // 注意：必须直接返回原 callback 的结果（void | Promise<void>），不能 void 掉——
  // core 的 save queue 靠返回值判断异步，void 掉会破坏单飞和写入顺序。
  const callbacksRef = useRef({
    onNext: () => optionsRef.current.onNext?.(),
    onPrev: () => optionsRef.current.onPrev?.(),
    onQualityChange: (q: Parameters<NonNullable<SweetPlayerOptions['onQualityChange']>>[0]) =>
      optionsRef.current.onQualityChange?.(q),
    onAudioTrackChange: (t: Parameters<NonNullable<SweetPlayerOptions['onAudioTrackChange']>>[0]) =>
      optionsRef.current.onAudioTrackChange?.(t),
    onSavePrefs: (p: Parameters<NonNullable<SweetPlayerOptions['onSavePrefs']>>[0]) =>
      optionsRef.current.onSavePrefs?.(p) as void | Promise<void> | undefined,
    onSaveProgress: (id: string, s: number | null) =>
      optionsRef.current.onSaveProgress?.(id, s) as void | Promise<void> | undefined,
  });

  useBrowserLayoutEffect(() => {
    if (!containerRef.current) return;
    const { onReady: _ready, onNext, onPrev, onQualityChange, onAudioTrackChange, onSavePrefs, onSaveProgress, ...opts } =
      optionsRef.current;
    const player = new CorePlayer({
      ...opts,
      container: containerRef.current,
      // 仅在用户显式传入时才传代理，否则保持 undefined：
      // ① core 靠回调是否存在区分本地存储与远端存储——无条件传代理会关闭默认持久化；
      // ② 无条件传 onNext/onPrev 会让前后集按钮误显示为可用。
      ...(onNext !== undefined && { onNext: callbacksRef.current.onNext }),
      ...(onPrev !== undefined && { onPrev: callbacksRef.current.onPrev }),
      ...(onQualityChange !== undefined && { onQualityChange: callbacksRef.current.onQualityChange }),
      ...(onAudioTrackChange !== undefined && { onAudioTrackChange: callbacksRef.current.onAudioTrackChange }),
      ...(onSavePrefs !== undefined && { onSavePrefs: callbacksRef.current.onSavePrefs }),
      ...(onSaveProgress !== undefined && { onSaveProgress: callbacksRef.current.onSaveProgress }),
    });
    playerRef.current = player;
    optionsRef.current.onReady?.(player);
    return () => {
      playerRef.current = null;
      player.destroy();
    };
    // 仅在挂载时创建；src/id/title 变化通过下方 effect 增量更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 单独维护 forwarded ref：父组件可能运行时更换 ref（inline callback ref 每次 render 都是新函数），
  // 挂载 effect 只捕获首次 ref，这里按 [ref] 同步旧/新 ref。
  useBrowserLayoutEffect(() => {
    const player = playerRef.current;
    if (typeof ref === 'function') ref(player);
    else if (ref) ref.current = player;
    return () => {
      if (typeof ref === 'function') ref(null);
      else if (ref) ref.current = null;
    };
  }, [ref]);

  // 代理引用保持稳定，仅在回调“有/无”切换时同步 core；替换函数本身不会重订阅。
  useBrowserLayoutEffect(() => {
    playerRef.current?.setCallbacks({
      onNext: hasOnNext ? callbacksRef.current.onNext : undefined,
      onPrev: hasOnPrev ? callbacksRef.current.onPrev : undefined,
      onQualityChange: hasOnQualityChange ? callbacksRef.current.onQualityChange : undefined,
      onAudioTrackChange: hasOnAudioTrackChange ? callbacksRef.current.onAudioTrackChange : undefined,
      onSavePrefs: hasOnSavePrefs ? callbacksRef.current.onSavePrefs : undefined,
      onSaveProgress: hasOnSaveProgress ? callbacksRef.current.onSaveProgress : undefined,
    });
  }, [
    hasOnNext,
    hasOnPrev,
    hasOnQualityChange,
    hasOnAudioTrackChange,
    hasOnSavePrefs,
    hasOnSaveProgress,
  ]);

  // id 必须先于 src 更新：setId 保存旧进度依赖旧媒体 currentTime，
  // 若先 load 换源，旧媒体被 detach/重置，进度会丢失。
  useEffect(() => {
    playerRef.current?.setId(options.id ?? null);
  }, [options.id]);

  useEffect(() => {
    const player = playerRef.current;
    if (player && src && player.video.currentSrc !== src) player.load(src);
  }, [src]);

  useEffect(() => {
    playerRef.current?.setTitle(options.title ?? '');
  }, [options.title]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
});
