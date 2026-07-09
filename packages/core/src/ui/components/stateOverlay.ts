import { createEl } from '../../utils/dom';
import type { I18n } from '../../i18n';

export interface StateOverlay {
  el: HTMLElement;
  showLoading(): void;
  hideLoading(): void;
  showError(onRetry: () => void): void;
  hideError(): void;
  /** ended 面板；autoNextSeconds > 0 时倒计时自动触发 onNext */
  showEnded(opts: { onReplay: () => void; onNext?: () => void; autoNextSeconds?: number }): void;
  hideEnded(): void;
  destroy(): void;
}

export function createStateOverlay(i18n: I18n): StateOverlay {
  const el = createEl('div', { className: 'sp-state' });

  const spinner = createEl('div', { className: 'sp-spinner', parent: el });
  spinner.innerHTML = '<div class="sp-spinner-ring"></div>';

  let errorEl: HTMLElement | null = null;
  let endedEl: HTMLElement | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function stopCountdown(): void {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function hideError(): void {
    errorEl?.remove();
    errorEl = null;
  }

  function hideEnded(): void {
    stopCountdown();
    endedEl?.remove();
    endedEl = null;
  }

  return {
    el,
    showLoading() {
      el.classList.add('sp-loading');
    },
    hideLoading() {
      el.classList.remove('sp-loading');
    },
    showError(onRetry) {
      hideError();
      hideEnded();
      el.classList.remove('sp-loading');
      errorEl = createEl('div', { className: 'sp-state-panel', parent: el });
      createEl('div', { className: 'sp-state-message', text: i18n.t('loadError'), parent: errorEl });
      const retryBtn = createEl('div', {
        className: 'sp-state-btn',
        text: i18n.t('retry'),
        parent: errorEl,
      });
      retryBtn.addEventListener('click', () => {
        hideError();
        onRetry();
      });
    },
    hideError,
    showEnded({ onReplay, onNext, autoNextSeconds }) {
      hideEnded();
      hideError();
      el.classList.remove('sp-loading');
      endedEl = createEl('div', { className: 'sp-state-panel', parent: el });

      const buttons = createEl('div', { className: 'sp-state-actions', parent: endedEl });
      const replayBtn = createEl('div', {
        className: 'sp-state-btn',
        text: i18n.t('replay'),
        parent: buttons,
      });
      replayBtn.addEventListener('click', () => {
        hideEnded();
        onReplay();
      });

      if (onNext) {
        const nextBtn = createEl('div', {
          className: 'sp-state-btn sp-state-btn-primary',
          text: i18n.t('playNext'),
          parent: buttons,
        });
        nextBtn.addEventListener('click', () => {
          hideEnded();
          onNext();
        });

        if (autoNextSeconds && autoNextSeconds > 0) {
          let remain = autoNextSeconds;
          const tip = createEl('div', {
            className: 'sp-state-countdown',
            text: i18n.t('autoNextIn', { n: remain }),
            parent: endedEl,
          });
          const cancelBtn = createEl('div', {
            className: 'sp-state-cancel',
            text: i18n.t('cancel'),
            parent: tip,
          });
          cancelBtn.addEventListener('click', () => {
            stopCountdown();
            tip.remove();
          });
          countdownTimer = setInterval(() => {
            remain -= 1;
            if (remain <= 0) {
              hideEnded();
              onNext();
            } else {
              tip.firstChild!.textContent = i18n.t('autoNextIn', { n: remain });
            }
          }, 1000);
        }
      }
    },
    hideEnded,
    destroy() {
      stopCountdown();
      el.remove();
    },
  };
}
