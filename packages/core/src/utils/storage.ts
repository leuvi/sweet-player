/**
 * 存储分两处：
 * - 偏好（音量 / 静音 / 倍速）→ localStorage，跨会话长期保留；
 * - 播放进度 → sessionStorage，刷新仍在、关闭标签页即失效。
 *
 * 两者各自只占一个键，视频再多也不会往存储里堆条目。
 */

const PREFS_KEY = 'sweet-player:prefs';
const PROGRESS_KEY = 'sweet-player:progress';
/** 进度表最多保留的条数，超出按最后写入时间淘汰最旧的 */
const PROGRESS_LIMIT = 100;

export interface StoredPrefs {
  volume?: number;
  muted?: boolean;
  rate?: number;
}

/** 单条进度：t = 秒数，at = 最后写入时间戳（用于 LRU 淘汰） */
interface ProgressEntry {
  t: number;
  at: number;
}

type ProgressMap = Record<string, ProgressEntry>;

/** 隐私模式等场景下访问 storage 本身就会抛，统一在这里兜住 */
function getStore(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function safeGet(kind: 'local' | 'session', key: string): string | null {
  try {
    return getStore(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(kind: 'local' | 'session', key: string, value: string): void {
  try {
    getStore(kind)?.setItem(key, value);
  } catch {
    /* 配额写满 / 隐私模式，静默失败 */
  }
}

// ---------- 偏好（localStorage） ----------

export function loadPrefs(): StoredPrefs {
  const raw = safeGet('local', PREFS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredPrefs;
  } catch {
    return {};
  }
}

/**
 * 合并写入。只落盘当前支持的字段——历史遗留字段（如曾经存过的 loop）
 * 会在下一次写入时被自然清除，不会被 `...loadPrefs()` 一直搬运下去。
 */
export function savePrefs(prefs: StoredPrefs): void {
  const merged: StoredPrefs = { ...loadPrefs(), ...prefs };
  const clean: StoredPrefs = {};
  if (merged.volume !== undefined) clean.volume = merged.volume;
  if (merged.muted !== undefined) clean.muted = merged.muted;
  if (merged.rate !== undefined) clean.rate = merged.rate;
  safeSet('local', PREFS_KEY, JSON.stringify(clean));
}

// ---------- 播放进度（sessionStorage） ----------

/** 本次会话是否已清理过 localStorage 里的旧进度键 */
let legacyCleaned = false;

/**
 * 1.3.0 之前进度存在 localStorage（每个视频一个 `sweet-player:progress:<id>`）。
 * 现已改为 sessionStorage 单键存储，这些残留只会白占配额，首次读取时一次性清掉。
 */
function cleanLegacyKeys(): void {
  if (legacyCleaned) return;
  legacyCleaned = true;

  const store = getStore('local');
  if (!store) return;
  const stale: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && key.startsWith(PROGRESS_KEY)) stale.push(key);
    }
    for (const key of stale) store.removeItem(key);
  } catch {
    /* ignore */
  }
}

function loadProgressMap(): ProgressMap {
  cleanLegacyKeys();
  const raw = safeGet('session', PROGRESS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

function saveProgressMap(map: ProgressMap): void {
  // 超出上限时按最后写入时间淘汰最旧的，避免单次会话里无限增长
  const ids = Object.keys(map);
  if (ids.length > PROGRESS_LIMIT) {
    // Date.now() 只精确到毫秒，同一毫秒内的多次写入时间戳相同；
    // 此时以插入顺序兜底（后写入的视为更新），保证淘汰顺序确定。
    const order = new Map(ids.map((id, i) => [id, i]));
    ids.sort((a, b) => {
      const byTime = (map[b]?.at ?? 0) - (map[a]?.at ?? 0);
      return byTime !== 0 ? byTime : (order.get(b) ?? 0) - (order.get(a) ?? 0);
    });
    for (const id of ids.slice(PROGRESS_LIMIT)) delete map[id];
  }
  safeSet('session', PROGRESS_KEY, JSON.stringify(map));
}

export function loadProgress(id: string): number | null {
  const entry = loadProgressMap()[id];
  return entry && Number.isFinite(entry.t) ? entry.t : null;
}

export function saveProgress(id: string, time: number): void {
  const map = loadProgressMap();
  map[id] = { t: Math.floor(time), at: Date.now() };
  saveProgressMap(map);
}

export function clearProgress(id: string): void {
  const map = loadProgressMap();
  if (!(id in map)) return;
  delete map[id];
  saveProgressMap(map);
}
