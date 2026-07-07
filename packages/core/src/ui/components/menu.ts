import { createEl } from '../../utils/dom';

export interface MenuItem<T = unknown> {
  label: string;
  value: T;
}

export interface PopupMenu<T = unknown> {
  el: HTMLElement;
  setItems(items: MenuItem<T>[]): void;
  setActive(value: T): void;
  setButtonContent(html: string): void;
  close(): void;
}

/**
 * 通用上拉菜单：倍速/画质/比例/音轨共用。
 * items 为空时显示 emptyText 占位（预留菜单场景）。
 */
export function createPopupMenu<T>(opts: {
  buttonHtml: string;
  title: string;
  emptyText?: string;
  onSelect: (item: MenuItem<T>) => void;
}): PopupMenu<T> {
  const root = createEl('div', { className: 'sp-menu' });
  const btn = createEl('button', {
    className: 'sp-btn sp-menu-btn',
    html: opts.buttonHtml,
    attrs: { type: 'button', title: opts.title, 'aria-label': opts.title },
    parent: root,
  });
  const panel = createEl('div', { className: 'sp-menu-panel', parent: root });

  let items: MenuItem<T>[] = [];
  let activeValue: T | undefined;

  function render(): void {
    panel.innerHTML = '';
    if (items.length === 0) {
      createEl('div', { className: 'sp-menu-empty', text: opts.emptyText ?? '-', parent: panel });
      return;
    }
    for (const item of items) {
      const itemBtn = createEl('button', {
        className: 'sp-menu-item' + (item.value === activeValue ? ' sp-active' : ''),
        text: item.label,
        attrs: { type: 'button' },
        parent: panel,
      });
      itemBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        close();
        opts.onSelect(item);
      });
    }
  }

  function close(): void {
    root.classList.remove('sp-open');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !root.classList.contains('sp-open');
    // 同一控制栏内互斥：先关掉其他已打开的菜单
    root.closest('.sp-controls')?.querySelectorAll('.sp-menu.sp-open').forEach((m) => m.classList.remove('sp-open'));
    root.classList.toggle('sp-open', willOpen);
  });

  document.addEventListener('click', close);

  render();

  return {
    el: root,
    setItems(next) {
      items = next;
      render();
    },
    setActive(value) {
      activeValue = value;
      render();
    },
    setButtonContent(html) {
      btn.innerHTML = html;
    },
    close,
  };
}
