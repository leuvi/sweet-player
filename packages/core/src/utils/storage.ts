const PREFS_KEY = 'sweet-player:prefs';
const PROGRESS_PREFIX = 'sweet-player:progress:';

export interface StoredPrefs {
  volume?: number;
  muted?: boolean;
  rate?: number;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 隐私模式等场景静默失败 */
  }
}

export function loadPrefs(): StoredPrefs {
  const raw = safeGet(PREFS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredPrefs;
  } catch {
    return {};
  }
}

export function savePrefs(prefs: StoredPrefs): void {
  safeSet(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...prefs }));
}

export function loadProgress(id: string): number | null {
  const raw = safeGet(PROGRESS_PREFIX + id);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveProgress(id: string, time: number): void {
  safeSet(PROGRESS_PREFIX + id, String(Math.floor(time)));
}

export function clearProgress(id: string): void {
  try {
    localStorage.removeItem(PROGRESS_PREFIX + id);
  } catch {
    /* ignore */
  }
}
