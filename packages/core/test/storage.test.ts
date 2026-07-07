import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgress, loadPrefs, loadProgress, savePrefs, saveProgress } from '../src/utils/storage';

beforeEach(() => {
  localStorage.clear();
});

describe('prefs storage', () => {
  it('returns empty object when nothing stored', () => {
    expect(loadPrefs()).toEqual({});
  });

  it('saves and merges prefs', () => {
    savePrefs({ volume: 60 });
    savePrefs({ rate: 1.5 });
    expect(loadPrefs()).toEqual({ volume: 60, rate: 1.5 });
  });

  it('tolerates corrupted json', () => {
    localStorage.setItem('sweet-player:prefs', '{not json');
    expect(loadPrefs()).toEqual({});
  });
});

describe('progress storage', () => {
  it('saves and loads progress by id', () => {
    saveProgress('ep1', 123.9);
    expect(loadProgress('ep1')).toBe(123);
    expect(loadProgress('ep2')).toBeNull();
  });

  it('clears progress', () => {
    saveProgress('ep1', 50);
    clearProgress('ep1');
    expect(loadProgress('ep1')).toBeNull();
  });

  it('tolerates corrupted value', () => {
    localStorage.setItem('sweet-player:progress:bad', 'abc');
    expect(loadProgress('bad')).toBeNull();
  });
});
