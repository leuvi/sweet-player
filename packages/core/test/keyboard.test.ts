import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardController, type KeyboardActions } from '../src/core/keyboard';

function pressKey(key: string, type: 'keydown' | 'keyup' = 'keydown', repeat = false): void {
  document.dispatchEvent(new KeyboardEvent(type, { key, repeat, bubbles: true }));
}

describe('KeyboardController 长按阶梯', () => {
  let container: HTMLDivElement;
  let actions: KeyboardActions;
  let controller: KeyboardController;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    actions = {
      togglePlay: vi.fn(),
      seekBy: vi.fn(),
      onLongSeekProgress: vi.fn(),
      onLongSeekCommit: vi.fn(),
      adjustVolume: vi.fn(),
      toggleFullscreen: vi.fn(),
      toggleMute: vi.fn(),
    };
    controller = new KeyboardController(container, actions, {
      seekStep: 10,
      longSeekSteps: [10, 30, 60],
      stepUpInterval: 2000,
    });
    // 模拟鼠标悬停使快捷键进入作用域
    container.dispatchEvent(new MouseEvent('mouseenter'));
  });

  afterEach(() => {
    controller.destroy();
    container.remove();
    vi.useRealTimers();
  });

  it('短按右键 = 单步快进 seekStep', () => {
    pressKey('ArrowRight');
    vi.advanceTimersByTime(100);
    pressKey('ArrowRight', 'keyup');
    expect(actions.seekBy).toHaveBeenCalledWith(10);
    expect(actions.onLongSeekCommit).not.toHaveBeenCalled();
  });

  it('短按左键 = 单步快退', () => {
    pressKey('ArrowLeft');
    vi.advanceTimersByTime(100);
    pressKey('ArrowLeft', 'keyup');
    expect(actions.seekBy).toHaveBeenCalledWith(-10);
  });

  it('长按 1 秒：档位 1（10 秒/秒），松开 commit 正值', () => {
    pressKey('ArrowRight');
    vi.advanceTimersByTime(1300); // 300ms 阈值 + 1s 累计
    pressKey('ArrowRight', 'keyup');
    expect(actions.seekBy).not.toHaveBeenCalled();
    expect(actions.onLongSeekProgress).toHaveBeenCalled();
    expect(actions.onLongSeekCommit).toHaveBeenCalledOnce();
    const committed = (actions.onLongSeekCommit as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(committed).toBeGreaterThan(5);
    expect(committed).toBeLessThanOrEqual(15);
  });

  it('长按升档：持续按住累计速率提升且封顶', () => {
    pressKey('ArrowRight');
    // 300ms 阈值 + 2s 档1(10/s) + 2s 档2(30/s) + 2s 档3(60/s) ≈ 20+60+120 = 200s
    vi.advanceTimersByTime(300 + 6000);
    pressKey('ArrowRight', 'keyup');
    const committed = (actions.onLongSeekCommit as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(committed).toBeGreaterThan(150);
    expect(committed).toBeLessThanOrEqual(220);
    // 再按 2 秒：仍是封顶档 60/s，不会超过
    (actions.onLongSeekCommit as ReturnType<typeof vi.fn>).mockClear();
    pressKey('ArrowRight');
    vi.advanceTimersByTime(300 + 8000);
    pressKey('ArrowRight', 'keyup');
    const capped = (actions.onLongSeekCommit as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    // 阈值后 8s：2s*10 + 2s*30 + 4s*60 = 320（若无封顶且继续升档会更大）
    expect(capped).toBeGreaterThan(280);
    expect(capped).toBeLessThanOrEqual(340);
  });

  it('长按左键 commit 负值', () => {
    pressKey('ArrowLeft');
    vi.advanceTimersByTime(1300);
    pressKey('ArrowLeft', 'keyup');
    const committed = (actions.onLongSeekCommit as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(committed).toBeLessThan(0);
  });

  it('系统 repeat 的 keydown 被忽略（不重置计时）', () => {
    pressKey('ArrowRight');
    vi.advanceTimersByTime(500);
    pressKey('ArrowRight', 'keydown', true);
    vi.advanceTimersByTime(500);
    pressKey('ArrowRight', 'keyup');
    expect(actions.onLongSeekCommit).toHaveBeenCalledOnce();
  });

  it('空格切换播放、上下键调音量、F/M 快捷键', () => {
    pressKey(' ');
    expect(actions.togglePlay).toHaveBeenCalledOnce();
    pressKey('ArrowUp');
    expect(actions.adjustVolume).toHaveBeenCalledWith(5);
    pressKey('ArrowDown');
    expect(actions.adjustVolume).toHaveBeenCalledWith(-5);
    pressKey('f');
    expect(actions.toggleFullscreen).toHaveBeenCalledOnce();
    pressKey('m');
    expect(actions.toggleMute).toHaveBeenCalledOnce();
  });

  it('鼠标离开且无焦点时快捷键不生效', () => {
    container.dispatchEvent(new MouseEvent('mouseleave'));
    pressKey(' ');
    expect(actions.togglePlay).not.toHaveBeenCalled();
  });

  it('输入框聚焦时忽略快捷键', () => {
    const input = document.createElement('input');
    container.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(actions.togglePlay).not.toHaveBeenCalled();
  });
});
