import { createEl } from '../../utils/dom';
import { clamp, formatTime } from '../../utils/time';

export interface ProgressBar {
  el: HTMLElement;
  update(): void;
  destroy(): void;
}

export function createProgressBar(video: HTMLVideoElement, onSeek: (time: number) => void): ProgressBar {
  const root = createEl('div', { className: 'sp-progress' });
  const track = createEl('div', { className: 'sp-progress-track', parent: root });
  const buffered = createEl('div', { className: 'sp-progress-buffered', parent: track });
  const played = createEl('div', { className: 'sp-progress-played', parent: track });
  const thumb = createEl('div', { className: 'sp-progress-thumb', parent: track });
  const tooltip = createEl('div', { className: 'sp-progress-tooltip', text: '0:00', parent: root });

  let dragging = false;

  function ratioFromEvent(e: PointerEvent): number {
    const rect = root.getBoundingClientRect();
    return clamp((e.clientX - rect.left) / rect.width, 0, 1);
  }

  function render(ratio?: number): void {
    const duration = video.duration || 0;
    const playedRatio = ratio ?? (duration ? video.currentTime / duration : 0);
    played.style.width = `${playedRatio * 100}%`;
    thumb.style.left = `${playedRatio * 100}%`;

    let bufferedEnd = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) > bufferedEnd) {
        bufferedEnd = video.buffered.end(i);
      }
    }
    buffered.style.width = duration ? `${(bufferedEnd / duration) * 100}%` : '0%';
  }

  function onPointerMove(e: PointerEvent): void {
    const ratio = ratioFromEvent(e);
    tooltip.style.left = `${ratio * 100}%`;
    tooltip.textContent = formatTime(ratio * (video.duration || 0));
    if (dragging) render(ratio);
  }

  function onPointerDown(e: PointerEvent): void {
    dragging = true;
    root.classList.add('sp-dragging');
    root.setPointerCapture(e.pointerId);
    render(ratioFromEvent(e));
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('sp-dragging');
    onSeek(ratioFromEvent(e) * (video.duration || 0));
  }

  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', () => {
    dragging = false;
    root.classList.remove('sp-dragging');
  });

  return {
    el: root,
    update() {
      if (!dragging) render();
    },
    destroy() {
      root.remove();
    },
  };
}
