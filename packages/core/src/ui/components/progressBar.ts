import { createEl } from '../../utils/dom';
import { clamp, formatTime } from '../../utils/time';
import { findThumbnailCue, parseThumbnailVtt, type ThumbnailCue } from '../../utils/vtt';
import { log } from '../../logger';
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
/** 脚部留白：最低热度也与进度条保持距离 */
const VB_FOOT = 22;
/** 曲线基线（收口位置），高于 viewBox 底边 VB_FOOT */
const VB_FLOOR = VB_H - VB_FOOT;

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
  return `${lineD} L ${lastX.toFixed(2)} ${VB_FLOOR} L ${firstX.toFixed(2)} ${VB_FLOOR} Z`;
}

export function createProgressBar(
  video: HTMLVideoElement,
  onSeek: (time: number) => void,
  heatmap?: HeatmapPoint[],
  thumbnailsUrl?: string,
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
        y: VB_FLOOR - (clamp(p.value, 0, maxVal) / maxVal) * (VB_FLOOR - VB_HEAD),
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
  /** 悬停位置指示针（游标卡尺样式），始终跟随指针，与预览图/时间提示是否开启无关 */
  const caliper = createEl('div', { className: 'sp-progress-caliper', parent: root });

  // 时间提示：位置固定在游标卡尺上方（不再和预览图绑定，也在无预览图时使用）
  const tooltip = createEl('div', { className: 'sp-progress-tooltip', text: '0:00', parent: root });

  // ---- 缩略图预览（可选）----
  const hasThumbnails = !!thumbnailsUrl;
  let thumbCues: ThumbnailCue[] = [];
  let thumbWrap: HTMLElement | null = null;
  let thumbImg: HTMLElement | null = null;
  let lastThumbUrl = '';

  let destroyed = false;
  const abortCtrl = new AbortController();

  if (hasThumbnails) {
    root.classList.add('sp-has-thumbnails');
    thumbWrap = createEl('div', { className: 'sp-thumb-preview', parent: root });
    thumbImg = createEl('div', { className: 'sp-thumb-preview-img', parent: thumbWrap });
    parseThumbnailVtt(thumbnailsUrl!, abortCtrl.signal)
      .then((cues) => {
        if (destroyed) return;
        thumbCues = cues;
        // 预加载所有 sprite 图，避免 hover 时首次显示为黑块
        const uniqueUrls = new Set(cues.map((c) => c.url));
        uniqueUrls.forEach((url) => {
          const img = new Image();
          img.src = url;
        });
      })
      .catch((err) => {
        if (destroyed) return;
        log('预览图', `VTT 加载失败: ${String(err)}`);
      });
  }

  function updateThumbPreview(ratio: number): void {
    if (!thumbWrap || !thumbImg || thumbCues.length === 0) return;
    const duration = video.duration || 0;
    const cue = findThumbnailCue(thumbCues, ratio * duration);
    if (!cue) {
      thumbWrap.style.display = 'none';
      return;
    }
    const w = cue.w ?? 160;
    const h = cue.h ?? 90;
    if (cue.url !== lastThumbUrl) {
      thumbImg.style.backgroundImage = `url("${cue.url}")`;
      lastThumbUrl = cue.url;
    }
    thumbImg.style.backgroundPosition = `-${cue.x ?? 0}px -${cue.y ?? 0}px`;
    thumbWrap.style.width = `${w}px`;
    thumbWrap.style.height = `${h}px`;
    thumbImg.style.width = `${w}px`;
    thumbImg.style.height = `${h}px`;

    const rect = root.getBoundingClientRect();
    const halfW = Math.min(w / 2, rect.width / 2);
    const center = ratio * rect.width;
    const left = clamp(center, halfW, rect.width - halfW) - halfW;
    thumbWrap.style.left = `${left}px`;
    thumbWrap.style.display = 'block';
  }

  let dragging = false;
  // 缓存 root 的位置/宽度，避免 pointermove 每次强制回流。
  // 拖拽/悬停期间元素位置很少变动；pointerdown 时刷新一次即可，同时监听 resize 兜底。
  let cachedRect: { left: number; width: number } | null = null;
  const readRect = (): { left: number; width: number } => {
    const r = root.getBoundingClientRect();
    return { left: r.left, width: r.width };
  };
  const invalidateRect = () => {
    cachedRect = null;
  };

  function ratioFromEvent(e: PointerEvent): number {
    const rect = cachedRect ?? (cachedRect = readRect());
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
    caliper.style.left = `${ratio * 100}%`;
    tooltip.style.left = `${ratio * 100}%`;
    tooltip.textContent = formatTime(ratio * (video.duration || 0));
    if (hasThumbnails) updateThumbPreview(ratio);
    if (dragging) render(ratio);
  }

  function onPointerDown(e: PointerEvent): void {
    dragging = true;
    root.classList.add('sp-dragging');
    root.setPointerCapture(e.pointerId);
    cachedRect = readRect(); // 交互开始时刷新一次
    render(ratioFromEvent(e));
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('sp-dragging');
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {
      /* 部分浏览器在指针已释放时会抛，忽略 */
    }
    onSeek(ratioFromEvent(e) * (video.duration || 0));
  }

  const onPointerCancel = () => {
    dragging = false;
    root.classList.remove('sp-dragging');
  };
  const onPointerLeave = () => {
    if (thumbWrap) thumbWrap.style.display = 'none';
  };

  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerCancel);
  if (hasThumbnails) {
    root.addEventListener('pointerleave', onPointerLeave);
  }
  window.addEventListener('resize', invalidateRect);
  window.addEventListener('scroll', invalidateRect, true);

  return {
    el: root,
    update() {
      if (!dragging) render();
    },
    setHeatmapVisible(visible) {
      if (heatmapEl) heatmapEl.classList.toggle('sp-heatmap-hidden', !visible);
    },
    destroy() {
      destroyed = true;
      abortCtrl.abort();
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerCancel);
      if (hasThumbnails) root.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', invalidateRect);
      window.removeEventListener('scroll', invalidateRect, true);
      root.remove();
    },
  };
}
