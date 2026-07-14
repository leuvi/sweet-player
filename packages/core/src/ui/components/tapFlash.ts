import { createEl } from '../../utils/dom';
import { icons } from '../icons';

export interface TapFlash {
  el: HTMLElement;
  /** 播放/暂停切换时中心闪现对应图标（放大渐隐，类似 YouTube） */
  flash(kind: 'play' | 'pause'): void;
}

export function createTapFlash(): TapFlash {
  const el = createEl('div', { className: 'sp-tap-flash' });
  const iconEl = createEl('div', { className: 'sp-tap-flash-icon', parent: el });

  return {
    el,
    flash(kind) {
      iconEl.innerHTML = kind === 'play' ? icons.play : icons.pause;
      // 移除动画类并强制回流，保证连续切换时动画能重新触发
      el.classList.remove('sp-tap-flash-run');
      void el.offsetWidth;
      el.classList.add('sp-tap-flash-run');
    },
  };
}
