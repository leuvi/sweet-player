import Hls from 'hls.js';
import { log } from '../../logger';
import { buildLevelLabels, type AudioTrackInfo, type EngineCallbacks, type LevelInfo, type MediaEngine } from './types';

export function createHlsEngine(
  video: HTMLVideoElement,
  src: string,
  callbacks: EngineCallbacks,
  config?: Record<string, unknown>,
): MediaEngine {
  const engine = new HlsEngine(video, callbacks, config);
  engine.load(src);
  return engine;
}

/** 网络错误最多自动 startLoad() 恢复的次数（累计成功 frag 加载后重置） */
const NETWORK_RETRY_LIMIT = 2;
/** 媒体错误最多自动 recoverMediaError() 恢复的次数（成功 frag 加载后重置） */
const MEDIA_RETRY_LIMIT = 2;

class HlsEngine implements MediaEngine {
  private hls: Hls;
  private networkRetries = 0;
  private mediaRetries = 0;

  constructor(
    private video: HTMLVideoElement,
    private callbacks: EngineCallbacks,
    config?: Record<string, unknown>,
  ) {
    this.hls = new Hls(config);
    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      log('hls事件', '媒体成功附加到播放器');
    });
    // 分片成功加载即视为已恢复，重置重试计数
    this.hls.on(Hls.Events.FRAG_LOADED, () => {
      this.networkRetries = 0;
      this.mediaRetries = 0;
    });
    this.hls.on(Hls.Events.ERROR, (_event, data) => {
      log('hls事件', `${data.fatal ? '致命' : ''}错误: ${data.type} - ${data.details}`);
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          // 有限次尝试 startLoad() 恢复；超限后再上报错误蒙层
          if (this.networkRetries < NETWORK_RETRY_LIMIT) {
            this.networkRetries++;
            log('hls事件', `网络错误自动重试 ${this.networkRetries}/${NETWORK_RETRY_LIMIT}`);
            try {
              this.hls.startLoad();
              return;
            } catch (err) {
              log('hls事件', `startLoad 失败: ${String(err)}`);
            }
          }
          this.callbacks.onError({ type: 'hls-network', detail: data });
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          // 有限次尝试 recoverMediaError() 恢复；超限后上报错误蒙层
          if (this.mediaRetries < MEDIA_RETRY_LIMIT) {
            this.mediaRetries++;
            log('hls事件', `媒体错误自动重试 ${this.mediaRetries}/${MEDIA_RETRY_LIMIT}`);
            this.hls.recoverMediaError();
            return;
          }
          this.callbacks.onError({ type: 'hls-media', detail: data });
          break;
        default:
          this.callbacks.onError({ type: 'hls-fatal', detail: data });
      }
    });
    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      log('hls事件', '播放清单解析完毕');
      this.notifyTracks();
    });
    this.hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const level = this.hls.levels[data.level];
      const label = level?.height ? `${level.height}P` : `Level ${data.level}`;
      log('hls事件', `画质档位切换: ${label}`);
    });
  }

  load(src: string): void {
    this.hls.loadSource(src);
    this.hls.attachMedia(this.video);
  }

  private notifyTracks(): void {
    if (this.hls.levels.length > 1 && this.callbacks.onLevels) {
      const labels = buildLevelLabels(this.hls.levels.map((l) => ({ height: l.height, bitrate: l.bitrate })));
      const levels: LevelInfo[] = this.hls.levels
        .map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate, label: labels[i] }))
        .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);
      this.callbacks.onLevels(levels);
    }
    if (this.hls.audioTracks.length > 1 && this.callbacks.onAudioTracks) {
      const tracks: AudioTrackInfo[] = this.hls.audioTracks.map((t, i) => ({
        index: i,
        label: t.name || t.lang || `Track ${i + 1}`,
      }));
      this.callbacks.onAudioTracks(tracks);
    }
  }

  setLevel(index: number): void {
    this.hls.currentLevel = index;
  }

  setAudioTrack(index: number): void {
    this.hls.audioTrack = index;
  }

  get bandwidthEstimate(): number | undefined {
    return this.hls.bandwidthEstimate;
  }

  get currentLevelInfo(): string | undefined {
    if (this.hls.currentLevel < 0) return undefined;
    const level = this.hls.levels[this.hls.currentLevel];
    if (!level) return undefined;
    return `${level.width}x${level.height}@${Math.round(level.bitrate / 1000)}kbps`;
  }

  destroy(): void {
    try {
      this.hls.destroy();
    } catch {
      /* hls.js destroy 在异常态可能抛，忽略以免中断上层清理 */
    }
  }
}
