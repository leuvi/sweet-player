import type { EventEmitter } from './events';
import { log } from '../logger';
import type { EngineCallbacks, MediaEngine } from './engines/types';

// 类型再导出：老代码引用 HlsLevelInfo/HlsAudioTrackInfo 的地方仍能工作
export type { LevelInfo as HlsLevelInfo, AudioTrackInfo as HlsAudioTrackInfo } from './engines/types';

function isHlsSource(src: string): boolean {
  return /\.m3u8($|\?)/i.test(src);
}

function isDashSource(src: string): boolean {
  return /\.mpd($|\?)/i.test(src);
}

export interface MediaCallbacks {
  onLevels?: EngineCallbacks['onLevels'];
  onAudioTracks?: EngineCallbacks['onAudioTracks'];
}

/**
 * 媒体编排层：按 src 类型选择引擎（hls.js / dash.js）动态加载，
 * 其余格式直接赋给 video.src。原生 HLS（Safari）在 hls.js 不支持时降级使用。
 */
export class MediaController {
  private engine: MediaEngine | null = null;
  /** 每次 load 递增，避免异步 import 竞态：后来的 load 应该覆盖先来的 */
  private loadSeq = 0;
  /** 首次 hls.js 探测发现只能走原生 HLS 后缓存，避免 reload 每次重新 import hls.js */
  private nativeHlsOnly = false;
  currentSrc = '';

  constructor(
    private video: HTMLVideoElement,
    private emitter: EventEmitter,
    private hlsConfig?: Record<string, unknown>,
    private callbacks: MediaCallbacks = {},
    private dashConfig?: Record<string, unknown>,
  ) {}

  load(src: string): void {
    const seq = ++this.loadSeq;
    this.detachEngine();
    this.currentSrc = src;
    log('播放器', `加载源: ${src}`);

    const engineCallbacks: EngineCallbacks = {
      onLevels: this.callbacks.onLevels,
      onAudioTracks: this.callbacks.onAudioTracks,
      onError: (payload) => this.emitter.emit('error', payload),
    };

    if (isDashSource(src)) {
      void (async () => {
        try {
          const { createDashEngine } = await import('./engines/dashEngine');
          if (seq !== this.loadSeq) return; // 被后续 load 覆盖，丢弃本次
          this.engine = createDashEngine(this.video, src, engineCallbacks, this.dashConfig);
        } catch (err) {
          if (seq !== this.loadSeq) return;
          log('dash事件', `引擎加载失败: ${String(err)}`);
          this.emitter.emit('error', { type: 'dash-unsupported', detail: err });
        }
      })();
      return;
    }

    if (isHlsSource(src)) {
      // 已探测过：Safari 原生 HLS 分支，直接赋 src，跳过 hls.js 动态 import
      if (this.nativeHlsOnly) {
        this.video.src = src;
        return;
      }
      void (async () => {
        try {
          const [{ createHlsEngine }, { default: Hls }] = await Promise.all([
            import('./engines/hlsEngine'),
            import('hls.js'),
          ]);
          if (seq !== this.loadSeq) return;
          if (Hls.isSupported()) {
            this.engine = createHlsEngine(this.video, src, engineCallbacks, this.hlsConfig);
            return;
          }
          if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.nativeHlsOnly = true;
            this.video.src = src;
            return;
          }
          this.emitter.emit('error', { type: 'hls-unsupported' });
        } catch (err) {
          if (seq !== this.loadSeq) return;
          log('hls事件', `引擎加载失败: ${String(err)}`);
          this.emitter.emit('error', { type: 'hls-unsupported', detail: err });
        }
      })();
      return;
    }

    this.video.src = src;
  }

  /** 重新加载当前地址（错误重试） */
  reload(): void {
    if (this.currentSrc) this.load(this.currentSrc);
  }

  /** 切换当前引擎的画质档位，-1 为自动 */
  setLevel(index: number): void {
    this.engine?.setLevel(index);
  }

  setAudioTrack(index: number): void {
    this.engine?.setAudioTrack(index);
  }

  /** 当前引擎带宽估算（bps），统计面板用 */
  get bandwidthEstimate(): number | undefined {
    return this.engine?.bandwidthEstimate;
  }

  /** 当前档位描述，统计面板用 */
  get currentLevelInfo(): string | undefined {
    return this.engine?.currentLevelInfo;
  }

  private detachEngine(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
  }

  destroy(): void {
    this.loadSeq++; // 让任何进行中的异步 load 失效
    this.detachEngine();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
