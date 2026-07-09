import { createEl } from '../../utils/dom';

export interface ContextMenuItem {
  label: string;
  onClick(): void;
}

export interface ContextMenu {
  hide(): void;
  destroy(): void;
}

/** 自定义右键菜单：屏蔽原生 contextmenu，在光标处弹出（超出容器时自动收回） */
export function createContextMenu(container: HTMLElement, items: ContextMenuItem[]): ContextMenu {
  const menu = createEl('div', { className: 'sp-context-menu', parent: container });
  for (const item of items) {
    const btn = createEl('div', {
      className: 'sp-context-item',
      text: item.label,
      parent: menu,
    });
    btn.addEventListener('click', () => {
      hide();
      item.onClick();
    });
  }

  function show(clientX: number, clientY: number): void {
    menu.classList.add('sp-visible');
    const rect = container.getBoundingClientRect();
    const x = Math.max(4, Math.min(clientX - rect.left, rect.width - menu.offsetWidth - 4));
    const y = Math.max(4, Math.min(clientY - rect.top, rect.height - menu.offsetHeight - 4));
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  function hide(): void {
    menu.classList.remove('sp-visible');
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    show(e.clientX, e.clientY);
  };
  const onPointerDown = (e: Event) => {
    if (!menu.contains(e.target as Node)) hide();
  };
  container.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('pointerdown', onPointerDown, true);

  return {
    hide,
    destroy() {
      container.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerdown', onPointerDown, true);
      menu.remove();
    },
  };
}
