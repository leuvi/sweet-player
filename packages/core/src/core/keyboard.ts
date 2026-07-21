export interface KeyboardActions {
  togglePlay(): void;
  /** 单击左右键 */
  seekBy(delta: number): void;
  /** 长按累计期间的实时提示 */
  onLongSeekProgress(accumulated: number): void;
  /** 长按松开，执行累计跳转 */
  onLongSeekCommit(accumulated: number): void;
  adjustVolume(delta: number): void;
  toggleFullscreen(): void;
  toggleWebFullscreen(): void;
  toggleMute(): void;
}

export interface KeyboardOptions {
  seekStep: number;
  longSeekSteps: number[];
  stepUpInterval: number;
}

/** 按住超过该时长视为长按（毫秒） */
const HOLD_THRESHOLD = 300;
/** 长按期间累计 tick 间隔（毫秒），每秒累计一个当前档位步长 */
const TICK_INTERVAL = 250;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * 快捷键控制器。作用域：播放器容器获得焦点、或鼠标悬停在容器上时生效。
 * 左右键长按为阶梯式累计快进快退：按住每 stepUpInterval 升一档，松开时一次性 seek。
 */
export class KeyboardController {
  private holdDirection: 1 | -1 | 0 = 0;
  private holdStart = 0;
  private accumulated = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private hovering = false;

  private onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
  private onEnter = () => (this.hovering = true);
  private onLeave = () => (this.hovering = false);

  constructor(
    private container: HTMLElement,
    private actions: KeyboardActions,
    private options: KeyboardOptions,
  ) {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    container.addEventListener('mouseenter', this.onEnter);
    container.addEventListener('mouseleave', this.onLeave);
  }

  private isScoped(e: KeyboardEvent): boolean {
    if (isEditableTarget(e.target)) return false;
    return this.hovering || this.container.contains(document.activeElement);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isScoped(e)) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (!e.repeat) this.actions.togglePlay();
        break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        if (e.repeat) return; // 长按由内部计时器驱动，忽略系统 repeat
        this.startHold(e.key === 'ArrowRight' ? 1 : -1);
        break;
      }
      case 'ArrowUp':
        e.preventDefault();
        this.actions.adjustVolume(5);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.actions.adjustVolume(-5);
        break;
      case 'f':
      case 'F':
        if (!e.repeat) this.actions.toggleFullscreen();
        break;
      case 'w':
      case 'W':
        if (!e.repeat) this.actions.toggleWebFullscreen();
        break;
      case 'm':
      case 'M':
        if (!e.repeat) this.actions.toggleMute();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    if (this.holdDirection !== dir) return;
    this.endHold();
  }

  private startHold(direction: 1 | -1): void {
    // 已有反方向按住时先结算
    if (this.holdDirection !== 0) this.endHold();

    this.holdDirection = direction;
    this.holdStart = performance.now();
    this.accumulated = 0;

    this.tickTimer = setInterval(() => {
      const heldMs = performance.now() - this.holdStart;
      if (heldMs < HOLD_THRESHOLD) return;
      // 按持续时长确定当前档位：每 stepUpInterval 升一档，封顶最后一档
      const { longSeekSteps, stepUpInterval } = this.options;
      const levelIndex = Math.min(
        Math.floor((heldMs - HOLD_THRESHOLD) / stepUpInterval),
        longSeekSteps.length - 1,
      );
      const stepPerSecond = longSeekSteps[levelIndex];
      this.accumulated += stepPerSecond * (TICK_INTERVAL / 1000) * this.holdDirection;
      this.actions.onLongSeekProgress(Math.round(this.accumulated));
    }, TICK_INTERVAL);
  }

  private endHold(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    const heldMs = performance.now() - this.holdStart;
    const dir = this.holdDirection;
    this.holdDirection = 0;

    if (heldMs < HOLD_THRESHOLD) {
      // 短按：普通快进快退
      this.actions.seekBy(this.options.seekStep * dir);
    } else {
      this.actions.onLongSeekCommit(Math.round(this.accumulated));
    }
    this.accumulated = 0;
  }

  destroy(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.container.removeEventListener('mouseenter', this.onEnter);
    this.container.removeEventListener('mouseleave', this.onLeave);
  }
}
