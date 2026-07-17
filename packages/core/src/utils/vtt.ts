export interface ThumbnailCue {
  start: number;
  end: number;
  url: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':').map(Number);
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) {
    [h, m, s] = parts;
  } else if (parts.length === 2) {
    [m, s] = parts;
  } else {
    return NaN;
  }
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return NaN;
  return h * 3600 + m * 60 + s;
}

/** 解析缩略图 WebVTT：cue payload 为 `image.jpg#xywh=x,y,w,h` 或整图 URL */
export async function parseThumbnailVtt(vttUrl: string, signal?: AbortSignal): Promise<ThumbnailCue[]> {
  const res = await fetch(vttUrl, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // vttUrl 本身可能是相对路径（如 "/thumbs.vtt"），需先解析成绝对地址才能作为 base
  const baseUrl = new URL(vttUrl, document.baseURI).href;

  const cues: ThumbnailCue[] = [];
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const timeLineIndex = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIndex === -1) continue;

    const [startRaw, endRaw] = lines[timeLineIndex].split('-->');
    const start = parseTimestamp(startRaw.trim().split(' ')[0]);
    const end = parseTimestamp(endRaw.trim().split(' ')[0]);
    // 异常时间戳跳过整条 cue，避免污染 findThumbnailCue 二分查找
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    const payload = lines.slice(timeLineIndex + 1).join(' ').trim();
    if (!payload) continue;

    // 用 lastIndexOf 而非 split('#')：URL 本身可能含 fragment，只有末尾的 xywh 段才是坐标
    const hashAt = payload.lastIndexOf('#');
    const urlPart = hashAt >= 0 ? payload.slice(0, hashAt) : payload;
    const hashPart = hashAt >= 0 ? payload.slice(hashAt + 1) : '';
    const cue: ThumbnailCue = { start, end, url: new URL(urlPart, baseUrl).href };
    if (hashPart) {
      const m = /xywh=([\d.]+),([\d.]+),([\d.]+),([\d.]+)/.exec(hashPart);
      if (m) {
        cue.x = Number(m[1]);
        cue.y = Number(m[2]);
        cue.w = Number(m[3]);
        cue.h = Number(m[4]);
      }
    }
    cues.push(cue);
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** 二分查找 time 落在的 cue；越界时夹到首尾 cue，避免视频末尾因浮点误差找不到 */
export function findThumbnailCue(cues: ThumbnailCue[], time: number): ThumbnailCue | null {
  if (cues.length === 0) return null;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid];
    if (time < c.start) hi = mid - 1;
    else if (time >= c.end) lo = mid + 1;
    else return c;
  }
  if (time < cues[0].start) return cues[0];
  if (time >= cues[cues.length - 1].end) return cues[cues.length - 1];
  return null;
}
