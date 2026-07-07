import { createEl } from '../../utils/dom';

export interface Osd {
  el: HTMLElement;
  /** 短暂显示一条提示（自动淡出） */
  flash(text: string): void;
  /** 持续显示（长按 seek 期间用），需手动 hide */
  show(text: string): void;
  hide(): void;
}

export function createOsd(): Osd {
  const el = createEl('div', { className: 'sp-osd' });
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function show(text: string): void {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    el.textContent = text;
    el.classList.add('sp-visible');
  }

  function hide(): void {
    el.classList.remove('sp-visible');
  }

  return {
    el,
    show,
    hide,
    flash(text) {
      show(text);
      hideTimer = setTimeout(hide, 800);
    },
  };
}
