/** 引擎抽象层：hls.js 与 dash.js 都实现此接口，MediaController 只面向本接口编排 */

export interface LevelInfo {
  /** 引擎内部索引；-1 表示"自动" */
  index: number;
  height: number;
  bitrate: number;
  label: string;
}

export interface AudioTrackInfo {
  index: number;
  label: string;
}

export type EngineErrorType =
  | 'hls-network'
  | 'hls-fatal'
  | 'hls-unsupported'
  | 'dash-network'
  | 'dash-fatal'
  | 'dash-unsupported';

export interface EngineErrorPayload {
  type: EngineErrorType;
  detail?: unknown;
}

export interface EngineCallbacks {
  /** 引擎解析出多个画质档位（含"自动"档，index=-1）时回调；只在档位数 > 1 时触发 */
  onLevels?(levels: LevelInfo[]): void;
  /** 引擎解析出多个音轨时回调；只在音轨数 > 1 时触发 */
  onAudioTracks?(tracks: AudioTrackInfo[]): void;
  /** 引擎致命错误 */
  onError(payload: EngineErrorPayload): void;
}

export interface MediaEngine {
  /** 切换画质档位，-1 为自动 */
  setLevel(index: number): void;
  setAudioTrack(index: number): void;
  /** 引擎带宽估算（bps），统计面板用 */
  readonly bandwidthEstimate: number | undefined;
  /** 当前档位描述，形如 "1920x1080@3500kbps"，统计面板用 */
  readonly currentLevelInfo: string | undefined;
  destroy(): void;
}

/**
 * 生成画质档位 label：默认 "1080P"，若同一高度出现多次则追加码率区分（"1080P · 3500k"）。
 * 高度为 0 时退化为纯码率。两个引擎（hls / dash）共用此规则。
 */
export function buildLevelLabels(
  raw: Array<{ height: number; bitrate: number }>,
): string[] {
  const heightCount = new Map<number, number>();
  for (const r of raw) heightCount.set(r.height, (heightCount.get(r.height) ?? 0) + 1);
  return raw.map((r) => {
    const kbps = `${Math.round(r.bitrate / 1000)}k`;
    if (!r.height) return kbps;
    const base = `${r.height}P`;
    return (heightCount.get(r.height) ?? 0) > 1 ? `${base} · ${kbps}` : base;
  });
}
