import { createEl } from '../../utils/dom';
import { formatTime } from '../../utils/time';
import { getLogText } from '../../logger';
import type { MediaController } from '../../core/media';
import type { I18n } from '../../i18n';

export interface StatsOverlay {
  toggle(): void;
  hide(): void;
  destroy(): void;
}

/** 类 YouTube "详细统计信息" 蒙层，500ms 刷新 */
export function createStatsOverlay(
  container: HTMLElement,
  video: HTMLVideoElement,
  media: MediaController,
  i18n: I18n,
): StatsOverlay {
  let root: HTMLElement | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function collect(): [string, string][] {
    const q = video.getVideoPlaybackQuality?.();
    const bufferedRanges: string[] = [];
    for (let i = 0; i < video.buffered.length; i++) {
      bufferedRanges.push(`${formatTime(video.buffered.start(i))}-${formatTime(video.buffered.end(i))}`);
    }
    const bw = media.bandwidthEstimate;
    return [
      ['Video Res', `${video.videoWidth}x${video.videoHeight}`],
      ['Viewport', `${container.clientWidth}x${container.clientHeight}`],
      ['Time', `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`],
      ['Buffered', bufferedRanges.join(', ') || '-'],
      ['Dropped Frames', q ? `${q.droppedVideoFrames} / ${q.totalVideoFrames}` : 'N/A'],
      ['Bandwidth', bw ? `${(bw / 1000 / 1000).toFixed(2)} Mbps` : 'N/A'],
      ['HLS Level', media.currentLevelInfo ?? 'N/A'],
      ['Speed', `${video.playbackRate}x`],
      ['Volume', video.muted ? 'muted' : `${Math.round(video.volume * 100)}%`],
      ['Ready State', String(video.readyState)],
      ['Source', video.currentSrc || '-'],
    ];
  }

  function render(): void {
    if (!root) return;
    const dl = root.querySelector('.sp-stats-body') as HTMLElement;
    dl.innerHTML = '';
    for (const [label, value] of collect()) {
      const row = createEl('div', { className: 'sp-stats-row', parent: dl });
      createEl('dt', { text: label, parent: row });
      createEl('dd', { text: value, parent: row });
    }
  }

  function show(): void {
    if (root) return;
    root = createEl('div', { className: 'sp-stats', parent: container });
    const header = createEl('div', { className: 'sp-stats-header', parent: root });
    const copyBtn = createEl('button', {
      className: 'sp-stats-copy',
      text: i18n.t('copyLog'),
      attrs: { type: 'button' },
      parent: header,
    });
    copyBtn.addEventListener('click', () => {
      const text = getLogText();
      void navigator.clipboard.writeText(text || '(empty)').then(
        () => {
          copyBtn.textContent = i18n.t('logCopied');
          setTimeout(() => { copyBtn.textContent = i18n.t('copyLog'); }, 1500);
        },
        () => {},
      );
    });
    const closeBtn = createEl('button', {
      className: 'sp-stats-close',
      text: '✕',
      attrs: { type: 'button', 'aria-label': i18n.t('closeStats') },
      parent: header,
    });
    closeBtn.addEventListener('click', hide);
    createEl('dl', { className: 'sp-stats-body', parent: root });
    render();
    timer = setInterval(render, 500);
  }

  function hide(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    root?.remove();
    root = null;
  }

  return {
    toggle() {
      root ? hide() : show();
    },
    hide,
    destroy: hide,
  };
}
