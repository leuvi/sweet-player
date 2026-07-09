import { createEl } from '../../utils/dom';
import { clamp } from '../../utils/time';
import { icons } from '../icons';

export interface VolumeControl {
  el: HTMLElement;
  update(volume: number, muted: boolean): void;
}

/** 音量控件：图标点击静音，hover 展开 0-100 滑条 */
export function createVolumeControl(opts: {
  muteTitle: string;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}): VolumeControl {
  const root = createEl('div', { className: 'sp-volume' });
  const btn = createEl('div', {
    className: 'sp-btn',
    html: icons.volumeHigh,
    attrs: { role: 'button', tabindex: '0', title: opts.muteTitle, 'aria-label': opts.muteTitle },
    parent: root,
  });
  const sliderWrap = createEl('div', { className: 'sp-volume-slider', parent: root });
  const track = createEl('div', { className: 'sp-volume-track', parent: sliderWrap });
  const fill = createEl('div', { className: 'sp-volume-fill', parent: track });
  const thumb = createEl('div', { className: 'sp-volume-thumb', parent: track });

  btn.addEventListener('click', opts.onToggleMute);

  let dragging = false;

  function volumeFromEvent(e: PointerEvent): number {
    const rect = track.getBoundingClientRect();
    return Math.round(clamp((e.clientX - rect.left) / rect.width, 0, 1) * 100);
  }

  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    root.classList.add('sp-dragging');
    track.setPointerCapture(e.pointerId);
    opts.onVolumeChange(volumeFromEvent(e));
  });
  track.addEventListener('pointermove', (e) => {
    if (dragging) opts.onVolumeChange(volumeFromEvent(e));
  });
  const endDrag = () => {
    dragging = false;
    root.classList.remove('sp-dragging');
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  return {
    el: root,
    update(volume, muted) {
      const shown = muted ? 0 : volume;
      fill.style.width = `${shown}%`;
      thumb.style.left = `${shown}%`;
      btn.innerHTML = muted || volume === 0 ? icons.volumeMute : volume < 50 ? icons.volumeLow : icons.volumeHigh;
    },
  };
}
