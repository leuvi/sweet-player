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
  /** 存在时该行渲染为行内滑块（一条线 + 圆块拖动），不走子菜单 */
  slider?: {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
  };
}

export interface SettingsPanel {
  el: HTMLElement;
  updateSection(key: string, patch: {
    items?: SettingsItem[];
    currentValue?: string;
    activeValue?: unknown;
    toggle?: { checked: boolean; onToggle?: () => void };
    slider?: { min?: number; max?: number; step?: number; value?: number; onChange?: (value: number) => void };
  }): void;
  /** 动态添加一行（插件注册），返回移除函数 */
  addSection(section: SettingsSection): () => void;
  close(): void;
  destroy(): void;
}

export function createSettingsPanel(opts: {
  buttonTitle: string;
  sections: SettingsSection[];
}): SettingsPanel {
  const root = createEl('div', { className: 'sp-menu sp-settings' });
  const btn = createEl('div', {
    className: 'sp-btn',
    html: icons.settings,
    attrs: { role: 'button', tabindex: '0', title: opts.buttonTitle, 'aria-label': opts.buttonTitle },
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
      if (sec.slider) {
        const row = createEl('div', {
          className: 'sp-settings-row sp-settings-slider-row',
          attrs: { 'data-key': sec.key },
          parent: mainView,
        });
        createEl('span', { className: 'sp-settings-label', text: sec.label, parent: row });
        const input = createEl('input', {
          className: 'sp-slider-input',
          attrs: {
            type: 'range',
            min: String(sec.slider.min),
            max: String(sec.slider.max),
            step: String(sec.slider.step),
            value: String(sec.slider.value),
            'aria-label': sec.label,
          },
          parent: row,
        });
        input.addEventListener('input', (e) => {
          e.stopPropagation();
          const v = Number((e.target as HTMLInputElement).value);
          sec.slider!.value = v; // 同步内部状态，重新渲染时保持一致
          sec.slider!.onChange(v);
        });
        // 阻止点击 slider 导致面板关闭
        input.addEventListener('click', (e) => e.stopPropagation());
        continue;
      }
      if (sec.items.length === 0) continue;
      const row = createEl('div', {
        className: 'sp-settings-row',
        attrs: { 'data-key': sec.key },
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

    const back = createEl('div', {
      className: 'sp-settings-back',
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
      const itemBtn = createEl('div', {
        className: 'sp-menu-item' + (item.value === sec.activeValue ? ' sp-active' : ''),
        text: item.label,
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
      if (patch.slider) {
        if (sec.slider) {
          if (patch.slider.min !== undefined) sec.slider.min = patch.slider.min;
          if (patch.slider.max !== undefined) sec.slider.max = patch.slider.max;
          if (patch.slider.step !== undefined) sec.slider.step = patch.slider.step;
          if (patch.slider.value !== undefined) sec.slider.value = patch.slider.value;
          if (patch.slider.onChange) sec.slider.onChange = patch.slider.onChange;
        } else {
          sec.slider = {
            min: patch.slider.min ?? 0,
            max: patch.slider.max ?? 100,
            step: patch.slider.step ?? 1,
            value: patch.slider.value ?? 0,
            onChange: patch.slider.onChange ?? (() => {}),
          };
        }
      }
      if (sec.toggle || sec.slider) {
        // 行内行只出现在主视图，无需渲染子视图
        if (!activeSub) renderMain();
        return;
      }
      if (activeSub === key) renderSub(key);
      if (!activeSub) renderMain();
    },
    addSection(section) {
      // 避免重复 key
      if (!sections.find((s) => s.key === section.key)) {
        sections = [...sections, section];
        if (!activeSub) renderMain();
      }
      return () => {
        sections = sections.filter((s) => s.key !== section.key);
        if (!activeSub) renderMain();
      };
    },
    close,
    destroy() {
      document.removeEventListener('click', onDocClick);
      root.remove();
    },
  };
}
