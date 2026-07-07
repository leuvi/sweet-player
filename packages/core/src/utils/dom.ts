interface CreateOptions {
  className?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  parent?: HTMLElement;
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, html, attrs, parent }: CreateOptions = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  if (html) el.innerHTML = html;
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

export function createSvgIcon(pathData: string, viewBox = '0 0 24 24'): string {
  return `<svg viewBox="${viewBox}" fill="currentColor" aria-hidden="true"><path d="${pathData}"/></svg>`;
}
