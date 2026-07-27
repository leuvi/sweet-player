import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from '../src/utils/saveQueue';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveQueue', () => {
  it('debounces rapid pushes into a single write', () => {
    const write = vi.fn();
    const q = createSaveQueue<{ volume?: number }>(write, 800, 'test');

    q.push({ volume: 10 });
    q.push({ volume: 20 });
    q.push({ volume: 30 });
    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(800);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith({ volume: 30 });
  });

  it('merges object snapshots across pushes', () => {
    const write = vi.fn();
    const q = createSaveQueue<{ volume?: number; rate?: number }>(write, 800, 'test');

    q.push({ volume: 60 });
    q.push({ rate: 1.5 });
    vi.advanceTimersByTime(800);

    expect(write).toHaveBeenCalledWith({ volume: 60, rate: 1.5 });
  });

  it('overwrites rather than merges for scalar values', () => {
    const write = vi.fn();
    const q = createSaveQueue<number | null>(write, 0, 'test');

    q.push(10);
    q.push(20);
    vi.advanceTimersByTime(0);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(20);
  });

  it('flush() writes pending value immediately', () => {
    const write = vi.fn();
    const q = createSaveQueue<{ volume?: number }>(write, 800, 'test');

    q.push({ volume: 42 });
    q.flush();

    expect(write).toHaveBeenCalledWith({ volume: 42 });
  });

  it('flush() is a no-op when nothing is pending', () => {
    const write = vi.fn();
    const q = createSaveQueue<{ volume?: number }>(write, 800, 'test');

    q.flush();
    expect(write).not.toHaveBeenCalled();
  });

  it('does not start a second write while one is in flight', async () => {
    let resolveWrite: (() => void) | undefined;
    const write = vi.fn(() => new Promise<void>((r) => (resolveWrite = r)));
    const q = createSaveQueue<{ volume?: number }>(write, 0, 'test');

    q.push({ volume: 1 });
    vi.advanceTimersByTime(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);

    // 前一次尚未 resolve，新值只应排队
    q.push({ volume: 2 });
    vi.advanceTimersByTime(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);

    resolveWrite?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith({ volume: 2 });
  });

  it('keeps working after a failed write', async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(undefined);
    const q = createSaveQueue<{ volume?: number }>(write, 0, 'test');

    q.push({ volume: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);

    q.push({ volume: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith({ volume: 2 });
  });
});
