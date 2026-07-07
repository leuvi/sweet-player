import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../src/core/events';

describe('EventEmitter', () => {
  it('emits to registered listeners with payload', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('ratechange', fn);
    emitter.emit('ratechange', 1.5);
    expect(fn).toHaveBeenCalledWith(1.5);
  });

  it('on returns unsubscribe function', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    const off = emitter.on('play', fn);
    off();
    emitter.emit('play', undefined);
    expect(fn).not.toHaveBeenCalled();
  });

  it('off removes specific listener only', () => {
    const emitter = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on('pause', a);
    emitter.on('pause', b);
    emitter.off('pause', a);
    emitter.emit('pause', undefined);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it('removeAll clears everything', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('ended', fn);
    emitter.removeAll();
    emitter.emit('ended', undefined);
    expect(fn).not.toHaveBeenCalled();
  });
});
