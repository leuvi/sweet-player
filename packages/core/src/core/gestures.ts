export interface GestureActions {
  seekBy(delta: number): void;
  /** 横滑过程中的预览提示 */
  onSeekPreview(delta: number): void;
  onSeekCommit(delta: number): void;
  adjustVolume(delta: number): void;
  toggleControls(): void;
  toggleFullscreen(): void;
}

const SWIPE_THRESHOLD = 12;
const DOUBLE_TAP_WINDOW = 280;
/** 横滑：滑满整个宽度对应的秒数 */
const SEEK_PER_WIDTH = 120;
/** 竖滑：滑满整个高度对应的音量变化 */
const VOLUME_PER_HEIGHT = 100;

type GestureMode = 'none' | 'seek' | 'volume';

/**
 * 移动端触摸手势（基于 pointer 事件，仅响应 pointerType === 'touch'）：
 * - 横滑：拖动 seek，松手执行
 * - 右半屏竖滑：音量
 * - 单击：切换控制栏显隐
 * - 双击左/右 1/3 区域：快退/快进；中间：全屏
 */
export class GestureController {
  private startX = 0;
  private startY = 0;
  private mode: GestureMode = 'none';
  private pendingDelta = 0;
  private lastTapTime = 0;
  private lastTapX = 0;
  private singleTapTimer: ReturnType<typeof setTimeout> | null = null;

  private onPointerDown = (e: PointerEvent) => this.handleDown(e);
  private onPointerMove = (e: PointerEvent) => this.handleMove(e);
  private onPointerUp = (e: PointerEvent) => this.handleUp(e);

  constructor(
    private container: HTMLElement,
    private video: HTMLVideoElement,
    private actions: GestureActions,
    private seekStep: number,
  ) {
    container.addEventListener('pointerdown', this.onPointerDown);
    container.addEventListener('pointermove', this.onPointerMove);
    container.addEventListener('pointerup', this.onPointerUp);
    container.addEventListener('pointercancel', this.onPointerUp);
  }

  /** 手势只在视频画面区域生效，控件上的触摸不拦截 */
  private isOnVideoSurface(e: PointerEvent): boolean {
    return e.target === this.video || e.target === this.container;
  }

  private handleDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || !this.isOnVideoSurface(e)) return;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.mode = 'none';
    this.pendingDelta = 0;
  }

  private handleMove(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || (this.mode === 'none' && !this.isOnVideoSurface(e))) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const rect = this.container.getBoundingClientRect();

    if (this.mode === 'none') {
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        this.mode = 'seek';
      } else if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        // 仅右半屏竖滑调音量，左半屏留给系统（亮度等）
        if (this.startX - rect.left > rect.width / 2) this.mode = 'volume';
      }
      if (this.mode !== 'none') this.container.setPointerCapture(e.pointerId);
    }

    if (this.mode === 'seek') {
      this.pendingDelta = Math.round((dx / rect.width) * SEEK_PER_WIDTH);
      this.actions.onSeekPreview(this.pendingDelta);
    } else if (this.mode === 'volume') {
      const deltaVol = Math.round((-(e.clientY - this.startY) / rect.height) * VOLUME_PER_HEIGHT);
      if (deltaVol !== 0) {
        this.actions.adjustVolume(deltaVol);
        this.startY = e.clientY;
      }
    }
  }

  private handleUp(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;

    if (this.mode === 'seek') {
      this.actions.onSeekCommit(this.pendingDelta);
    } else if (this.mode === 'none' && this.isOnVideoSurface(e)) {
      this.handleTap(e);
    }
    this.mode = 'none';
    this.pendingDelta = 0;
  }

  private handleTap(e: PointerEvent): void {
    const now = Date.now();
    const rect = this.container.getBoundingClientRect();

    if (now - this.lastTapTime < DOUBLE_TAP_WINDOW && Math.abs(e.clientX - this.lastTapX) < 60) {
      // 双击
      if (this.singleTapTimer) {
        clearTimeout(this.singleTapTimer);
        this.singleTapTimer = null;
      }
      this.lastTapTime = 0;
      const zone = (e.clientX - rect.left) / rect.width;
      if (zone < 1 / 3) this.actions.seekBy(-this.seekStep);
      else if (zone > 2 / 3) this.actions.seekBy(this.seekStep);
      else this.actions.toggleFullscreen();
      return;
    }

    this.lastTapTime = now;
    this.lastTapX = e.clientX;
    this.singleTapTimer = setTimeout(() => {
      this.singleTapTimer = null;
      this.actions.toggleControls();
    }, DOUBLE_TAP_WINDOW);
  }

  destroy(): void {
    if (this.singleTapTimer) clearTimeout(this.singleTapTimer);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('pointercancel', this.onPointerUp);
  }
}
