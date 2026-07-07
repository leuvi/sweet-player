import { createEl } from '../../utils/dom';
import { icons } from '../icons';

export interface SettingsItem<T = unknown> {
  label: string;
  value: T;
}

export interface SettingsSection<T = unknown> {
  key: string;
  label: string;
  currentValue: string;
  items: SettingsItem<T>[];
  activeValue?: T;
  onSelect: (item: SettingsItem<T>) => void;
  /** 存在时该行渲染为行内开关，不走子菜单 */
  toggle?: {
    checked: boolean;
    onToggle: () => void;
  };
}

export interface SettingsPanel {
  el: HTMLElement;
  updateSection(key: string, patch: {
    items?: SettingsItem[];
    currentValue?: string;
    activeValue?: unknown;
    toggle?: { checked: boolean; onToggle?: () => void };
  }): void;
  close(): void;
  destroy(): void;
}

export function createSettingsPanel(opts: {
  buttonTitle: string;
  sections: SettingsSection[];
}): SettingsPanel {
  const root = createEl('div', { className: 'sp-menu sp-settings' });
  const btn = createEl('button', {
    className: 'sp-btn',
    html: icons.settings,
    attrs: { type: 'button', title: opts.buttonTitle, 'aria-label': opts.buttonTitle },
    parent: root,
  });
  const panel = createEl('div', { className: 'sp-settings-panel', parent: root });

  const mainView = createEl('div', { className: 'sp-settings-main', parent: panel });
  const subView = createEl('div', { className: 'sp-settings-sub', parent: panel });

  let sections = opts.sections;
  let activeSub: string | null = null;

  function renderMain(): void {
    mainView.innerHTML = '';
    for (const sec of sections) {
      if (sec.toggle) {
        const row = createEl('div', {
          className: 'sp-settings-row sp-settings-toggle-row',
          attrs: { 'data-key': sec.key },
          parent: mainView,
        });
        createEl('span', { className: 'sp-settings-label', text: sec.label, parent: row });
        const track = createEl('div', {
          className: 'sp-toggle' + (sec.toggle.checked ? ' sp-on' : ''),
          attrs: { role: 'switch', 'aria-checked': String(sec.toggle.checked), tabindex: '0' },
          parent: row,
        });
        createEl('span', { className: 'sp-toggle-thumb', parent: track });
        const handler = (e: Event) => {
          e.stopPropagation();
          sec.toggle!.onToggle();
        };
        row.addEventListener('click', handler);
        track.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler(e);
          }
        });
        continue;
      }
      if (sec.items.length === 0) continue;
      const row = createEl('button', {
        className: 'sp-settings-row',
        attrs: { type: 'button', 'data-key': sec.key },
        parent: mainView,
      });
      createEl('span', { className: 'sp-settings-label', text: sec.label, parent: row });
      createEl('span', { className: 'sp-settings-value', text: sec.currentValue, parent: row });
      const arrow = createEl('span', { className: 'sp-settings-arrow', parent: row });
      arrow.innerHTML = icons.chevronRight;
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        showSub(sec.key);
      });
    }
  }

  function renderSub(key: string): void {
    subView.innerHTML = '';
    const sec = sections.find((s) => s.key === key);
    if (!sec) return;

    const back = createEl('button', {
      className: 'sp-settings-back',
      attrs: { type: 'button' },
      parent: subView,
    });
    const backArrow = createEl('span', { className: 'sp-settings-back-arrow', parent: back });
    backArrow.innerHTML = icons.chevronLeft;
    createEl('span', { text: sec.label, parent: back });
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      showMain();
    });

    for (const item of sec.items) {
      const itemBtn = createEl('button', {
        className: 'sp-menu-item' + (item.value === sec.activeValue ? ' sp-active' : ''),
        text: item.label,
        attrs: { type: 'button' },
        parent: subView,
      });
      itemBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        close();
        sec.onSelect(item);
      });
    }
  }

  function showSub(key: string): void {
    activeSub = key;
    renderSub(key);
    mainView.style.display = 'none';
    subView.style.display = '';
  }

  function showMain(): void {
    activeSub = null;
    mainView.style.display = '';
    subView.style.display = 'none';
  }

  function close(): void {
    root.classList.remove('sp-open');
    showMain();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !root.classList.contains('sp-open');
    root.closest('.sp-controls')?.querySelectorAll('.sp-menu.sp-open').forEach((m) => m.classList.remove('sp-open'));
    if (willOpen) {
      renderMain();
      showMain();
    }
    root.classList.toggle('sp-open', willOpen);
  });

  const onDocClick = () => close();
  document.addEventListener('click', onDocClick);

  panel.addEventListener('click', (e) => e.stopPropagation());

  renderMain();
  showMain();

  return {
    el: root,
    updateSection(key, patch) {
      const sec = sections.find((s) => s.key === key);
      if (!sec) return;
      if (patch.items !== undefined) sec.items = patch.items;
      if (patch.currentValue !== undefined) sec.currentValue = patch.currentValue;
      if (patch.activeValue !== undefined) sec.activeValue = patch.activeValue;
      if (patch.toggle) {
        if (sec.toggle) {
          sec.toggle.checked = patch.toggle.checked;
          if (patch.toggle.onToggle) sec.toggle.onToggle = patch.toggle.onToggle;
        } else {
          sec.toggle = { checked: patch.toggle.checked, onToggle: patch.toggle.onToggle ?? (() => {}) };
        }
      }
      if (sec.toggle) {
        // toggle 行只出现在主视图，无需渲染子视图
        if (!activeSub) renderMain();
        return;
      }
      if (activeSub === key) renderSub(key);
      if (!activeSub) renderMain();
    },
    close,
    destroy() {
      document.removeEventListener('click', onDocClick);
      root.remove();
    },
  };
}
