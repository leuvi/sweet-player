import type { SettingsSection } from './ui/components/settingsPanel';
import type { ContextMenuItem } from './ui/components/contextMenu';

export interface QualityLevel {
  /** 显示名称，如 "1080P" */
  label: string;
  /** 业务自定义值，切换时原样回传给 onQualityChange */
  value: string | number;
  /** 可选：该画质对应的播放地址（传入时切换会自动 load） */
  src?: string;
}

export interface AudioTrackInfo {
  label: string;
  value: string | number;
}

/** 热度曲线数据点（如"最多重播"） */
export interface HeatmapPoint {
  /** 时间点（秒） */
  time: number;
  /** 热度值（任意非负数，内部按最大值归一化） */
  value: number;
}

export type AspectRatio = 'original' | '21:9' | '16:9' | '4:3' | (string & {});

export interface LongSeekOptions {
  /** 长按阶梯步长（秒），按住时逐级升档，默认 [10, 30, 60] */
  steps?: number[];
  /** 每隔多少毫秒升一档，默认 2000 */
  stepUpInterval?: number;
}

/** 可通过 hiddenControls 隐藏的 UI 功能名（只影响显示，不影响 API 与快捷键） */
export type ControlName =
  | 'prev'
  | 'seekBack'
  | 'play'
  | 'seekForward'
  | 'next'
  | 'time'
  | 'rate'
  | 'quality'
  | 'ratio'
  | 'audioTrack'
  | 'volume'
  | 'pip'
  | 'heatmap'
  | 'thumbnails'
  | 'poster'
  | 'fullscreen'
  | 'webFullscreen'
  | 'settings'
  | 'title'
  | 'progress'
  | 'contextMenu';

/** 播放器插件：apply 在实例化末尾调用，可返回清理函数（destroy 时执行） */
export interface SweetPlayerPlugin {
  name: string;
  apply(player: SweetPlayerLike): void | (() => void);
}

/** 插件拿到的最小接口（即 SweetPlayer 实例，避免类型循环引用） */
export interface SweetPlayerLike {
  container: HTMLElement;
  video: HTMLVideoElement;
  on<K extends keyof PlayerEventMap>(event: K, fn: (payload: PlayerEventMap[K]) => void): () => void;
  /** 插件动态注册设置行，返回移除函数（destroy 时自动清理） */
  addSettingsRow(section: SettingsSection): () => void;
  /** 插件动态注册右键菜单项，返回移除函数 */
  addContextMenuItem(item: ContextMenuItem, index?: number): () => void;
}

export interface SweetPlayerOptions {
  /** 挂载容器，元素或选择器 */
  container: HTMLElement | string;
  /** 视频地址，.m3u8 走 hls.js，其余直接赋给 video */
  src: string;
  /** 左上角标题 */
  title?: string;
  /** 视频唯一 ID：传入后自动记忆/恢复播放进度（断点续播） */
  id?: string;
  autoplay?: boolean;
  muted?: boolean;
  /** 初始音量 0-100，默认 100 */
  volume?: number;
  /** 快进快退步长（秒），默认 10 */
  seekStep?: number;
  /** 长按快进快退配置 */
  longSeek?: LongSeekOptions;
  /** 倍速档位，默认 [0.5, 1, 1.5, 2] */
  playbackRates?: number[];
  /** 画面比例档位，默认 ['original', '21:9', '16:9', '4:3'] */
  aspectRatios?: AspectRatio[];
  /** 画质列表（预留），传入后画质菜单可选 */
  qualities?: QualityLevel[];
  /** 音轨列表（预留） */
  audioTracks?: AudioTrackInfo[];
  /** 热度曲线数据（如"最多重播"）。传入后进度条上方显示热度曲线，并在设置面板出现开关 */
  heatmap?: HeatmapPoint[];
  /** 封面图地址，播放开始前显示 */
  poster?: string;
  /** 进度条悬停缩略图预览的 WebVTT 地址（cue payload 为雪碧图 URL + #xywh=x,y,w,h） */
  thumbnails?: string;
  /**
   * 自动从 hls.js 读取画质/音轨填充菜单（默认 true）。
   * 业务传入 qualities/audioTracks 时以业务列表为准。
   */
  autoQuality?: boolean;
  /** 记忆音量/静音/倍速到 localStorage（默认 true） */
  persist?: boolean;
  /** 播放结束后自动播放下一个：true = 5 秒倒计时，数字 = 自定义秒数（需配合 onNext） */
  autoNext?: boolean | number;
  /** UI 语言，默认 'zh-CN'，内置 'en'；可用 registerLocale 注册其他语言 */
  locale?: string;
  /** 覆盖部分 UI 文案 */
  localeStrings?: Record<string, string>;
  /** 不显示的 UI 功能集合，默认全部显示（只影响显示，不影响 API 与快捷键） */
  hiddenControls?: ControlName[];
  /** 插件列表，实例化末尾依次 apply */
  plugins?: SweetPlayerPlugin[];
  /** 透传给 hls.js 的配置 */
  hlsConfig?: Record<string, unknown>;
  /** 透传给 dash.js 的 updateSettings 配置 */
  dashConfig?: Record<string, unknown>;
  /** 点击"上一个"回调（预留） */
  onPrev?: () => void;
  /** 点击"下一个"回调（预留） */
  onNext?: () => void;
  /** 画质切换回调（预留） */
  onQualityChange?: (quality: QualityLevel) => void;
  /** 音轨切换回调（预留） */
  onAudioTrackChange?: (track: AudioTrackInfo) => void;
}

export interface PlayerEventMap {
  ready: void;
  play: void;
  pause: void;
  ended: void;
  timeupdate: { currentTime: number; duration: number };
  ratechange: number;
  volumechange: { volume: number; muted: boolean };
  fullscreenchange: boolean;
  /** 网页全屏（CSS 撑满视口，非浏览器 Fullscreen API）状态变化 */
  webfullscreenchange: boolean;
  pipchange: boolean;
  aspectratiochange: AspectRatio;
  qualitychange: QualityLevel;
  audiotrackchange: AudioTrackInfo;
  error: { type: string; detail?: unknown };
  destroy: void;
}

export type PlayerEventName = keyof PlayerEventMap;
