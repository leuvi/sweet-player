import { createEl } from '../utils/dom';
import { formatTime } from '../utils/time';
import { icons } from './icons';
import type { PopupMenu, MenuItem } from './components/menu';
import { createProgressBar, type ProgressBar } from './components/progressBar';
import { createVolumeControl, type VolumeControl } from './components/volume';
import { createSettingsPanel, type SettingsPanel, type SettingsItem, type SettingsSection } from './components/settingsPanel';
import type { I18n } from '../i18n';
import type { AspectRatio, AudioTrackInfo, ControlName, HeatmapPoint, QualityLevel } from '../types';

export interface ControlsContext {
  video: HTMLVideoElement;
  title: string;
  i18n: I18n;
  playbackRates: number[];
  aspectRatios: AspectRatio[];
  seekStep: number;
  /** 热度曲线数据，存在时进度条上方渲染曲线并在设置面板出现开关 */
  heatmap?: HeatmapPoint[];
  /** 缩略图预览 VTT 地址，存在时 hover 进度条显示预览图 */
  thumbnails?: string;
  /** 不渲染的功能集合 */
  hidden: Set<ControlName>;
  actions: {
    togglePlay(): void;
    seekBy(delta: number): void;
    setRate(rate: number): void;
    setVolume(volume: number): void;
    toggleMute(): void;
    setAspectRatio(ratio: AspectRatio): void;
    toggleFullscreen(): void;
    togglePip(): void;
    selectQuality(q: QualityLevel): void;
    selectAudioTrack(t: AudioTrackInfo): void;
    onPrev?: () => void;
    onNext?: () => void;
  };
}

export interface Controls {
  topEl: HTMLElement;
  bottomEl: HTMLElement;
  progress: ProgressBar;
  volume: VolumeControl;
  qualityMenu: PopupMenu<QualityLevel>;
  audioMenu: PopupMenu<AudioTrackInfo>;
  settingsPanel: SettingsPanel;
  updatePlayState(playing: boolean): void;
  updateTime(): void;
  updateRate(rate: number): void;
  updateFullscreen(fs: boolean): void;
  updatePip(pip: boolean): void;
  updateRatio(ratio: AspectRatio): void;
  destroy(): void;
}

export function createControls(ctx: ControlsContext): Controls {
  const { video, actions, i18n, hidden } = ctx;
  const show = (name: ControlName) => !hidden.has(name);

  // ---- 顶部：标题 ----
  const topEl = createEl('div', { className: 'sp-top' });
  if (show('title')) createEl('div', { className: 'sp-title', text: ctx.title, parent: topEl });

  // ---- 底部容器 ----
  const bottomEl = createEl('div', { className: 'sp-bottom' });

  // 'heatmap' 或 'progress' 被隐藏时不传数据，热度曲线的构建逻辑完全不初始化
  const heatmapData = show('progress') && show('heatmap') ? ctx.heatmap : undefined;
  // 'thumbnails' 或 'progress' 被隐藏时不传 VTT 地址，预览图的加载/构建逻辑完全不初始化
  const thumbnailsUrl = show('progress') && show('thumbnails') ? ctx.thumbnails : undefined;
  const progress = createProgressBar(video, (t) => {
    video.currentTime = t;
  }, heatmapData, thumbnailsUrl);
  if (show('progress')) bottomEl.appendChild(progress.el);
  const hasHeatmap = !!heatmapData?.length;
  let heatmapVisible = true;

  const row = createEl('div', { className: 'sp-controls', parent: bottomEl });

  const button = (html: string, title: string, onClick: () => void, disabled = false, visible = true) => {
    const btn = createEl('div', {
      className: 'sp-btn' + (disabled ? ' sp-disabled' : ''),
      html,
      attrs: { role: 'button', tabindex: '0', title, 'aria-label': title },
      parent: visible ? row : undefined,
    });
    btn.addEventListener('click', onClick);
    return btn;
  };

  // 左侧：上一个 | 快退 | 播放 | 快进 | 下一个 | 时间
  button(icons.prev, i18n.t('prev'), () => actions.onPrev?.(), !actions.onPrev, show('prev'));
  button(icons.seekBack, i18n.t('seekBack', { n: ctx.seekStep }), () => actions.seekBy(-ctx.seekStep), false, show('seekBack'));
  const playBtn = button(icons.play, i18n.t('playPause'), actions.togglePlay, false, show('play'));
  button(icons.seekForward, i18n.t('seekForward', { n: ctx.seekStep }), () => actions.seekBy(ctx.seekStep), false, show('seekForward'));
  button(icons.next, i18n.t('next'), () => actions.onNext?.(), !actions.onNext, show('next'));

  const timeEl = createEl('span', {
    className: 'sp-time',
    text: '0:00 / 0:00',
    parent: show('time') ? row : undefined,
  });

  createEl('div', { className: 'sp-controls-spacer', parent: row });

  // 右侧：音量 | 设置 | 全屏

  const volume = createVolumeControl({
    muteTitle: i18n.t('mute'),
    onVolumeChange: actions.setVolume,
    onToggleMute: actions.toggleMute,
  });
  if (show('volume')) row.appendChild(volume.el);

  // ---- 设置面板：倍速 / 画质 / 比例 / 音轨 / 画中画 ----
  let currentRate = video.playbackRate;
  let qualityItems: SettingsItem<QualityLevel>[] = [];
  let activeQuality: QualityLevel | undefined;
  let audioItems: SettingsItem<AudioTrackInfo>[] = [];
  let activeAudio: AudioTrackInfo | undefined;

  const settingsPanel = createSettingsPanel({
    buttonTitle: i18n.t('settings'),
    sections: [
      ...(show('rate')
        ? [{
            key: 'rate',
            label: i18n.t('speed'),
            currentValue: `${currentRate}x`,
            items: ctx.playbackRates.map((r) => ({ label: `${r}x`, value: r })),
            activeValue: currentRate,
            onSelect: (item: SettingsItem<number>) => actions.setRate(item.value),
          }]
        : []),
      ...(show('quality')
        ? [{
            key: 'quality',
            label: i18n.t('quality'),
            currentValue: i18n.t('qualityAuto'),
            items: qualityItems,
            activeValue: activeQuality,
            onSelect: (item: SettingsItem<QualityLevel>) => actions.selectQuality(item.value),
          }]
        : []),
      ...(show('ratio')
        ? [{
            key: 'ratio',
            label: i18n.t('aspectRatio'),
            currentValue: i18n.t('ratioOriginal'),
            items: ctx.aspectRatios.map((r) => ({
              label: r === 'original' ? i18n.t('ratioOriginal') : r,
              value: r,
            })),
            activeValue: 'original' as AspectRatio,
            onSelect: (item: SettingsItem<AspectRatio>) => actions.setAspectRatio(item.value),
          }]
        : []),
      ...(show('audioTrack')
        ? [{
            key: 'audioTrack',
            label: i18n.t('audioTrack'),
            currentValue: '-',
            items: audioItems,
            activeValue: activeAudio,
            onSelect: (item: SettingsItem<AudioTrackInfo>) => actions.selectAudioTrack(item.value),
          }]
        : []),
      ...(show('pip') && document.pictureInPictureEnabled
        ? [{
            key: 'pip',
            label: i18n.t('pip'),
            currentValue: '',
            items: [],
            activeValue: undefined as boolean | undefined,
            onSelect: () => {},
            toggle: {
              checked: false,
              onToggle: () => actions.togglePip(),
            },
          }]
        : []),
      ...(hasHeatmap
        ? [{
            key: 'heatmap',
            label: i18n.t('heatmap'),
            currentValue: '',
            items: [],
            activeValue: undefined as boolean | undefined,
            onSelect: () => {},
            toggle: {
              checked: heatmapVisible,
              onToggle: () => {
                heatmapVisible = !heatmapVisible;
                progress.setHeatmapVisible(heatmapVisible);
                settingsPanel.updateSection('heatmap', { toggle: { checked: heatmapVisible } });
              },
            },
          }]
        : []),
    ] as SettingsSection[],
  });
  if (show('settings')) row.appendChild(settingsPanel.el);

  const fsBtn = button(icons.fullscreen, i18n.t('fullscreen'), actions.toggleFullscreen, false, show('fullscreen'));

  // ---- 兼容 qualityMenu / audioMenu 接口（player.ts 通过它们更新列表） ----
  const qualityMenuAdapter: PopupMenu<QualityLevel> = {
    el: document.createElement('div'),
    setItems(items: MenuItem<QualityLevel>[]) {
      qualityItems = items;
      const cur = activeQuality ? items.find((i) => i.value === activeQuality)?.label : i18n.t('qualityAuto');
      settingsPanel.updateSection('quality', { items, currentValue: cur ?? i18n.t('qualityAuto') });
    },
    setActive(value: QualityLevel) {
      activeQuality = value;
      const label = qualityItems.find((i) => i.value === value)?.label ?? i18n.t('qualityAuto');
      settingsPanel.updateSection('quality', { activeValue: value, currentValue: label });
    },
    setButtonContent() {},
    close() {},
  };

  const audioMenuAdapter: PopupMenu<AudioTrackInfo> = {
    el: document.createElement('div'),
    setItems(items: MenuItem<AudioTrackInfo>[]) {
      audioItems = items;
      const cur = activeAudio ? items.find((i) => i.value === activeAudio)?.label : '-';
      settingsPanel.updateSection('audioTrack', { items, currentValue: cur ?? '-' });
    },
    setActive(value: AudioTrackInfo) {
      activeAudio = value;
      const label = audioItems.find((i) => i.value === value)?.label ?? '-';
      settingsPanel.updateSection('audioTrack', { activeValue: value, currentValue: label });
    },
    setButtonContent() {},
    close() {},
  };

  return {
    topEl,
    bottomEl,
    progress,
    volume,
    qualityMenu: qualityMenuAdapter,
    audioMenu: audioMenuAdapter,
    settingsPanel,
    updatePlayState(playing) {
      playBtn.innerHTML = playing ? icons.pause : icons.play;
    },
    updateTime() {
      timeEl.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      progress.update();
    },
    updateRate(rate) {
      currentRate = rate;
      settingsPanel.updateSection('rate', { activeValue: rate, currentValue: `${rate}x` });
    },
    updateFullscreen(fs) {
      fsBtn.innerHTML = fs ? icons.fullscreenExit : icons.fullscreen;
    },
    updatePip(pip) {
      settingsPanel.updateSection('pip', { toggle: { checked: pip } });
    },
    updateRatio(ratio) {
      const label = ratio === 'original' ? i18n.t('ratioOriginal') : ratio;
      settingsPanel.updateSection('ratio', { activeValue: ratio, currentValue: label });
    },
    destroy() {
      settingsPanel.destroy();
      progress.destroy();
      topEl.remove();
      bottomEl.remove();
    },
  };
}
