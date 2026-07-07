import { createEl } from '../utils/dom';
import { formatTime } from '../utils/time';
import { icons } from './icons';
import { createPopupMenu, type PopupMenu } from './components/menu';
import { createProgressBar, type ProgressBar } from './components/progressBar';
import { createVolumeControl, type VolumeControl } from './components/volume';
import type { I18n } from '../i18n';
import type { AspectRatio, AudioTrackInfo, QualityLevel } from '../types';

export interface ControlsContext {
  video: HTMLVideoElement;
  title: string;
  i18n: I18n;
  playbackRates: number[];
  aspectRatios: AspectRatio[];
  seekStep: number;
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
    onTitleClick(): void;
  };
}

export interface Controls {
  topEl: HTMLElement;
  bottomEl: HTMLElement;
  progress: ProgressBar;
  volume: VolumeControl;
  qualityMenu: PopupMenu<QualityLevel>;
  audioMenu: PopupMenu<AudioTrackInfo>;
  updatePlayState(playing: boolean): void;
  updateTime(): void;
  updateRate(rate: number): void;
  updateFullscreen(fs: boolean): void;
  updateRatio(ratio: AspectRatio): void;
  destroy(): void;
}

export function createControls(ctx: ControlsContext): Controls {
  const { video, actions, i18n } = ctx;

  // ---- 顶部：标题 ----
  const topEl = createEl('div', { className: 'sp-top' });
  const titleEl = createEl('div', { className: 'sp-title', text: ctx.title, parent: topEl });
  titleEl.addEventListener('click', actions.onTitleClick);

  // ---- 底部容器 ----
  const bottomEl = createEl('div', { className: 'sp-bottom' });

  const progress = createProgressBar(video, (t) => {
    video.currentTime = t;
  });
  bottomEl.appendChild(progress.el);

  const row = createEl('div', { className: 'sp-controls', parent: bottomEl });

  const button = (html: string, title: string, onClick: () => void, disabled = false) => {
    const btn = createEl('button', {
      className: 'sp-btn',
      html,
      attrs: { type: 'button', title, 'aria-label': title },
      parent: row,
    });
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  };

  // 左侧：上一个 | 快退 | 播放 | 快进 | 下一个 | 时间
  button(icons.prev, i18n.t('prev'), () => actions.onPrev?.(), !actions.onPrev);
  button(icons.seekBack, i18n.t('seekBack', { n: ctx.seekStep }), () => actions.seekBy(-ctx.seekStep));
  const playBtn = button(icons.play, i18n.t('playPause'), actions.togglePlay);
  button(icons.seekForward, i18n.t('seekForward', { n: ctx.seekStep }), () => actions.seekBy(ctx.seekStep));
  button(icons.next, i18n.t('next'), () => actions.onNext?.(), !actions.onNext);

  const timeEl = createEl('span', { className: 'sp-time', text: '0:00 / 0:00', parent: row });

  createEl('div', { className: 'sp-controls-spacer', parent: row });

  // 右侧：倍速 | 画质 | 比例 | 音轨 | 音量 | 画中画 | 全屏
  const rateMenu = createPopupMenu<number>({
    buttonHtml: '1x',
    title: i18n.t('speed'),
    emptyText: i18n.t('empty'),
    onSelect: (item) => actions.setRate(item.value),
  });
  rateMenu.setItems(ctx.playbackRates.map((r) => ({ label: `${r}x`, value: r })));
  rateMenu.setActive(video.playbackRate);
  row.appendChild(rateMenu.el);

  const qualityMenu = createPopupMenu<QualityLevel>({
    buttonHtml: i18n.t('quality'),
    title: i18n.t('quality'),
    emptyText: i18n.t('empty'),
    onSelect: (item) => actions.selectQuality(item.value),
  });
  row.appendChild(qualityMenu.el);

  const ratioMenu = createPopupMenu<AspectRatio>({
    buttonHtml: i18n.t('aspectRatio'),
    title: i18n.t('aspectRatio'),
    emptyText: i18n.t('empty'),
    onSelect: (item) => actions.setAspectRatio(item.value),
  });
  ratioMenu.setItems(
    ctx.aspectRatios.map((r) => ({ label: r === 'original' ? i18n.t('ratioOriginal') : r, value: r })),
  );
  ratioMenu.setActive('original');
  row.appendChild(ratioMenu.el);

  const audioMenu = createPopupMenu<AudioTrackInfo>({
    buttonHtml: icons.audio,
    title: i18n.t('audioTrack'),
    emptyText: i18n.t('empty'),
    onSelect: (item) => actions.selectAudioTrack(item.value),
  });
  row.appendChild(audioMenu.el);

  const volume = createVolumeControl({
    muteTitle: i18n.t('mute'),
    onVolumeChange: actions.setVolume,
    onToggleMute: actions.toggleMute,
  });
  row.appendChild(volume.el);

  if (document.pictureInPictureEnabled) {
    button(icons.pip, i18n.t('pip'), actions.togglePip);
  }

  const fsBtn = button(icons.fullscreen, i18n.t('fullscreen'), actions.toggleFullscreen);

  return {
    topEl,
    bottomEl,
    progress,
    volume,
    qualityMenu,
    audioMenu,
    updatePlayState(playing) {
      playBtn.innerHTML = playing ? icons.pause : icons.play;
    },
    updateTime() {
      timeEl.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      progress.update();
    },
    updateRate(rate) {
      rateMenu.setButtonContent(`${rate}x`);
      rateMenu.setActive(rate);
    },
    updateFullscreen(fs) {
      fsBtn.innerHTML = fs ? icons.fullscreenExit : icons.fullscreen;
    },
    updateRatio(ratio) {
      ratioMenu.setActive(ratio);
    },
    destroy() {
      topEl.remove();
      bottomEl.remove();
    },
  };
}
