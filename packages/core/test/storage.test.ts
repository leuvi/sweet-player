import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgress, loadPrefs, loadProgress, savePrefs, saveProgress } from '../src/utils/storage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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

  it('drops legacy fields left over from older versions', () => {
    // 1.2.3 及更早版本存过 loop，合并写入会一直把它搬运下去
    localStorage.setItem('sweet-player:prefs', JSON.stringify({ volume: 100, muted: true, loop: false }));
    savePrefs({ rate: 1.5 });
    expect(loadPrefs()).toEqual({ volume: 100, muted: true, rate: 1.5 });
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
    sessionStorage.setItem('sweet-player:progress', '{not json');
    expect(loadProgress('bad')).toBeNull();
  });

  it('stores progress in sessionStorage, never localStorage', () => {
    saveProgress('ep1', 10);

    expect(sessionStorage.getItem('sweet-player:progress')).not.toBeNull();
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('keeps every video in a single key', () => {
    saveProgress('ep1', 10);
    saveProgress('ep2', 20);
    saveProgress('ep3', 30);

    expect(Object.keys(sessionStorage)).toEqual(['sweet-player:progress']);
    expect(loadProgress('ep2')).toBe(20);
  });

  it('evicts the least recently written entry past the limit', () => {
    // 上限 100：写 101 条后最早那条应被淘汰，最后一条保留
    for (let i = 0; i < 101; i++) saveProgress(`ep${i}`, i + 10);

    expect(loadProgress('ep0')).toBeNull();
    expect(loadProgress('ep100')).toBe(110);

    const map = JSON.parse(sessionStorage.getItem('sweet-player:progress')!) as Record<string, unknown>;
    expect(Object.keys(map)).toHaveLength(100);
  });

  it('purges progress keys left in localStorage by older versions', async () => {
    // 1.3.0 之前进度存在 localStorage，每个视频一个键
    localStorage.setItem('sweet-player:progress:ep1', '120');
    localStorage.setItem('sweet-player:progress:ep2', '240');
    localStorage.setItem('sweet-player:prefs', JSON.stringify({ volume: 70 }));

    // 清理只在模块首次读取时跑一次，重置模块才能重复测
    vi.resetModules();
    const storage = await import('../src/utils/storage');
    storage.loadProgress('ep1');

    expect(Object.keys(localStorage)).toEqual(['sweet-player:prefs']);
    // 会话级语义：旧的跨会话进度不迁移，直接丢弃
    expect(storage.loadProgress('ep1')).toBeNull();
  });
});
