import { EventEmitter } from './core/events';
import { MediaController } from './core/media';
import type { AudioTrackInfo as EngineAudioTrack, LevelInfo as EngineLevel } from './core/engines/types';
import { KeyboardController } from './core/keyboard';
import { GestureController } from './core/gestures';
import { isFullscreen, onFullscreenChange, toggleFullscreen } from './core/fullscreen';
import { createControls, type Controls } from './ui/controls';
import { createOsd, type Osd } from './ui/components/osd';
import { createTapFlash, type TapFlash } from './ui/components/tapFlash';
import { createContextMenu, type ContextMenu } from './ui/components/contextMenu';
import { createShortcutsOverlay, type ShortcutsOverlay } from './ui/components/shortcutsOverlay';
import { createStatsOverlay, type StatsOverlay } from './ui/components/statsOverlay';
import { createStateOverlay, type StateOverlay } from './ui/components/stateOverlay';
import { I18n } from './i18n';
import { createEl } from './utils/dom';
import { clamp, formatTime } from './utils/time';
import { injectStyle } from './utils/injectStyle';
import { clearProgress, loadPrefs, loadProgress, savePrefs, saveProgress } from './utils/storage';
import { captureScreenshot } from './utils/screenshot';
import { VERSION } from './version';
import { log } from './logger';
import css from './styles/player.css';
import type {
  AspectRatio,
  AudioTrackInfo,
  ControlName,
  PlayerEventMap,
  QualityLevel,
  SweetPlayerOptions,
  SweetPlayerPlugin,
} from './types';
import type { SettingsSection } from './ui/components/settingsPanel';

const DEFAULT_RATES = [0.5, 1, 1.5, 2];
const DEFAULT_RATIOS: AspectRatio[] = ['original', '21:9', '16:9', '4:3'];
const DEFAULT_LONG_SEEK_STEPS = [10, 30, 60];
const DEFAULT_STEP_UP_INTERVAL = 2000;
const DEFAULT_AUTO_NEXT_SECONDS = 5;
const CONTROLS_HIDE_DELAY = 3000;
const SINGLE_CLICK_DELAY = 250;
const NPM_URL = 'https://www.npmjs.com/package/@sweet-player/core';
const LOGO_ICON = '<svg viewBox="0 0 64 64" width="14" height="14" style="vertical-align:-2px"><defs><mask id="sp-m"><rect width="64" height="64" fill="white"/><rect x="11" y="21" width="42" height="32" rx="4" fill="black"/></mask></defs><line x1="26" y1="16" x2="18" y2="7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="38" y1="16" x2="46" y2="7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="6" y="16" width="52" height="42" rx="8" fill="currentColor" mask="url(#sp-m)"/><path d="M32 32c-2-3.5-6.5-4.5-8.5-2s-1.2 6.5 8.5 13c9.7-6.5 10.5-10.5 8.5-13s-6.5-1.5-8.5 2z" fill="currentColor"/></svg>';
const PROGRESS_SAVE_INTERVAL = 5000;
/** 距结尾小于该秒数视为看完，清除断点 */
const PROGRESS_END_GUARD = 10;

export class SweetPlayer {
  static readonly version = VERSION;

  readonly container: HTMLElement;
  readonly video: HTMLVideoElement;

  private emitter = new EventEmitter();
  private media: MediaController;
  private keyboard: KeyboardController;
  private gestures: GestureController;
  private controls: Controls;
  private osd: Osd;
  private tapFlash: TapFlash;
  private stats: StatsOverlay;
  private shortcutsPanel: ShortcutsOverlay;
  private state: StateOverlay;
  private contextMenu: ContextMenu | null = null;
  private i18n: I18n;
  private options: SweetPlayerOptions;

  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private currentRatio: AspectRatio = 'original';
  /** 画质/音轨菜单当前是否由当前引擎（hls.js / dash.js）自动接管；业务 setQualities 会关闭 */
  private engineManagedQuality = false;
  private engineManagedAudio = false;
  private disposers: Array<() => void> = [];
  private pluginCleanups: Array<() => void> = [];
  private destroyed = false;

  constructor(options: SweetPlayerOptions) {
    this.options = options;
    this.i18n = new I18n(options.locale, options.localeStrings);

    const target =
      typeof options.container === 'string'
        ? document.querySelector<HTMLElement>(options.container)
        : options.container;
    if (!target) throw new Error(`[sweet-player] container not found: ${options.container}`);

    injectStyle(css);

    this.container = createEl('div', {
      className: 'sweet-player',
      attrs: { tabindex: '0', 'data-ratio': 'original' },
      parent: target,
    });

    this.video = createEl('video', {
      className: 'sp-video',
      attrs: { playsinline: '' },
      parent: this.container,
    });

    const hidden = new Set<ControlName>(options.hiddenControls ?? []);
    // 'poster' 被隐藏时不设置该属性，避免不必要的封面图请求
    if (options.poster && !hidden.has('poster')) this.video.poster = options.poster;

    // 音量/倍速：localStorage 偏好优先于选项默认值
    const persist = options.persist !== false;
    const prefs = persist ? loadPrefs() : {};
    this.video.volume = clamp(prefs.volume ?? options.volume ?? 100, 0, 100) / 100;
    this.video.muted = prefs.muted ?? options.muted ?? false;
    if (options.autoplay) this.video.autoplay = true;

    const autoQuality = options.autoQuality !== false;
    this.media = new MediaController(
      this.video,
      this.emitter,
      options.hlsConfig,
      {
        onLevels: autoQuality && !options.qualities?.length ? (levels) => this.applyEngineLevels(levels) : undefined,
        onAudioTracks:
          autoQuality && !options.audioTracks?.length ? (tracks) => this.applyEngineAudioTracks(tracks) : undefined,
      },
      options.dashConfig,
    );

    this.osd = createOsd();
    this.tapFlash = createTapFlash();
    this.stats = createStatsOverlay(this.container, this.video, this.media, this.i18n);
    this.shortcutsPanel = createShortcutsOverlay(this.container, this.i18n, options.seekStep ?? 10);
    this.state = createStateOverlay(this.i18n);
    if (!hidden.has('contextMenu')) {
      this.contextMenu = createContextMenu(this.container, [
        {
          label: this.i18n.t('screenshot'),
          onClick: () => this.screenshot(),
        },
        {
          label: this.i18n.t('videoInfo'),
          onClick: () => this.stats.toggle(),
        },
        {
          label: this.i18n.t('shortcuts'),
          onClick: () => this.shortcutsPanel.toggle(),
        },
        {
          label: `${this.i18n.t('changelog')}: v${VERSION}`,
          html: `${LOGO_ICON} ${this.i18n.t('changelog')}: v${VERSION}`,
          onClick: () => window.open(NPM_URL, '_blank', 'noopener'),
        },
      ]);
    }

    this.controls = createControls({
      video: this.video,
      title: options.title ?? '',
      i18n: this.i18n,
      playbackRates: options.playbackRates ?? DEFAULT_RATES,
      aspectRatios: options.aspectRatios ?? DEFAULT_RATIOS,
      seekStep: options.seekStep ?? 10,
      heatmap: options.heatmap,
      thumbnails: options.thumbnails,
      hidden,
      actions: {
        togglePlay: () => this.toggle(),
        seekBy: (d) => this.seekBy(d),
        setRate: (r) => this.setRate(r),
        setVolume: (v) => this.setVolume(v),
        toggleMute: () => this.setMuted(!this.video.muted),
        setAspectRatio: (r) => this.setAspectRatio(r),
        toggleFullscreen: () => this.toggleFullscreen(),
        togglePip: () => this.togglePip(),
        selectQuality: (q) => this.handleQualitySelect(q),
        selectAudioTrack: (t) => this.handleAudioTrackSelect(t),
        onPrev: options.onPrev,
        onNext: options.onNext,
      },
    });
    this.container.appendChild(this.controls.topEl);
    this.container.appendChild(this.controls.bottomEl);
    this.container.appendChild(this.state.el);
    this.container.appendChild(this.tapFlash.el);
    this.container.appendChild(this.osd.el);

    if (options.qualities?.length) this.setQualities(options.qualities);
    if (options.audioTracks?.length) this.setAudioTracks(options.audioTracks);

    const seekStep = options.seekStep ?? 10;
    this.keyboard = new KeyboardController(
      this.container,
      {
        togglePlay: () => this.toggle(),
        seekBy: (d) => this.seekBy(d),
        onLongSeekProgress: (acc) => this.osd.show(`${acc > 0 ? '+' : ''}${acc} ${this.i18n.t('seconds')}`),
        onLongSeekCommit: (acc) => {
          this.osd.hide();
          if (acc !== 0) this.seekBy(acc, false);
        },
        adjustVolume: (d) => this.setVolume(Math.round(this.video.volume * 100) + d),
        toggleFullscreen: () => this.toggleFullscreen(),
        toggleMute: () => this.setMuted(!this.video.muted),
      },
      {
        seekStep,
        longSeekSteps: options.longSeek?.steps ?? DEFAULT_LONG_SEEK_STEPS,
        stepUpInterval: options.longSeek?.stepUpInterval ?? DEFAULT_STEP_UP_INTERVAL,
      },
    );

    this.gestures = new GestureController(
      this.container,
      this.video,
      {
        seekBy: (d) => this.seekBy(d),
        onSeekPreview: (d) =>
          this.osd.show(
            `${d > 0 ? '+' : ''}${d} ${this.i18n.t('seconds')} (${formatTime(
              clamp(this.video.currentTime + d, 0, this.video.duration || 0),
            )})`,
          ),
        onSeekCommit: (d) => {
          this.osd.hide();
          if (d !== 0) this.seekBy(d, false);
        },
        adjustVolume: (d) => this.setVolume(Math.round(this.video.volume * 100) + d),
        toggleControls: () => {
          this.container.classList.contains('sp-controls-hidden') ? this.scheduleHide() : this.hideControlsNow();
        },
        toggleFullscreen: () => this.toggleFullscreen(),
      },
      seekStep,
    );

    this.bindMediaEvents();
    this.bindActivityTracking();
    this.disposers.push(
      onFullscreenChange(this.container, (fs) => {
        log('播放器', fs ? '进入全屏' : '退出全屏');
        this.controls.updateFullscreen(fs);
        this.emitter.emit('fullscreenchange', fs);
      }),
    );

    // 持久化：倍速恢复。换源会把 playbackRate 重置为 defaultPlaybackRate，所以两个都设
    if (persist && prefs.rate) {
      this.video.defaultPlaybackRate = prefs.rate;
      this.video.playbackRate = prefs.rate;
    }

    this.media.load(options.src);
    // 媒体加载算法会丢弃 load 前排队的媒体事件（如倍速恢复触发的 ratechange），这里显式同步一次 UI
    this.controls.volume.update(Math.round(this.video.volume * 100), this.video.muted);
    this.controls.updateRate(this.video.playbackRate);

    if (persist) this.bindPersistence();
    if (options.id) this.bindProgressMemory(options.id);

    options.plugins?.forEach((p) => this.use(p));
  }

  // ---------- 公开 API ----------

  play(): Promise<void> {
    return this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  toggle(): void {
    if (this.video.paused) {
      this.tapFlash.flash('play');
      void this.play().catch(() => {});
    } else {
      this.tapFlash.flash('pause');
      this.pause();
    }
  }

  seek(time: number): void {
    this.video.currentTime = clamp(time, 0, this.video.duration || 0);
  }

  /** 相对跳转；showOsd 为 false 时不显示中央提示 */
  seekBy(delta: number, showOsd = true): void {
    this.seek(this.video.currentTime + delta);
    if (showOsd) this.osd.flash(`${delta > 0 ? '+' : ''}${delta} ${this.i18n.t('seconds')}`);
  }

  setRate(rate: number): void {
    log('播放器', `倍速切换: ${rate}x`);
    this.video.playbackRate = rate;
  }

  /** 0-100 */
  setVolume(volume: number): void {
    const v = clamp(volume, 0, 100);
    this.video.volume = v / 100;
    if (v > 0) this.video.muted = false;
    this.osd.flash(`${this.i18n.t('volume')} ${v}%`);
  }

  setMuted(muted: boolean): void {
    this.video.muted = muted;
    this.osd.flash(muted ? this.i18n.t('muted') : `${this.i18n.t('volume')} ${Math.round(this.video.volume * 100)}%`);
  }

  setAspectRatio(ratio: AspectRatio): void {
    this.currentRatio = ratio;
    this.container.setAttribute('data-ratio', ratio);
    if (ratio !== 'original') {
      this.container.style.setProperty('--sp-forced-ratio', ratio.replace(':', ' / '));
    }
    this.controls.updateRatio(ratio);
    this.emitter.emit('aspectratiochange', ratio);
  }

  get aspectRatio(): AspectRatio {
    return this.currentRatio;
  }

  /** 运行时更新画质列表 */
  setQualities(qualities: QualityLevel[], active?: QualityLevel): void {
    this.engineManagedQuality = false;
    this.controls.qualityMenu.setItems(qualities.map((q) => ({ label: q.label, value: q })));
    if (active) this.controls.qualityMenu.setActive(active);
  }

  /** 运行时更新音轨列表 */
  setAudioTracks(tracks: AudioTrackInfo[], active?: AudioTrackInfo): void {
    this.engineManagedAudio = false;
    this.controls.audioMenu.setItems(tracks.map((t) => ({ label: t.label, value: t })));
    if (active) this.controls.audioMenu.setActive(active);
  }

  async toggleFullscreen(): Promise<void> {
    await toggleFullscreen(this.container).catch(() => {});
  }

  get fullscreen(): boolean {
    return isFullscreen(this.container);
  }

  async togglePip(): Promise<void> {
    try {
      if (document.pictureInPictureElement === this.video) {
        await document.exitPictureInPicture();
      } else {
        await this.video.requestPictureInPicture();
      }
    } catch {
      /* 不支持或被拒绝 */
    }
  }

  /** 截取当前帧：优先复制到剪贴板，否则下载 webp；跨域未授信时提示失败 */
  async screenshot(): Promise<void> {
    const base = (this.options.title || 'screenshot').replace(/[\\/:*?"<>|]/g, '_');
    try {
      const result = await captureScreenshot(this.video, `${base}-${Date.now()}.webp`);
      this.osd.flash(this.i18n.t(result === 'clipboard' ? 'screenshotCopied' : 'screenshotSaved'));
    } catch (err) {
      log('截图', `失败: ${String(err)}`);
      this.osd.flash(this.i18n.t('screenshotFailed'));
    }
  }

  load(src: string): void {
    this.state.hideEnded();
    this.state.hideError();
    this.media.load(src);
  }

  setTitle(title: string): void {
    const el = this.controls.topEl.querySelector('.sp-title');
    if (el) el.textContent = title;
  }

  /** 安装插件；返回本次插件的卸载函数（幂等，重复调用无副作用） */
  use(plugin: SweetPlayerPlugin): () => void {
    const cleanup = plugin.apply(this);
    const raw = typeof cleanup === 'function' ? cleanup : () => {};
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      const idx = this.pluginCleanups.indexOf(dispose);
      if (idx >= 0) this.pluginCleanups.splice(idx, 1);
      raw();
    };
    this.pluginCleanups.push(dispose);
    return dispose;
  }

  /** 插件动态注册设置行，返回移除函数（destroy 时随控件整体清理） */
  addSettingsRow(section: SettingsSection): () => void {
    return this.controls.settingsPanel.addSection(section);
  }

  /** 插件动态注册右键菜单项，返回移除函数 */
  addContextMenuItem(item: import('./ui/components/contextMenu').ContextMenuItem, index?: number): () => void {
    if (!this.contextMenu) return () => {};
    return this.contextMenu.addItem(item, index);
  }

  on<K extends keyof PlayerEventMap>(event: K, fn: (payload: PlayerEventMap[K]) => void): () => void {
    return this.emitter.on(event, fn);
  }

  off<K extends keyof PlayerEventMap>(event: K, fn: (payload: PlayerEventMap[K]) => void): void {
    this.emitter.off(event, fn);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.saveProgressNow();
    this.emitter.emit('destroy', undefined);
    this.pluginCleanups.forEach((d) => d());
    this.keyboard.destroy();
    this.gestures.destroy();
    this.stats.destroy();
    this.shortcutsPanel.destroy();
    this.state.destroy();
    this.contextMenu?.destroy();
    this.controls.destroy();
    this.tapFlash.destroy();
    this.disposers.forEach((d) => d());
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.clickTimer) clearTimeout(this.clickTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.media.destroy();
    this.emitter.removeAll();
    this.container.remove();
  }

  // ---------- 内部：引擎（hls.js / dash.js）自动画质/音轨 ----------

  private applyEngineLevels(levels: EngineLevel[]): void {
    const auto: QualityLevel = { label: this.i18n.t('qualityAuto'), value: -1 };
    const items: QualityLevel[] = [auto, ...levels.map((l) => ({ label: l.label, value: l.index }))];
    this.setQualities(items, auto);
    this.engineManagedQuality = true;
  }

  private applyEngineAudioTracks(tracks: EngineAudioTrack[]): void {
    const items: AudioTrackInfo[] = tracks.map((t) => ({ label: t.label, value: t.index }));
    this.setAudioTracks(items, items[0]);
    this.engineManagedAudio = true;
  }

  private handleQualitySelect(quality: QualityLevel): void {
    log('播放器', `切换画质: ${quality.label}`);
    this.controls.qualityMenu.setActive(quality);
    if (this.engineManagedQuality && typeof quality.value === 'number') {
      // 引擎自动接入的档位：直接切 level（-1 为自动）
      this.media.setLevel(quality.value);
    } else if (quality.src) {
      const time = this.video.currentTime;
      const paused = this.video.paused;
      this.media.load(quality.src);
      // load 是异步挂引擎的，需等 loadedmetadata 后再恢复进度。
      // 用一次性 listener + currentSrc 校验，避免被后续 load 覆盖时误 seek。
      const targetSrc = quality.src;
      const restore = () => {
        this.video.removeEventListener('loadedmetadata', restore);
        if (this.media.currentSrc !== targetSrc) return;
        try {
          this.video.currentTime = time;
        } catch {
          /* 某些引擎在 metadata 阶段仍拒绝 seek，忽略即可 */
        }
        if (!paused) void this.video.play().catch(() => {});
      };
      this.video.addEventListener('loadedmetadata', restore);
    }
    this.options.onQualityChange?.(quality);
    this.emitter.emit('qualitychange', quality);
  }

  private handleAudioTrackSelect(track: AudioTrackInfo): void {
    log('播放器', `切换音轨: ${track.label}`);
    this.controls.audioMenu.setActive(track);
    if (this.engineManagedAudio && typeof track.value === 'number') {
      this.media.setAudioTrack(track.value);
    }
    this.options.onAudioTrackChange?.(track);
    this.emitter.emit('audiotrackchange', track);
  }

  // ---------- 内部：持久化 ----------

  private bindPersistence(): void {
    const onVolume = () => savePrefs({ volume: Math.round(this.video.volume * 100), muted: this.video.muted });
    const onRate = () => savePrefs({ rate: this.video.playbackRate });
    this.video.addEventListener('volumechange', onVolume);
    this.video.addEventListener('ratechange', onRate);
    this.disposers.push(() => {
      this.video.removeEventListener('volumechange', onVolume);
      this.video.removeEventListener('ratechange', onRate);
    });
  }

  private bindProgressMemory(id: string): void {
    const restore = () => {
      const saved = loadProgress(id);
      if (saved !== null && saved > 3 && saved < this.video.duration - PROGRESS_END_GUARD) {
        this.video.currentTime = saved;
      }
    };
    this.video.addEventListener('loadedmetadata', restore, { once: true });
    this.progressTimer = setInterval(() => {
      if (!this.video.paused) this.saveProgressNow();
    }, PROGRESS_SAVE_INTERVAL);
  }

  private saveProgressNow(): void {
    const id = this.options.id;
    if (!id || !this.video.duration) return;
    if (this.video.currentTime >= this.video.duration - PROGRESS_END_GUARD) {
      clearProgress(id);
    } else if (this.video.currentTime > 3) {
      saveProgress(id, this.video.currentTime);
    }
  }

  // ---------- 内部：交互 ----------

  private bindMediaEvents(): void {
    const v = this.video;
    const listen = (event: string, fn: () => void) => {
      v.addEventListener(event, fn);
      this.disposers.push(() => v.removeEventListener(event, fn));
    };

    listen('loadedmetadata', () => {
      log('原生事件', `获取元数据 (${v.videoWidth}x${v.videoHeight})`);
      this.controls.updateTime();
      this.emitter.emit('ready', undefined);
    });
    listen('play', () => {
      this.state.hideEnded();
      this.controls.updatePlayState(true);
      this.scheduleHide();
      this.emitter.emit('play', undefined);
    });
    listen('pause', () => {
      this.controls.updatePlayState(false);
      this.showControls();
      this.emitter.emit('pause', undefined);
    });
    listen('ended', () => {
      log('原生事件', '播放结束');
      this.saveProgressNow();
      this.showControls();
      const onNext = this.options.onNext;
      const autoNext = this.options.autoNext;
      this.state.showEnded({
        onReplay: () => {
          this.seek(0);
          void this.play().catch(() => {});
        },
        onNext,
        autoNextSeconds:
          onNext && autoNext ? (typeof autoNext === 'number' ? autoNext : DEFAULT_AUTO_NEXT_SECONDS) : undefined,
      });
      this.emitter.emit('ended', undefined);
    });
    listen('timeupdate', () => {
      this.controls.updateTime();
      // 兜底：timeupdate 只在 currentTime 前进时触发，说明确实在播放（非缓冲）。
      // iOS 原生 HLS 常虚发 stalled/waiting 却不补发 playing/canplay，导致转圈不消失。
      if (!v.paused && !v.seeking) this.state.hideLoading();
      this.emitter.emit('timeupdate', { currentTime: v.currentTime, duration: v.duration });
    });
    listen('progress', () => this.controls.progress.update());
    listen('ratechange', () => {
      this.controls.updateRate(v.playbackRate);
      this.emitter.emit('ratechange', v.playbackRate);
    });
    listen('volumechange', () => {
      const volume = Math.round(v.volume * 100);
      this.controls.volume.update(volume, v.muted);
      this.emitter.emit('volumechange', { volume, muted: v.muted });
    });

    // Loading 状态
    listen('waiting', () => {
      log('原生事件', '等待缓冲中');
      this.state.showLoading();
    });
    listen('stalled', () => {
      log('原生事件', '数据加载停滞');
      this.state.showLoading();
    });
    listen('seeking', () => {
      log('原生事件', '开始跳转');
      this.state.showLoading();
    });
    listen('canplay', () => {
      log('原生事件', '准备好开始播放');
      this.state.hideLoading();
    });
    listen('playing', () => {
      this.state.hideLoading();
      this.state.hideError();
    });
    listen('seeked', () => {
      log('原生事件', '跳转完成');
      this.state.hideLoading();
    });

    // 错误：video 元素错误 + hls 致命错误统一走错误蒙层
    listen('error', () => {
      log('原生事件', `播放错误: ${v.error?.message ?? '未知错误'}`);
      this.showErrorState({ type: 'media', detail: v.error });
    });
    this.disposers.push(
      this.emitter.on('error', (payload) => {
        if (payload.type.startsWith('hls-') || payload.type.startsWith('dash-')) {
          this.showErrorStateUi();
        }
      }),
    );

    // PiP 事件
    listen('enterpictureinpicture', () => {
      log('播放器', '进入画中画');
      this.controls.updatePip(true);
      this.emitter.emit('pipchange', true);
    });
    listen('leavepictureinpicture', () => {
      log('播放器', '退出画中画');
      this.controls.updatePip(false);
      this.emitter.emit('pipchange', false);
    });

    // 桌面端：单击画面播放/暂停，双击全屏（触屏交给 GestureController）
    const onVideoClick = (e: MouseEvent) => {
      if (e.target !== this.video || (e as PointerEvent).pointerType === 'touch') return;
      if (this.clickTimer) return;
      this.clickTimer = setTimeout(() => {
        this.clickTimer = null;
        this.toggle();
      }, SINGLE_CLICK_DELAY);
    };
    const onVideoDblClick = (e: MouseEvent) => {
      if (e.target !== this.video) return;
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
      void this.toggleFullscreen();
    };
    this.container.addEventListener('click', onVideoClick);
    this.container.addEventListener('dblclick', onVideoDblClick);
    this.disposers.push(() => {
      this.container.removeEventListener('click', onVideoClick);
      this.container.removeEventListener('dblclick', onVideoDblClick);
    });
  }

  private showErrorState(payload: { type: string; detail?: unknown }): void {
    this.emitter.emit('error', payload);
    this.showErrorStateUi();
  }

  private showErrorStateUi(): void {
    this.state.hideLoading();
    this.state.showError(() => {
      const time = this.video.currentTime;
      this.media.reload();
      if (time > 0) this.video.currentTime = time;
      void this.play().catch(() => {});
    });
  }

  // ---------- 控制栏自动隐藏 ----------

  private showControls(): void {
    this.container.classList.remove('sp-controls-hidden');
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private hideControlsNow(): void {
    if (this.video.paused) return;
    // 有弹出菜单（设置面板 / 画质 / 倍速等）打开时不隐藏，否则菜单会被一起隐藏；
    // 稍后再试，等菜单关闭后仍能正常自动隐藏
    if (this.container.querySelector('.sp-menu.sp-open')) {
      this.scheduleHide();
      return;
    }
    this.container.classList.add('sp-controls-hidden');
  }

  private scheduleHide(): void {
    this.showControls();
    this.hideTimer = setTimeout(() => this.hideControlsNow(), CONTROLS_HIDE_DELAY);
  }

  private bindActivityTracking(): void {
    const onActivity = (e: PointerEvent) => {
      // 触屏的显隐由手势单击控制，这里只处理鼠标
      if (e.pointerType === 'touch') return;
      if (this.video.paused) this.showControls();
      else this.scheduleHide();
    };
    this.container.addEventListener('pointermove', onActivity);
    this.container.addEventListener('pointerdown', onActivity);
    this.disposers.push(() => {
      this.container.removeEventListener('pointermove', onActivity);
      this.container.removeEventListener('pointerdown', onActivity);
    });
  }
}
