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
import { createSaveQueue } from './utils/saveQueue';
import { captureScreenshot } from './utils/screenshot';
import { VERSION } from './version';
import { log } from './logger';
import css from './styles/player.css';
import type {
  AspectRatio,
  AudioTrackInfo,
  ControlName,
  PlayerEventMap,
  PlayerPrefs,
  QualityLevel,
  RestoreState,
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
/** 偏好写入防抖：拖动音量条会高频触发 volumechange，停下后才写一次 */
const PREFS_SAVE_DEBOUNCE = 800;
/** 进度写入防抖：seek 连点（方向键、拖动进度条）会短时间内多次触发，合并成一次写入 */
const PROGRESS_SAVE_DEBOUNCE = 1000;
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
  private webFullscreen = false;
  private onEscapeKey: ((e: KeyboardEvent) => void) | null = null;
  /** reload/load 后等待 loadedmetadata 恢复进度的 AbortController，连点切换或 destroy 时 abort */
  private restoreAbort: AbortController | null = null;
  /** 偏好 / 进度的节流写入队列；未传对应回调时为 null（走 localStorage 或完全不存） */
  private prefsQueue: ReturnType<typeof createSaveQueue<PlayerPrefs>> | null = null;
  private progressQueue: ReturnType<typeof createSaveQueue<number | null>> | null = null;
  /** 当前进度记忆的视频 ID；setId 时切换 */
  private progressId: string | null = null;
  /** 进度记忆的清理函数；setId / destroy 时调用 */
  private progressCleanup: (() => void) | null = null;
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

    // 音量/倍速：localStorage 偏好优先于选项默认值。
    // 传了 onSavePrefs 表示业务方自管存储，此时不读 localStorage——由业务方拿到数据后调 restore()。
    const persist = options.persist !== false;
    const remotePrefs = !!options.onSavePrefs;
    const prefs = persist && !remotePrefs ? loadPrefs() : {};
    this.video.volume = clamp(prefs.volume ?? options.volume ?? 100, 0, 100) / 100;
    this.video.muted = prefs.muted ?? options.muted ?? false;
    // 循环不持久化：它是"这一次想循环看"的临时意图，不是长期偏好
    this.video.loop = options.loop ?? false;
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
          label: this.i18n.t('copyUrl'),
          onClick: () => void this.copyShareUrl(),
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
        toggleWebFullscreen: () => void this.toggleWebFullscreen(),
        togglePip: () => this.togglePip(),
        toggleLoop: () => this.setLoop(!this.video.loop),
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
        toggleWebFullscreen: () => void this.toggleWebFullscreen(),
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

    if (persist || remotePrefs) this.bindPersistence();
    if (options.id) {
      this.progressId = options.id;
      this.bindProgressMemory(options.id);
    }

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
    // 进入浏览器全屏前先退出网页全屏，避免 fixed 定位与 :fullscreen 叠加导致的样式冲突
    if (this.webFullscreen) this.exitWebFullscreen();
    await toggleFullscreen(this.container).catch(() => {});
  }

  get fullscreen(): boolean {
    return isFullscreen(this.container);
  }

  /**
   * 网页全屏：纯 CSS 撑满浏览器视口，不依赖 Fullscreen API。
   * 适合被 iframe 嵌入且父页未声明 `allow="fullscreen"` 的场景。
   */
  async enterWebFullscreen(): Promise<void> {
    if (this.webFullscreen) return;
    // 与浏览器全屏互斥：已在浏览器全屏则先退出，等退出完成再进入网页全屏，避免 CSS 竞态
    if (this.fullscreen) {
      await toggleFullscreen(this.container).catch(() => {});
    }
    this.webFullscreen = true;
    this.container.classList.add('sp-web-fullscreen');
    document.body.classList.add('sp-web-fullscreen-lock');
    // Escape 退出（浏览器全屏的 Escape 由浏览器兜底，这里只处理网页全屏）
    this.onEscapeKey = (e) => {
      if (e.key === 'Escape' && this.webFullscreen) this.exitWebFullscreen();
    };
    document.addEventListener('keydown', this.onEscapeKey);
    this.controls.updateWebFullscreen(true);
    this.emitter.emit('webfullscreenchange', true);
    log('播放器', '进入网页全屏');
  }

  exitWebFullscreen(): void {
    if (!this.webFullscreen) return;
    this.webFullscreen = false;
    this.container.classList.remove('sp-web-fullscreen');
    document.body.classList.remove('sp-web-fullscreen-lock');
    if (this.onEscapeKey) {
      document.removeEventListener('keydown', this.onEscapeKey);
      this.onEscapeKey = null;
    }
    this.controls.updateWebFullscreen(false);
    this.emitter.emit('webfullscreenchange', false);
    log('播放器', '退出网页全屏');
  }

  async toggleWebFullscreen(): Promise<void> {
    if (this.webFullscreen) this.exitWebFullscreen();
    else await this.enterWebFullscreen();
  }

  get isWebFullscreen(): boolean {
    return this.webFullscreen;
  }

  /**
   * 循环播放。开启后视频播完自动重播——
   * `video.loop = true` 时浏览器**不会**触发 `ended`，因此 `autoNext` 与依赖 `ended` 的插件都不激活。
   */
  setLoop(loop: boolean): void {
    if (this.video.loop === loop) return;
    log('播放器', `循环播放: ${loop ? '开' : '关'}`);
    this.video.loop = loop;
    this.controls.updateLoop(loop);
    this.emitter.emit('loopchange', loop);
    this.osd.flash(loop ? this.i18n.t('loop') + ' ✓' : this.i18n.t('loop') + ' ✕');
  }

  get loop(): boolean {
    return this.video.loop;
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

  /** 复制视频地址到剪贴板：默认复制当前页面地址，可用 `shareUrl` 选项覆盖 */
  async copyShareUrl(): Promise<void> {
    const url = this.options.shareUrl ?? (typeof location !== 'undefined' ? location.href : '');
    try {
      if (!url || !navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      this.osd.flash(this.i18n.t('urlCopied'));
    } catch (err) {
      log('复制视频地址', `失败: ${String(err)}`);
      this.osd.flash(this.i18n.t('urlCopyFailed'));
    }
  }

  /**
   * 套用一份已保存的状态（音量 / 静音 / 倍速 / 播放进度）。
   *
   * 供业务方从自己的后端取到数据后调用，随时可调：媒体尚未就绪时
   * 会自动等到 `loadedmetadata` 再 seek。传入的字段才会被套用，其余保持不变。
   *
   * ```ts
   * const saved = await api.load(videoId);
   * player.restore(saved); // { volume: 80, muted: false, rate: 1.5, time: 220 }
   * ```
   */
  restore(state: RestoreState): void {
    if (typeof state.volume === 'number') {
      this.video.volume = clamp(state.volume, 0, 100) / 100;
    }
    if (typeof state.muted === 'boolean') this.video.muted = state.muted;
    if (typeof state.rate === 'number' && state.rate > 0) {
      // 换源会把 playbackRate 重置为 defaultPlaybackRate，两个都设
      this.video.defaultPlaybackRate = state.rate;
      this.video.playbackRate = state.rate;
    }
    // 上面直接改 video 属性不会经过 setVolume/setRate，显式同步一次控件
    this.controls.volume.update(Math.round(this.video.volume * 100), this.video.muted);
    this.controls.updateRate(this.video.playbackRate);

    const time = state.time;
    if (typeof time !== 'number' || time <= 3) return;
    const seek = () => {
      // 距结尾太近就不跳了，否则一进来就是结束态
      if (this.video.duration && time >= this.video.duration - PROGRESS_END_GUARD) return;
      this.video.currentTime = time;
    };
    if (this.video.readyState >= 1) seek();
    else this.video.addEventListener('loadedmetadata', seek, { once: true });
  }

  load(src: string): void {
    this.state.hideEnded();
    this.state.hideError();
    // 换源后旧引擎的画质/音轨菜单不再适用，清空避免残留
    if (this.engineManagedQuality) {
      this.engineManagedQuality = false;
      this.controls.qualityMenu.setItems([]);
    }
    if (this.engineManagedAudio) {
      this.engineManagedAudio = false;
      this.controls.audioMenu.setItems([]);
    }
    this.media.load(src);
  }

  /**
   * 切换视频 ID（断点续播的 key）。
   * 先保存旧视频的进度，再解绑旧的事件/定时器，最后用新 ID 重新绑定。
   */
  setId(id: string): void {
    if (this.progressId === id) return;
    this.saveProgressNow();
    this.progressQueue?.flush();
    this.progressCleanup?.();
    this.progressCleanup = null;
    this.progressQueue = null;
    this.progressId = id;
    this.options.id = id;
    this.bindProgressMemory(id);
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
    this.progressQueue?.flush(); // 队列是异步的，销毁前立即写掉
    this.emitter.emit('destroy', undefined);
    // 复制后遍历：dispose 内部会 splice 原数组，直接 forEach 会跳过一半
    [...this.pluginCleanups].forEach((d) => d());
    // 销毁前保证网页全屏被解除，避免残留 body class 与 escape listener
    if (this.webFullscreen) this.exitWebFullscreen();
    this.keyboard.destroy();
    this.gestures.destroy();
    this.stats.destroy();
    this.shortcutsPanel.destroy();
    this.state.destroy();
    this.contextMenu?.destroy();
    this.controls.destroy();
    this.tapFlash.destroy();
    // 清理可能悬挂的 restore listener（load 失败 / metadata 未到时）
    this.restoreAbort?.abort();
    this.progressCleanup?.();
    this.disposers.forEach((d) => d());
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.clickTimer) clearTimeout(this.clickTimer);
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
      // load 是异步挂引擎的，需等 loadedmetadata 后再恢复进度。
      // 用 reloadAndRestore 统一处理 once + currentSrc 校验 + destroy 清理。
      this.reloadAndRestore(this.video.currentTime, this.video.paused, quality.src);
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
    // 有 onSavePrefs 走业务方回调，否则回落到 localStorage。两条路径共用同一个节流队列。
    const write = this.options.onSavePrefs ?? ((p: PlayerPrefs) => savePrefs(p));
    this.prefsQueue = createSaveQueue<PlayerPrefs>(write, PREFS_SAVE_DEBOUNCE, '偏好');

    const onVolume = () =>
      this.prefsQueue?.push({ volume: Math.round(this.video.volume * 100), muted: this.video.muted });
    const onRate = () => this.prefsQueue?.push({ rate: this.video.playbackRate });
    this.video.addEventListener('volumechange', onVolume);
    this.video.addEventListener('ratechange', onRate);
    this.disposers.push(() => {
      this.video.removeEventListener('volumechange', onVolume);
      this.video.removeEventListener('ratechange', onRate);
      this.prefsQueue?.flush(); // 销毁前把待写的偏好写掉
    });
  }

  private bindProgressMemory(id: string): void {
    const onSaveProgress = this.options.onSaveProgress;
    // 两条路径共用队列：seek 连点时合并写入，pause / pagehide / destroy 时 flush 立即落盘
    const write = onSaveProgress
      ? (seconds: number | null) => onSaveProgress(id, seconds)
      : (seconds: number | null) => (seconds === null ? clearProgress(id) : saveProgress(id, seconds));
    this.progressQueue = createSaveQueue<number | null>(write, PROGRESS_SAVE_DEBOUNCE, '进度');

    // 业务方自管进度时只负责写，读由业务方拿到数据后调 restore()
    if (!onSaveProgress) {
      const restore = () => {
        const saved = loadProgress(id);
        if (saved !== null && saved > 3 && saved < this.video.duration - PROGRESS_END_GUARD) {
          this.video.currentTime = saved;
        }
      };
      this.video.addEventListener('loadedmetadata', restore, { once: true });
    }

    this.progressTimer = setInterval(() => {
      if (!this.video.paused) this.saveProgressNow();
    }, PROGRESS_SAVE_INTERVAL);

    // 定时轮询只保证持续记录，seek 是用户明确的"从这里看"，值得立刻记一次
    const onSeeked = () => this.saveProgressNow();
    this.video.addEventListener('seeked', onSeeked);

    // 刷新 / 关闭页面时 destroy() 通常不会被调用，这里兜底把最后的进度写掉
    const onPageHide = () => {
      this.saveProgressNow();
      this.progressQueue?.flush();
    };
    window.addEventListener('pagehide', onPageHide);

    this.progressCleanup = () => {
      this.video.removeEventListener('seeked', onSeeked);
      window.removeEventListener('pagehide', onPageHide);
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      this.progressQueue = null;
    };
  }

  private saveProgressNow(): void {
    if (!this.progressId || !this.video.duration) return;
    const ended = this.video.currentTime >= this.video.duration - PROGRESS_END_GUARD;
    if (!ended && this.video.currentTime <= 3) return; // 刚开头，没必要记
    this.progressQueue?.push(ended ? null : this.video.currentTime);
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
      // 暂停是明确的停顿点，立即落盘而不是等防抖
      this.saveProgressNow();
      this.progressQueue?.flush();
      this.emitter.emit('pause', undefined);
    });
    listen('ended', () => {
      log('原生事件', '播放结束');
      this.saveProgressNow();
      this.progressQueue?.flush();
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
      const paused = this.video.paused;
      this.reloadAndRestore(time, paused);
    });
  }

  /**
   * reload/load 后等 loadedmetadata 再恢复进度并续播。
   * - 用 AbortController 管理 listener：连点切换 / destroy 时 abort，避免悬挂监听。
   * - currentSrc 校验：被后续 load 覆盖时 no-op，不误 seek。
   * showErrorStateUi 与 handleQualitySelect 共用此 helper。
   */
  private reloadAndRestore(time: number, paused: boolean, src?: string): void {
    // 清理上一次未完成的 restore（连点切换场景）
    this.restoreAbort?.abort();
    const ac = new AbortController();
    this.restoreAbort = ac;

    const targetSrc = src ?? this.media.currentSrc;
    if (src) this.media.load(src);
    else this.media.reload();

    if (time <= 0) {
      if (!paused) void this.video.play().catch(() => {});
      return;
    }
    const restore = () => {
      if (this.media.currentSrc !== targetSrc) return; // 被后续 load 覆盖
      try {
        this.video.currentTime = time;
      } catch {
        /* metadata 阶段可能仍拒绝 seek，忽略 */
      }
      if (!paused) void this.video.play().catch(() => {});
    };
    this.video.addEventListener('loadedmetadata', restore, { once: true, signal: ac.signal });
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
