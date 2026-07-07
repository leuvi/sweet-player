import { describe, expect, it } from 'vitest';
import { clamp, formatTime } from '../src/utils/time';

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(75)).toBe('1:15');
    expect(formatTime(600)).toBe('10:00');
  });

  it('formats hours with padded minutes', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7325)).toBe('2:02:05');
  });

  it('handles invalid input', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('clamp', () => {
  it('clamps to range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
