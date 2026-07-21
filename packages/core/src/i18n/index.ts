export interface LocaleStrings {
  play: string;
  pause: string;
  playPause: string;
  prev: string;
  next: string;
  seekBack: string;
  seekForward: string;
  speed: string;
  quality: string;
  qualityAuto: string;
  aspectRatio: string;
  ratioOriginal: string;
  audioTrack: string;
  mute: string;
  fullscreen: string;
  webFullscreen: string;
  pip: string;
  heatmap: string;
  empty: string;
  closeStats: string;
  seconds: string;
  volume: string;
  muted: string;
  replay: string;
  playNext: string;
  autoNextIn: string;
  cancel: string;
  loadError: string;
  retry: string;
  changelog: string;
  videoInfo: string;
  shortcuts: string;
  close: string;
  scKeySpace: string;
  scKeyHold: string;
  scPlayPause: string;
  scSeek: string;
  scLongSeek: string;
  scVolume: string;
  scFullscreen: string;
  scWebFullscreen: string;
  scMute: string;
  settings: string;
  screenshot: string;
  screenshotCopied: string;
  screenshotSaved: string;
  screenshotFailed: string;
  copyLog: string;
  logCopied: string;
}

const zhCN: LocaleStrings = {
  play: '播放',
  pause: '暂停',
  playPause: '播放/暂停 (空格)',
  prev: '上一个',
  next: '下一个',
  seekBack: '快退 {n} 秒 (←)',
  seekForward: '快进 {n} 秒 (→)',
  speed: '播放倍速',
  quality: '画质',
  qualityAuto: '自动',
  aspectRatio: '画面比例',
  ratioOriginal: '原始',
  audioTrack: '音轨',
  mute: '静音 (M)',
  fullscreen: '全屏 (F)',
  webFullscreen: '网页全屏 (W)',
  pip: '画中画 (P)',
  heatmap: '热度曲线',
  empty: '暂无可选项',
  closeStats: '关闭统计信息',
  seconds: '秒',
  volume: '音量',
  muted: '静音',
  replay: '重新播放',
  playNext: '播放下一个',
  autoNextIn: '{n} 秒后播放下一个',
  cancel: '取消',
  loadError: '视频加载失败',
  retry: '重试',
  changelog: '更新记录',
  videoInfo: '视频信息',
  shortcuts: '快捷键',
  close: '关闭',
  scKeySpace: '空格',
  scKeyHold: '← / → 长按',
  scPlayPause: '播放 / 暂停',
  scSeek: '快退 / 快进 {n} 秒',
  scLongSeek: '阶梯累计快进快退，松开执行',
  scVolume: '音量 ±5',
  scFullscreen: '全屏切换',
  scWebFullscreen: '网页全屏切换',
  scMute: '静音切换',
  settings: '设置',
  screenshot: '截图当前画面',
  screenshotCopied: '截图已复制到剪贴板',
  screenshotSaved: '截图已保存',
  screenshotFailed: '截图失败',
  copyLog: '复制日志',
  logCopied: '已复制',
};

const en: LocaleStrings = {
  play: 'Play',
  pause: 'Pause',
  playPause: 'Play/Pause (Space)',
  prev: 'Previous',
  next: 'Next',
  seekBack: 'Rewind {n}s (←)',
  seekForward: 'Forward {n}s (→)',
  speed: 'Playback speed',
  quality: 'Quality',
  qualityAuto: 'Auto',
  aspectRatio: 'Aspect ratio',
  ratioOriginal: 'Original',
  audioTrack: 'Audio track',
  mute: 'Mute (M)',
  fullscreen: 'Fullscreen (F)',
  webFullscreen: 'Web fullscreen (W)',
  pip: 'Picture-in-Picture (P)',
  heatmap: 'Most replayed',
  empty: 'Nothing available',
  closeStats: 'Close stats',
  seconds: 's',
  volume: 'Volume',
  muted: 'Muted',
  replay: 'Replay',
  playNext: 'Play next',
  autoNextIn: 'Playing next in {n}s',
  cancel: 'Cancel',
  loadError: 'Failed to load video',
  retry: 'Retry',
  changelog: 'Changelog',
  videoInfo: 'Video info',
  shortcuts: 'Shortcuts',
  close: 'Close',
  scKeySpace: 'Space',
  scKeyHold: 'Hold ← / →',
  scPlayPause: 'Play / Pause',
  scSeek: 'Rewind / forward {n}s',
  scLongSeek: 'Accelerating seek, release to apply',
  scVolume: 'Volume ±5',
  scFullscreen: 'Toggle fullscreen',
  scWebFullscreen: 'Toggle web fullscreen',
  scMute: 'Toggle mute',
  settings: 'Settings',
  screenshot: 'Capture frame',
  screenshotCopied: 'Screenshot copied to clipboard',
  screenshotSaved: 'Screenshot saved',
  screenshotFailed: 'Screenshot failed',
  copyLog: 'Copy log',
  logCopied: 'Copied',
};

const locales: Record<string, LocaleStrings> = { 'zh-CN': zhCN, en };

export type LocaleName = 'zh-CN' | 'en' | (string & {});

export class I18n {
  private strings: LocaleStrings;

  constructor(locale: LocaleName = 'zh-CN', overrides?: Partial<LocaleStrings>) {
    this.strings = { ...(locales[locale] ?? zhCN), ...overrides };
  }

  t(key: keyof LocaleStrings, params?: Record<string, string | number>): string {
    let text = this.strings[key];
    if (params) {
      for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, String(v));
    }
    return text;
  }
}

/** 注册自定义语言包（全局） */
export function registerLocale(name: string, strings: LocaleStrings): void {
  locales[name] = strings;
}
