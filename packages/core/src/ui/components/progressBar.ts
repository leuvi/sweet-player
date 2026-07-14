import { createEl } from '../../utils/dom';
import { clamp, formatTime } from '../../utils/time';
import type { HeatmapPoint } from '../../types';

export interface ProgressBar {
  el: HTMLElement;
  update(): void;
  /** 显隐热度曲线（无数据时无效果） */
  setHeatmapVisible(visible: boolean): void;
  destroy(): void;
}

/** clipPath id 需全局唯一，避免同页多实例互相覆盖 */
let heatmapUid = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';
const VB_W = 1000;
const VB_H = 100;
/** 峰顶留白，避免贴到顶边 */
const VB_HEAD = 12;

/** Catmull-Rom 样条转贝塞尔，生成经过所有采样点的平滑开放曲线（仅顶边，用于描边） */
function buildLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** 顶边曲线收口到基线，闭合成面积（用于渐变填充） */
function closeArea(lineD: string, firstX: number, lastX: number): string {
  if (!lineD) return '';
  return `${lineD} L ${lastX.toFixed(2)} ${VB_H} L ${firstX.toFixed(2)} ${VB_H} Z`;
}

export function createProgressBar(
  video: HTMLVideoElement,
  onSeek: (time: number) => void,
  heatmap?: HeatmapPoint[],
): ProgressBar {
  const root = createEl('div', { className: 'sp-progress' });

  // ---- 热度曲线（可选）----
  const points = (heatmap ?? []).filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value)).sort((a, b) => a.time - b.time);
  const hasHeatmap = points.length > 0;
  let heatmapEl: HTMLElement | null = null;
  let clipRect: SVGRectElement | null = null;
  let builtForDuration = -1;
  let buildHeatmap: ((duration: number) => void) | null = null;
  const clipId = `sp-hm-${++heatmapUid}`;

  if (hasHeatmap) {
    const el = (tag: string, attrs: Record<string, string>): SVGElement => {
      const node = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      return node;
    };

    heatmapEl = createEl('div', { className: 'sp-heatmap', parent: root });
    const svg = el('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, preserveAspectRatio: 'none' });

    // 垂直渐变：顶部半透明白 → 底部透明；已播放层更亮。收口线用非缩放描边
    const baseGradId = `sp-hmg-b-${heatmapUid}`;
    const playedGradId = `sp-hmg-p-${heatmapUid}`;
    const grad = (id: string, topClass: string): SVGElement => {
      const g = el('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' });
      g.appendChild(el('stop', { offset: '0', class: topClass }));
      g.appendChild(el('stop', { offset: '1', class: 'sp-heatmap-stop-bottom' }));
      return g;
    };
    const defs = el('defs', {});
    defs.appendChild(grad(baseGradId, 'sp-heatmap-stop-base'));
    defs.appendChild(grad(playedGradId, 'sp-heatmap-stop-played'));
    const clip = el('clipPath', { id: clipId });
    clipRect = el('rect', { x: '0', y: '0', width: '0', height: String(VB_H) }) as SVGRectElement;
    clip.appendChild(clipRect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const baseArea = el('path', { class: 'sp-heatmap-area', fill: `url(#${baseGradId})` });
    const baseLine = el('path', { class: 'sp-heatmap-line sp-heatmap-line-base', 'vector-effect': 'non-scaling-stroke' });
    const playedGroup = el('g', { 'clip-path': `url(#${clipId})` });
    const playedArea = el('path', { class: 'sp-heatmap-area', fill: `url(#${playedGradId})` });
    const playedLine = el('path', { class: 'sp-heatmap-line sp-heatmap-line-played', 'vector-effect': 'non-scaling-stroke' });
    playedGroup.appendChild(playedArea);
    playedGroup.appendChild(playedLine);
    svg.appendChild(baseArea);
    svg.appendChild(baseLine);
    svg.appendChild(playedGroup);
    heatmapEl.appendChild(svg);

    // 时间归一化到 viewBox 需要 duration，故延迟到已知时长时构建（构建后短路）
    const maxVal = points.reduce((m, p) => Math.max(m, p.value), 0) || 1;
    buildHeatmap = (duration: number) => {
      if (duration <= 0 || duration === builtForDuration) return;
      builtForDuration = duration;
      const coords = points.map((p) => ({
        x: clamp(p.time / duration, 0, 1) * VB_W,
        y: VB_H - (clamp(p.value, 0, maxVal) / maxVal) * (VB_H - VB_HEAD),
      }));
      const lineD = buildLinePath(coords);
      const areaD = closeArea(lineD, coords[0].x, coords[coords.length - 1].x);
      baseLine.setAttribute('d', lineD);
      playedLine.setAttribute('d', lineD);
      baseArea.setAttribute('d', areaD);
      playedArea.setAttribute('d', areaD);
    };
  }

  const track = createEl('div', { className: 'sp-progress-track', parent: root });
  const buffered = createEl('div', { className: 'sp-progress-buffered', parent: track });
  const played = createEl('div', { className: 'sp-progress-played', parent: track });
  const thumb = createEl('div', { className: 'sp-progress-thumb', parent: track });
  const tooltip = createEl('div', { className: 'sp-progress-tooltip', text: '0:00', parent: root });

  let dragging = false;

  function ratioFromEvent(e: PointerEvent): number {
    const rect = root.getBoundingClientRect();
    return clamp((e.clientX - rect.left) / rect.width, 0, 1);
  }

  function render(ratio?: number): void {
    const duration = video.duration || 0;
    const playedRatio = ratio ?? (duration ? video.currentTime / duration : 0);
    played.style.width = `${playedRatio * 100}%`;
    thumb.style.left = `${playedRatio * 100}%`;

    let bufferedEnd = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) > bufferedEnd) {
        bufferedEnd = video.buffered.end(i);
      }
    }
    buffered.style.width = duration ? `${(bufferedEnd / duration) * 100}%` : '0%';

    if (hasHeatmap && duration) {
      buildHeatmap?.(duration);
      if (clipRect) clipRect.setAttribute('width', String(playedRatio * VB_W));
    }
  }

  function onPointerMove(e: PointerEvent): void {
    const ratio = ratioFromEvent(e);
    tooltip.style.left = `${ratio * 100}%`;
    tooltip.textContent = formatTime(ratio * (video.duration || 0));
    if (dragging) render(ratio);
  }

  function onPointerDown(e: PointerEvent): void {
    dragging = true;
    root.classList.add('sp-dragging');
    root.setPointerCapture(e.pointerId);
    render(ratioFromEvent(e));
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('sp-dragging');
    onSeek(ratioFromEvent(e) * (video.duration || 0));
  }

  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', () => {
    dragging = false;
    root.classList.remove('sp-dragging');
  });

  return {
    el: root,
    update() {
      if (!dragging) render();
    },
    setHeatmapVisible(visible) {
      if (heatmapEl) heatmapEl.classList.toggle('sp-heatmap-hidden', !visible);
    },
    destroy() {
      root.remove();
    },
  };
}
