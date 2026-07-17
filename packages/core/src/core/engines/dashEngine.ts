import * as dashjs from 'dashjs';
import { log } from '../../logger';
import { buildLevelLabels, type AudioTrackInfo, type EngineCallbacks, type LevelInfo, type MediaEngine } from './types';

export function createDashEngine(
  video: HTMLVideoElement,
  src: string,
  callbacks: EngineCallbacks,
  config?: Record<string, unknown>,
): MediaEngine {
  return new DashEngine(video, src, callbacks, config);
}

class DashEngine implements MediaEngine {
  private player: dashjs.MediaPlayerClass;

  constructor(
    private video: HTMLVideoElement,
    src: string,
    private callbacks: EngineCallbacks,
    config?: Record<string, unknown>,
  ) {
    this.player = dashjs.MediaPlayer().create();
    // 关闭默认 debug，避免噪音；仍保留 error/warning
    this.player.updateSettings({ debug: { logLevel: dashjs.Debug.LOG_LEVEL_WARNING } });
    if (config) this.player.updateSettings(config);

    const evts = dashjs.MediaPlayer.events;
    this.player.on(evts.STREAM_INITIALIZED, () => {
      log('dash事件', '流初始化完成');
      this.notifyTracks();
    });
    this.player.on(evts.ERROR, (e) => {
      // dash.js 的错误分很多子形态；除 MediaSource/网络等致命外，其它 warning-like 事件不上抛
      const detail = e as unknown as { error?: unknown; event?: unknown };
      const errStr = String((detail as { error?: string }).error ?? '');
      log('dash事件', `错误: ${errStr}`);
      if (errStr === 'download' || errStr === 'manifestError') {
        this.callbacks.onError({ type: 'dash-network', detail });
      } else if (errStr === 'capability' || errStr === 'mediasource') {
        this.callbacks.onError({ type: 'dash-fatal', detail });
      }
    });
    this.player.on(evts.QUALITY_CHANGE_RENDERED, (e) => {
      const data = e as unknown as { mediaType?: string; newQuality?: number };
      if (data.mediaType !== 'video') return;
      const reps = this.player.getRepresentationsByType('video');
      const rep = reps[data.newQuality ?? -1];
      const label = rep?.height ? `${rep.height}P` : `Level ${data.newQuality}`;
      log('dash事件', `画质档位切换: ${label}`);
    });

    this.player.initialize(video, src, false);
  }

  private notifyTracks(): void {
    const reps = this.player.getRepresentationsByType('video');
    if (reps.length > 1 && this.callbacks.onLevels) {
      const labels = buildLevelLabels(reps.map((r) => ({ height: r.height, bitrate: r.bandwidth })));
      const levels: LevelInfo[] = reps
        .map((r, i) => ({ index: r.index, height: r.height, bitrate: r.bandwidth, label: labels[i] }))
        .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);
      this.callbacks.onLevels(levels);
    }

    const audioTracks = this.player.getTracksFor('audio');
    if (audioTracks.length > 1 && this.callbacks.onAudioTracks) {
      const tracks: AudioTrackInfo[] = audioTracks.map((t, i) => ({
        index: i,
        label: t.labels?.[0]?.text || t.lang || `Track ${i + 1}`,
      }));
      this.callbacks.onAudioTracks(tracks);
    }
  }

  setLevel(index: number): void {
    if (index < 0) {
      // 打开 ABR 自动切换
      this.player.updateSettings({
        streaming: { abr: { autoSwitchBitrate: { video: true } } },
      });
    } else {
      this.player.updateSettings({
        streaming: { abr: { autoSwitchBitrate: { video: false } } },
      });
      this.player.setRepresentationForTypeByIndex('video', index);
    }
  }

  setAudioTrack(index: number): void {
    const audioTracks = this.player.getTracksFor('audio');
    const target = audioTracks[index];
    if (target) this.player.setCurrentTrack(target);
  }

  get bandwidthEstimate(): number | undefined {
    // dash.js 返回 kbps；hls.js 返回 bps —— 统一按 bps
    const kbps = this.player.getAverageThroughput('video');
    return Number.isFinite(kbps) && kbps > 0 ? kbps * 1000 : undefined;
  }

  get currentLevelInfo(): string | undefined {
    const rep = this.player.getCurrentRepresentationForType('video');
    if (!rep) return undefined;
    return `${rep.width}x${rep.height}@${Math.round(rep.bandwidth / 1000)}kbps`;
  }

  destroy(): void {
    try {
      this.player.destroy();
    } catch {
      /* dash.js destroy 在某些异常态可能抛，忽略 */
    }
    // dash.js destroy 未必彻底清理 video 属性
    this.video.removeAttribute('src');
    this.video.load();
  }
}
