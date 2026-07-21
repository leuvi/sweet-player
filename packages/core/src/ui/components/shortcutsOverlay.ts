import { createEl } from '../../utils/dom';
import type { I18n } from '../../i18n';

export interface ShortcutsOverlay {
  toggle(): void;
  hide(): void;
  destroy(): void;
}

/** 快捷键说明面板（居中蒙层） */
export function createShortcutsOverlay(container: HTMLElement, i18n: I18n, seekStep: number): ShortcutsOverlay {
  let root: HTMLElement | null = null;

  function show(): void {
    if (root) return;
    root = createEl('div', { className: 'sp-shortcuts', parent: container });
    const closeBtn = createEl('div', {
      className: 'sp-shortcuts-close',
      text: '✕',
      attrs: { role: 'button', tabindex: '0', 'aria-label': i18n.t('close') },
      parent: root,
    });
    closeBtn.addEventListener('click', hide);
    createEl('div', { className: 'sp-shortcuts-title', text: i18n.t('shortcuts'), parent: root });

    const dl = createEl('dl', { className: 'sp-shortcuts-body', parent: root });
    const rows: [string, string][] = [
      [i18n.t('scKeySpace'), i18n.t('scPlayPause')],
      ['← / →', i18n.t('scSeek', { n: seekStep })],
      [i18n.t('scKeyHold'), i18n.t('scLongSeek')],
      ['↑ / ↓', i18n.t('scVolume')],
      ['F', i18n.t('scFullscreen')],
      ['W', i18n.t('scWebFullscreen')],
      ['M', i18n.t('scMute')],
    ];
    for (const [key, action] of rows) {
      const row = createEl('div', { className: 'sp-shortcuts-row', parent: dl });
      const dt = createEl('dt', { parent: row });
      createEl('span', { className: 'sp-kbd', text: key, parent: dt });
      createEl('dd', { text: action, parent: row });
    }
  }

  function hide(): void {
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
