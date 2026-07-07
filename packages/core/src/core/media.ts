import Hls from 'hls.js';
import type { EventEmitter } from './events';

function isHlsSource(src: string): boolean {
  return /\.m3u8($|\?)/i.test(src);
}

export interface HlsLevelInfo {
  /** hls.js level 索引，-1 表示自动 */
  index: number;
  height: number;
  bitrate: number;
  label: string;
}

export interface HlsAudioTrackInfo {
  index: number;
  label: string;
}

export interface MediaCallbacks {
  /** manifest 解析出多个画质档位时回调（含"自动"档 index=-1） */
  onLevels?(levels: HlsLevelInfo[]): void;
  onAudioTracks?(tracks: HlsAudioTrackInfo[]): void;
}

/**
 * 媒体加载层：m3u8 优先走 hls.js，不支持 MSE 时回退 Safari 原生 HLS，
 * 其余格式直接赋给 video.src。
 */
export class MediaController {
  hls: Hls | null = null;
  /** 最近一次加载的地址，错误重试用 */
  currentSrc = '';

  constructor(
    private video: HTMLVideoElement,
    private emitter: EventEmitter,
    private hlsConfig?: Record<string, unknown>,
    private callbacks: MediaCallbacks = {},
  ) {}

  load(src: string): void {
    this.detachHls();
    this.currentSrc = src;

    if (isHlsSource(src)) {
      if (Hls.isSupported()) {
        this.hls = new Hls(this.hlsConfig);
        this.hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                this.emitter.emit('error', { type: 'hls-network', detail: data });
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                this.hls?.recoverMediaError();
                break;
              default:
                this.emitter.emit('error', { type: 'hls-fatal', detail: data });
                this.detachHls();
            }
          }
        });
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.notifyTracks();
        });
        this.hls.loadSource(src);
        this.hls.attachMedia(this.video);
        return;
      }
      if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.video.src = src;
        return;
      }
      this.emitter.emit('error', { type: 'hls-unsupported' });
      return;
    }

    this.video.src = src;
  }

  /** 重新加载当前地址（错误重试） */
  reload(): void {
    if (this.currentSrc) this.load(this.currentSrc);
  }

  private notifyTracks(): void {
    if (!this.hls) return;
    if (this.hls.levels.length > 1 && this.callbacks.onLevels) {
      const levels: HlsLevelInfo[] = this.hls.levels
        .map((l, i) => ({
          index: i,
          height: l.height,
          bitrate: l.bitrate,
          label: l.height ? `${l.height}P` : `${Math.round(l.bitrate / 1000)}kbps`,
        }))
        .sort((a, b) => b.height - a.height);
      this.callbacks.onLevels(levels);
    }
    if (this.hls.audioTracks.length > 1 && this.callbacks.onAudioTracks) {
      this.callbacks.onAudioTracks(
        this.hls.audioTracks.map((t, i) => ({ index: i, label: t.name || t.lang || `Track ${i + 1}` })),
      );
    }
  }

  /** 切换 hls 画质档位，-1 为自动 */
  setLevel(index: number): void {
    if (this.hls) this.hls.currentLevel = index;
  }

  setAudioTrack(index: number): void {
    if (this.hls) this.hls.audioTrack = index;
  }

  /** hls.js 带宽估算（bps），统计面板用 */
  get bandwidthEstimate(): number | undefined {
    return this.hls?.bandwidthEstimate;
  }

  /** 当前 hls level 描述，统计面板用 */
  get currentLevelInfo(): string | undefined {
    if (!this.hls || this.hls.currentLevel < 0) return undefined;
    const level = this.hls.levels[this.hls.currentLevel];
    if (!level) return undefined;
    return `${level.width}x${level.height}@${Math.round(level.bitrate / 1000)}kbps`;
  }

  private detachHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  destroy(): void {
    this.detachHls();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
